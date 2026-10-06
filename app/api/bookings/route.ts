import { readBody } from '@/lib/server';
import { db, json, sameOrigin, throttle } from '@/lib/server';
import { available, validDate, washDuration } from '@/lib/schedule';
import { INSERT_BOOKING } from '@/lib/booking-sql';
import { getBookingSettings } from '@/lib/booking-settings';
import {bookingTotal,emptyPrices,type Prices} from '@/lib/prices';
import { scheduleReminder, sendBookingConfirmation } from '@/lib/link-sms';
import { cleanupPersonalData } from '@/lib/retention';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Ugyldig forespørsel.' }, 403);
  try {
    const b = await readBody(req);
    const name = typeof b.name === 'string' ? b.name.trim() : '',
      phone = typeof b.phone === 'string' ? b.phone.trim() : '',
      date = typeof b.date === 'string' ? b.date : '',
      start = typeof b.start === 'number' ? b.start : -1;
    const settings = await getBookingSettings();
    const polish=b.polish===true;
    if(polish&&!settings.polishEnabled)return json({error:'Bilpolering er ikke tilgjengelig. Oppdater bestillingen.'},409);
    if(polish&&b.outside!==true)return json({error:'Bilpolering krever utvendig vask.'},400);
    const inside = b.inside === true,
      outside = b.outside === true,
      largeCar = b.largeCar === true,
      duration = washDuration(settings,inside,outside,largeCar,polish);
    if (!/^[0-9]{8}$/.test(phone))
      return json({ error: 'Oppgi 8 sifre uten +47.' }, 400);
    if (
      !name ||
      name.length > 100 ||
      !validDate(date) ||
      !Number.isInteger(start) ||
      !available(date, duration, [],settings.weekdays).includes(start)
    )
      return json(
        {
          error: 'Oppgi navn, et gyldig telefonnummer og et ledig tidspunkt.',
        },
        400,
      );
    if (date > settings.maxDate)
      return json({ error: 'Datoen er utenfor bestillingsperioden. Velg en tidligere dato.' }, 409);
    if ('expectedDuration' in b && b.expectedDuration!==duration) return json({error:'Vasketiden er endret. Velg tidspunkt og bekreft på nytt.'},409);
    if (await throttle(req, 'booking', 30))
      return json(
        { error: 'For mange bestillingsforsøk. Prøv igjen om 15 minutter.' },
        429,
      );
    const id = crypto.randomUUID();
    const prices=await db().prepare('SELECT inside,outside,fluid FROM prices WHERE id=1').first<Prices>()||emptyPrices;
    const fluid=b.fluid===true,price=bookingTotal(prices,inside,outside,fluid,polish,settings.polishPrice,largeCar,settings.largeCarPercent);
    if('expectedPrice' in b && b.expectedPrice!==price)return json({error:'Prisen er endret. Se den nye prisen og bekreft på nytt.'},409);
    const result = await db()
      .prepare(INSERT_BOOKING)
      .bind(
        id,
        name,
        phone,
        date,
        start,
        duration,
        Number(inside),
        Number(outside),
        Date.now(),
        Number(fluid),
        price,
        Number(largeCar),
        Number(polish),
        date,
        start + duration,
        start,
        date,
        date,
        start < 720 ? 0 : 720,
        start < 720 ? 720 : 1440,
        date,
      )
      .run();
    if (!result.meta.changes)
      return json(
        { error: 'Datoen er stengt eller tidspunktet er fullbooket. Velg en annen tid eller dato.' },
        409,
      );
    const smsBooking = { id, name, phone, date, start, duration };
    const smsResults = await Promise.allSettled([
      sendBookingConfirmation(smsBooking),
      scheduleReminder(smsBooking),
    ]);
    const smsWarning = smsResults.some((result) => result.status === 'rejected');
    for (const result of smsResults) if (result.status === 'rejected') console.error('Booking SMS failed', result.reason);
    await cleanupPersonalData();
    return json({ id, name, date, start, duration, inside, outside,fluid,price,largeCar,polish, ...(smsWarning ? { smsWarning: 'Bestillingen er lagret, men én eller flere SMS-meldinger kunne ikke sendes.' } : {}) }, 201,{'Set-Cookie':`steam_receipt=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${new URL(req.url).protocol==='https:'?'; Secure':''}`});
  } catch (error) {
    if(error instanceof SyntaxError)return json({error: 'Ugyldig forespørsel.'},400);
    return json(
      { error: 'Kunne ikke bekrefte bestillingen. Prøv igjen.' },
      503,
    );
  }
}
