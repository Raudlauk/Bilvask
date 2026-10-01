import { db, json } from '@/lib/server';
import { available, blocked, today, validDate } from '@/lib/schedule';
import { getBookingSettings } from '@/lib/booking-settings';
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams,
      date = q.get('date') || '',
      duration = Number(q.get('duration'));
    const month=q.get('month');
    if(month!==null){
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return json({error:'Ugyldig dato'},400);
      const requestedDuration=q.has('duration')?duration:15;
      if(!Number.isInteger(requestedDuration)||requestedDuration<15||requestedDuration>480||requestedDuration%15!==0)return json({error:'Velg dato og type vask.'},400);
      const rows=await db().prepare('SELECT date,start,duration FROM bookings WHERE date>=? AND date<=?').bind(month+'-01',month+'-31').all<{date:string;start:number;duration:number}>();
      const closed=await db().prepare('SELECT date FROM closed_dates WHERE date>=? AND date<=?').bind(month+'-01',month+'-31').all<{date:string}>();
      const settings=await getBookingSettings();
      const closedDates=closed.results.map(row=>row.date);
      const currentDate=today();
      const fullDates=Array.from({length:31},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`).filter(day=>validDate(day)&&day>=currentDate&&!blocked(day,settings.weekdays)&&!closedDates.includes(day)&&!available(day,requestedDuration,rows.results.filter(row=>row.date===day),settings.weekdays).length);
      return json({fullDates,closedDates,...settings});
    }
    if (!validDate(date) || (!Number.isInteger(duration)||duration<15||duration>480||duration%15!==0))
      return json({ error: 'Velg dato og type vask.' }, 400);
    const { maxDate, weekdays } = await getBookingSettings();
    if (date > maxDate) return json({ slots: [] });
    if (await db().prepare('SELECT date FROM closed_dates WHERE date=?').bind(date).first()) return json({ slots: [] });
    const busy = await db()
      .prepare('SELECT start,duration FROM bookings WHERE date=?')
      .bind(date)
      .all<{ start: number; duration: number }>();
    return json({ slots: available(date, duration, busy.results,weekdays) });
  } catch {
    return json({ error: 'Kunne ikke hente ledige tider. Prøv igjen.' }, 503);
  }
}
