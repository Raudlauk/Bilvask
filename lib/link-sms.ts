import { env } from 'cloudflare:workers';
import { db } from '@/lib/server';
import { dateLabel, timeLabel, ZONE } from '@/lib/schedule';
import { getSiteName } from '@/lib/site-name';

type SmsEnv = {
  LINK_SMS_ENABLED?: string;
  LINK_SMS_BEARER_TOKEN?: string;
  LINK_SMS_CLIENT_ID?: string;
  LINK_SMS_CLIENT_SECRET?: string;
  LINK_SMS_TOKEN_URL?: string;
  LINK_SMS_SENDER?: string;
};

type LinkToken = { access_token?: string; expires_in?: number };
type LinkSendResponse = {
  requestId?: string;
  messages?: Array<{ messageId?: string; referenceId?: string; recipient?: string }>;
  message?: string;
};

type BookingSmsData = {
  id: string;
  name: string;
  phone: string;
  date: string;
  start: number;
  duration: number;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function config() {
  return env as unknown as SmsEnv;
}

export function smsEnabled() {
  const c = config();
  if (c.LINK_SMS_ENABLED === 'false' || c.LINK_SMS_ENABLED === '0') return false;
  return !!(c.LINK_SMS_BEARER_TOKEN || (c.LINK_SMS_CLIENT_ID && c.LINK_SMS_CLIENT_SECRET));
}

async function bearerToken() {
  const c = config();
  if (c.LINK_SMS_BEARER_TOKEN) return c.LINK_SMS_BEARER_TOKEN;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  if (!c.LINK_SMS_CLIENT_ID || !c.LINK_SMS_CLIENT_SECRET) throw new Error('LINK SMS credentials are not configured');

  const tokenUrl = c.LINK_SMS_TOKEN_URL || 'https://sso.linkmobility.com/auth/realms/CPaaS/protocol/openid-connect/token';
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: c.LINK_SMS_CLIENT_ID,
    client_secret: c.LINK_SMS_CLIENT_SECRET,
  });
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`LINK token request failed (${response.status})`);
  const data = (await response.json()) as LinkToken;
  if (!data.access_token) throw new Error('LINK token response did not contain an access token');
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(60, data.expires_in || 300) * 1000,
  };
  return data.access_token;
}

function recipient(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (/^\d{8}$/.test(digits)) return `+47${digits}`;
  if (/^47\d{8}$/.test(digits)) return `+${digits}`;
  if (phone.startsWith('+') && /^\+\d{8,15}$/.test(phone)) return phone;
  throw new Error('Invalid SMS recipient');
}

function reminderTag(id: string) {
  return `steam-booking-reminder-${id}`;
}

function osloOffsetMs(at: Date) {
  const tz = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    timeZoneName: 'longOffset',
    hour: '2-digit',
  }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value || 'GMT+00:00';
  const match = tz.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === '-' ? -minutes : minutes) * 60_000;
}

function appointmentUtc(date: string, start: number) {
  const [year, month, day] = date.split('-').map(Number);
  const hour = Math.floor(start / 60);
  const minute = start % 60;
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidate = new Date(localAsUtc - osloOffsetMs(new Date(localAsUtc)));
  const corrected = new Date(localAsUtc - osloOffsetMs(candidate));
  if (corrected.getTime() !== candidate.getTime()) candidate = corrected;
  return candidate;
}

async function addressLine() {
  try {
    const row = await db().prepare('SELECT address FROM contact WHERE id=1').first<{ address: string }>();
    return row?.address?.trim() || '';
  } catch {
    return '';
  }
}

async function send(text: string, phone: string, referenceId: string, schedule?: { absolute: string; tag: string }) {
  if (!smsEnabled()) return { skipped: true } as const;
  const token = await bearerToken();
  const sender = config().LINK_SMS_SENDER?.trim() || 'Steam';
  const payload = [{
    recipient: recipient(phone),
    content: {
      text,
      options: {
        'sms.encoding': 'AutoDetect',
        'sms.sender': sender,
      },
    },
    ...(schedule ? { schedule } : {}),
    referenceId,
    priority: 'Normal',
  }];
  const response = await fetch('https://api.linkmobility.com/sms/v1/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as LinkSendResponse;
  if (!response.ok) throw new Error(`LINK SMS send failed (${response.status}${data.message ? `: ${data.message}` : ''})`);
  return { skipped: false, requestId: data.requestId, messageId: data.messages?.[0]?.messageId } as const;
}

export async function cancelReminder(id: string) {
  if (!smsEnabled()) return { skipped: true } as const;
  const token = await bearerToken();
  const url = new URL('https://api.linkmobility.com/sms/v1/schedules');
  url.searchParams.set('tag', reminderTag(id));
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  // LINK may return 400/404-like responses when no matching schedule exists. That is harmless here.
  if (response.ok || response.status === 400 || response.status === 404) return { skipped: false } as const;
  throw new Error(`LINK reminder cancellation failed (${response.status})`);
}

export async function scheduleReminder(booking: BookingSmsData) {
  if (!smsEnabled()) return { skipped: true } as const;
  const sendAt = new Date(appointmentUtc(booking.date, booking.start).getTime() - 24 * 60 * 60 * 1000);
  // Do not schedule a "24 hour" reminder if that point has already passed.
  if (sendAt.getTime() <= Date.now() + 60_000) return { skipped: true } as const;
  const [address, site] = await Promise.all([addressLine(), getSiteName()]);
  const text = [
    `Påminnelse fra ${site}: Du har bilvask i morgen ${dateLabel(booking.date)} kl. ${timeLabel(booking.start)}.`,
    address ? `Sted: ${address}.` : '',
    'Velkommen!',
  ].filter(Boolean).join(' ');
  return send(text, booking.phone, `${booking.id}:reminder`, {
    absolute: sendAt.toISOString(),
    tag: reminderTag(booking.id),
  });
}

export async function sendBookingConfirmation(booking: BookingSmsData) {
  const [address, site] = await Promise.all([addressLine(), getSiteName()]);
  const text = [
    `Hei ${booking.name}! Bestillingen din hos ${site} er bekreftet ${dateLabel(booking.date)} kl. ${timeLabel(booking.start)}.`,
    address ? `Sted: ${address}.` : '',
    'Velkommen!',
  ].filter(Boolean).join(' ');
  return send(text, booking.phone, `${booking.id}:confirmation`);
}

export async function sendBookingChanged(booking: BookingSmsData, previous: { date: string; start: number }) {
  const [address, site] = await Promise.all([addressLine(), getSiteName()]);
  const text = [
    `Hei ${booking.name}! Timen din hos ${site} er endret fra ${dateLabel(previous.date)} kl. ${timeLabel(previous.start)} til ${dateLabel(booking.date)} kl. ${timeLabel(booking.start)}.`,
    address ? `Sted: ${address}.` : '',
    'Velkommen!',
  ].filter(Boolean).join(' ');
  return send(text, booking.phone, `${booking.id}:changed:${Date.now()}`);
}

export async function sendBookingCancelled(booking: BookingSmsData) {
  const site = await getSiteName();
  const text = `Hei ${booking.name}! Timen din hos ${site} ${dateLabel(booking.date)} kl. ${timeLabel(booking.start)} er avbestilt. Kontakt oss dersom dette ikke stemmer.`;
  return send(text, booking.phone, `${booking.id}:cancelled:${Date.now()}`);
}
