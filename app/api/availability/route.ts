import { db, json } from '@/lib/server';
import { available, validDate } from '@/lib/schedule';
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams,
      date = q.get('date') || '',
      duration = Number(q.get('duration'));
    const month=q.get('month');
    if(month!==null){
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return json({error:'Ugyldig dato'},400);
      const rows=await db().prepare('SELECT date FROM bookings WHERE date>=? AND date<=? GROUP BY date HAVING COUNT(*)>=4').bind(month+'-01',month+'-31').all<{date:string}>();
      return json({fullDates:rows.results.map(row=>row.date)});
    }
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
