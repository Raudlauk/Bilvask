import { db, json, sameOrigin, throttle } from '@/lib/server';
import { available, validDate } from '@/lib/schedule';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Ugyldig forespørsel.' }, 403);
  try {
    const b = (await req.json()) as Record<string, unknown>;
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
    const result = await db()
      .prepare(
        'INSERT INTO bookings (id,name,phone,date,start,duration,inside,outside,created) SELECT ?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE date=? AND start<? AND start+duration>?)',
      )
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
        date,
        start + duration,
        start,
      )
      .run();
    if (!result.meta.changes)
      return json(
        { error: 'Denne timen ble nettopp bestilt. Velg et annet tidspunkt.' },
        409,
      );
    return json({ id, name, date, start, duration, inside, outside }, 201);
  } catch {
    return json(
      { error: 'Kunne ikke bekrefte bestillingen. Prøv igjen.' },
      503,
    );
  }
}
