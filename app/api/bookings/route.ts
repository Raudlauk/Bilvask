import { readBody } from '@/lib/server';
import { db, json, sameOrigin, throttle } from '@/lib/server';
import { available, validDate } from '@/lib/schedule';
import { INSERT_BOOKING } from '@/lib/booking-sql';
import {washTotal,emptyPrices,type Prices} from '@/lib/prices';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Ugyldig forespørsel.' }, 403);
  try {
    const b = await readBody(req);
    const name = typeof b.name === 'string' ? b.name.trim() : '',
      phone = typeof b.phone === 'string' ? b.phone.trim() : '',
      date = typeof b.date === 'string' ? b.date : '',
      start = typeof b.start === 'number' ? b.start : -1;
    const inside = b.inside === true,
      outside = b.outside === true,
      duration = (Number(inside) + Number(outside)) * 30;
    if (
      !name ||
      name.length > 100 ||
      phone.length > 30 ||
      !/^[+\d\s().-]+$/.test(phone) ||
      phone.replace(/\D/g, '').length < 7 ||
      !validDate(date) ||
      !Number.isInteger(start) ||
      !available(date, duration, []).includes(start)
    )
      return json(
        {
          error: 'Oppgi navn, et gyldig telefonnummer og et ledig tidspunkt.',
        },
        400,
      );
    if (await throttle(req, 'booking', 30))
      return json(
        { error: 'For mange bestillingsforsøk. Prøv igjen om 15 minutter.' },
        429,
      );
    const id = crypto.randomUUID();
    const prices=await db().prepare('SELECT inside,outside FROM prices WHERE id=1').first<Prices>()||emptyPrices;
    const price=washTotal(prices,inside,outside),fluid=b.fluid===true;
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
        date,
        start + duration,
        start,
        date,
        date,
        start < 720 ? 0 : 720,
        start < 720 ? 720 : 1440,
      )
      .run();
    if (!result.meta.changes)
      return json(
        { error: 'Tiden eller denne delen av dagen er fullbooket. Velg en annen tid eller dato.' },
        409,
      );
    return json({ id, name, date, start, duration, inside, outside,fluid,price }, 201,{'Set-Cookie':`steam_receipt=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${new URL(req.url).protocol==='https:'?'; Secure':''}`});
  } catch (error) {
    if(error instanceof SyntaxError)return json({error: 'Ugyldig forespørsel.'},400);
    return json(
      { error: 'Kunne ikke bekrefte bestillingen. Prøv igjen.' },
      503,
    );
  }
}
