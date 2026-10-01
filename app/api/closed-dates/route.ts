import {getBookingSettings} from '@/lib/booking-settings';
import { authorized, db, getAdmin, json, readBody, sameOrigin } from '@/lib/server';
import { blocked, today, validDate } from '@/lib/schedule';

export async function GET(req: Request) {
  try {
    if (!await authorized(req)) return json({ error: 'Logg inn på nytt.' }, 401);
    const rows = await db().prepare('SELECT date FROM closed_dates WHERE date>=? ORDER BY date').bind(today()).all<{date:string}>();
    return json({ dates: rows.results.map(row => row.date) });
  } catch { return json({ error: 'Kunne ikke hente stengte datoer.' }, 503); }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Ugyldig forespørsel.' }, 403);
  try {
    if (!await authorized(req)) return json({ error: 'Logg inn på nytt.' }, 401);
    if ((await getAdmin()).version === 1) return json({ error: 'Bytt standardpassordet først.' }, 403);
    const { date, closed } = await readBody(req);
    if (typeof date !== 'string' || !validDate(date) || date < today() || typeof closed !== 'boolean')
      return json({ error: 'Velg en gyldig dato fra i dag eller senere.' }, 400);
    if (closed && blocked(date,(await getBookingSettings()).weekdays)) return json({ error: 'Denne ukedagen er allerede stengt for bestilling.' }, 400);
    await db().prepare(closed ? 'INSERT INTO closed_dates (date) VALUES (?) ON CONFLICT(date) DO NOTHING' : 'DELETE FROM closed_dates WHERE date=?').bind(date).run();
    const row = await db().prepare('SELECT COUNT(*) AS count FROM bookings WHERE date=?').bind(date).first<{count:number}>();
    return json({ ok: true, existingBookings: row?.count ?? 0 });
  } catch (error) {
    return json({ error: error instanceof SyntaxError ? 'Ugyldig forespørsel.' : 'Kunne ikke endre datoen. Prøv igjen.' }, error instanceof SyntaxError ? 400 : 503);
  }
}
