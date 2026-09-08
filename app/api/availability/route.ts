import { db, json } from '@/lib/server';
import { available, validDate } from '@/lib/schedule';
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams,
      date = q.get('date') || '',
      duration = Number(q.get('duration'));
    if (!validDate(date) || ![30, 60].includes(duration))
      return json({ error: 'Velg dato og type vask.' }, 400);
    const busy = await db()
      .prepare('SELECT start,duration FROM bookings WHERE date=?')
      .bind(date)
      .all<{ start: number; duration: number }>();
    return json({ slots: available(date, duration, busy.results) });
  } catch {
    return json({ error: 'Kunne ikke hente ledige tider. Prøv igjen.' }, 503);
  }
}
