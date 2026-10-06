import {getBookingSettings} from '@/lib/booking-settings';
import {bookingCode} from '@/lib/booking-code';
import { readBody } from '@/lib/server';
import {
  currentUser,
  cookie,
  db,
  digest,
  getAdmin,
  json,
  passwordHash,
  passwordMatches,
  sameOrigin,
  sessionToken,
  throttle,
} from '@/lib/server';
import { available, validDate } from '@/lib/schedule';
import { cancelReminder, scheduleReminder, sendBookingCancelled, sendBookingChanged } from '@/lib/link-sms';
export async function GET(req: Request) {
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Logg inn.' }, 401);
    const date = new URL(req.url).searchParams.get('date');
    if (user.role==='admin' && user.version === 1) return json({username:user.username,role:user.role,bookings:[],requiresPasswordChange:true});
    if (date && !validDate(date)) return json({ error: 'Ugyldig dato' }, 400);
    const query = date
      ? db()
          .prepare('SELECT * FROM bookings WHERE date=? ORDER BY start')
          .bind(date)
      : db()
          .prepare(
            'SELECT * FROM bookings WHERE date>=? ORDER BY date,start LIMIT 500',
          )
          .bind(
            new Intl.DateTimeFormat('sv-SE', {
              timeZone: 'Europe/Oslo',
            }).format(new Date()),
          );
    const rows = await query.all<{id:string;status_code:string|null}>();
    for(const row of rows.results){
      if(!row.status_code)row.status_code=await bookingCode(row.id);
    }
    return json({ statusEnabled:(await getBookingSettings()).statusEnabled,username: user.username, role:user.role, bookings: rows.results });
  } catch (error) {
    if(error instanceof SyntaxError)return json({error: 'Ugyldig forespørsel.'},400);
    return json({ error: 'Kunne ikke laste arbeidslisten. Prøv igjen.' }, 503);
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Ugyldig forespørsel.' }, 403);
  try {
    const b = await readBody(req);
    if (b.action === 'login') {
      if (await throttle(req, 'login', 10) || await throttle(req, 'login-account', 30, true))
        return json(
          { error: 'For mange forsøk. Prøv igjen om 15 minutter.' },
          429,
        );
      const admin = await getAdmin();
      const viewer = typeof b.username==='string' && b.username.trim().toLowerCase()!==admin.username.toLowerCase()
        ? await db().prepare('SELECT id,username,hash,salt,version,active FROM viewers WHERE username=?').bind(b.username.trim().toLowerCase()).first<{id:string;username:string;hash:string;salt:string;version:number;active:number}>() : null;
      const account = viewer || admin;
      const validPassword = typeof b.password === 'string' && b.password.length <= 200
        ? await passwordMatches(b.password, account) : false;
      if (
        typeof b.password !== 'string' ||
        b.password.length > 200 ||
        typeof b.username!=='string' || b.username.trim().toLowerCase() !== account.username.toLowerCase() || (viewer && !viewer.active) ||
        !validPassword
      )
        return json({ error: 'Feil brukernavn eller passord.' }, 401);
      const token = crypto.randomUUID() + crypto.randomUUID();
      await db().batch([
        db().prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),
        db()
          .prepare(
            'INSERT INTO sessions (token,expires,version,viewer_id) VALUES (?,?,?,?)',
          )
          .bind(await digest(token), Date.now() + 28800000, account.version,viewer?.id??null),
      ]);
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(req, token) });
    }
    const user=await currentUser(req);
    if (!user)
      return json({ error: 'Logg inn på nytt.' }, 401);
    if (b.action === 'logout') {
      await db()
        .prepare('DELETE FROM sessions WHERE token=?')
        .bind(await digest(sessionToken(req)))
        .run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(req, '', 0) });
    }
    const orderAction=['progress','reschedule','duration','cancel-booking'].includes(String(b.action));
    if(user.role==='viewer'||(user.role!=='admin'&&!orderAction))return json({error:'Du har ikke tilgang til denne handlingen.'},403);
    if(orderAction&&user.role==='admin'&&user.version===1)return json({error:'Bytt standardpassordet først.'},403);
    if(b.action==='progress'){
      if(!(await getBookingSettings()).statusEnabled)return json({error:'Statusvisning er deaktivert.'},403);
      if(user.role==='admin'&&user.version===1)return json({error:'Bytt standardpassordet først.'},403);
      if(typeof b.id!=='string'||!Number.isInteger(b.status)||Number(b.status)<0||Number(b.status)>2||!Number.isInteger(b.expectedStatus))return json({error:'Ugyldig forespørsel.'},400);
      const result=await db().prepare('UPDATE bookings SET status=? WHERE id=? AND status=?').bind(b.status,b.id,b.expectedStatus).run();
      return result.meta.changes?json({ok:true}):json({error:'Status er endret. Oppdater arbeidslisten.'},409);
    }
    if (b.action === 'reschedule') {
      if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/.test(b.id)||typeof b.date!=='string'||!validDate(b.date)||typeof b.start!=='number'||!Number.isInteger(b.start)||typeof b.expectedDate!=='string'||typeof b.expectedStart!=='number'||!Number.isInteger(b.expectedStart))
        return json({error:'Velg en gyldig dato og starttid.'},400);
      const booking=await db().prepare('SELECT id,name,phone,date,start,duration FROM bookings WHERE id=?').bind(b.id).first<{id:string;name:string;phone:string;date:string;start:number;duration:number}>();
      if(!booking)return json({error:'Bestillingen finnes ikke lenger. Oppdater arbeidslisten.'},404);
      if(booking.date!==b.expectedDate||booking.start!==b.expectedStart)return json({error:'Bestillingen er endret. Oppdater arbeidslisten og prøv igjen.'},409);
      const settings=await getBookingSettings();
      if(b.date>settings.maxDate)return json({error:'Datoen er utenfor bestillingsperioden. Velg en tidligere dato.'},409);
      const busy=(await db().prepare('SELECT start,duration FROM bookings WHERE date=? AND id<>? ORDER BY start').bind(b.date,b.id).all<{start:number;duration:number}>()).results;
      if(!available(b.date,booking.duration,busy,settings.weekdays).includes(b.start))return json({error:'Tidspunktet er ikke ledig, er utenfor åpningstid eller overlapper pausen.'},409);
      const result=await db().prepare(`UPDATE bookings SET date=?1,start=?2 WHERE id=?3 AND date=?4 AND start=?5
        AND NOT EXISTS (SELECT 1 FROM bookings other WHERE other.id<>?3 AND other.date=?1 AND other.start<?2+bookings.duration AND other.start+other.duration>?2)
        AND (SELECT COUNT(*) FROM bookings other WHERE other.id<>?3 AND other.date=?1)<4
        AND (SELECT COUNT(*) FROM bookings other WHERE other.id<>?3 AND other.date=?1 AND other.start>=?6 AND other.start<?7)<2
        AND NOT EXISTS (SELECT 1 FROM closed_dates WHERE date=?1)`)
        .bind(b.date,b.start,b.id,b.expectedDate,b.expectedStart,b.start<720?0:720,b.start<720?720:1440).run();
      if(!result.meta.changes)return json({error:'Tidspunktet ble opptatt eller bestillingen ble endret. Oppdater arbeidslisten og prøv igjen.'},409);
      const moved={...booking,date:b.date,start:b.start};
      const smsResults=await Promise.allSettled([
        (async()=>{await cancelReminder(booking.id);return scheduleReminder(moved)})(),
        sendBookingChanged(moved,{date:booking.date,start:booking.start}),
      ]);
      const smsWarning=smsResults.some(result=>result.status==='rejected');
      for(const result of smsResults)if(result.status==='rejected')console.error('Reschedule SMS failed',result.reason);
      return json({ok:true,...(smsWarning?{smsWarning:'Timen er flyttet, men én eller flere SMS-meldinger kunne ikke oppdateres/sendes.'}:{})});
    }
    if (b.action === 'duration') {
      if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/.test(b.id)||typeof b.duration!=='number'||!Number.isInteger(b.duration)||b.duration<15||b.duration>240||b.duration%15!==0||typeof b.expectedDuration!=='number')
        return json({error:'Velg 15–240 minutter i trinn på 15.'},400);
      // Check the saved duration and conflicts in the same atomic update.
      const result=await db().prepare(`UPDATE bookings SET duration=?1 WHERE id=?2 AND duration=?3
        AND start+?1<=900 AND (start+?1<=690 OR start>=720)
        AND NOT EXISTS (SELECT 1 FROM bookings other WHERE other.id<>bookings.id AND other.date=bookings.date AND other.start<bookings.start+?1 AND other.start+other.duration>bookings.start)`)
        .bind(b.duration,b.id,b.expectedDuration).run();
      if(!result.meta.changes)return json({error:'Tiden overlapper en annen vask, pausen eller stengetid, eller bestillingen er endret. Oppdater arbeidslisten og prøv igjen.'},409);
      return json({ok:true});
    }
    if (b.action === 'cancel-booking') {
      if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/.test(b.id))return json({error:'Ugyldig bestilling.'},400);
      const booking=await db().prepare('SELECT id,name,phone,date,start,duration FROM bookings WHERE id=?').bind(b.id).first<{id:string;name:string;phone:string;date:string;start:number;duration:number}>();
      if(!booking)return json({error:'Bestillingen er allerede fjernet. Oppdater arbeidslisten.'},404);
      let reminderWarning=false;
      try{await cancelReminder(booking.id)}catch(error){reminderWarning=true;console.error('Reminder cancellation failed',error)}
      const result=await db().prepare('DELETE FROM bookings WHERE id=?').bind(b.id).run();
      if(!result.meta.changes)return json({error:'Bestillingen er allerede fjernet. Oppdater arbeidslisten.'},404);
      let cancelSmsWarning=false;
      try{await sendBookingCancelled(booking)}catch(error){cancelSmsWarning=true;console.error('Cancellation SMS failed',error)}
      const smsWarning=reminderWarning||cancelSmsWarning;
      return json({ok:true,...(smsWarning?{smsWarning:'Bestillingen er avbestilt, men én eller flere SMS-meldinger kunne ikke oppdateres/sendes.'}:{})});
    }
    if(user.role!=='admin')return json({error:'Kun administrator har tilgang.'},403);
    if (b.action === 'credentials') {
      if (await throttle(req,'credentials',10) || await throttle(req,'credentials-account',20,true)) return json({error:'For mange forsøk. Prøv igjen om 15 minutter.'},429);
      const admin = await getAdmin();
      if (
        typeof b.currentPassword !== 'string' ||
        b.currentPassword.length > 200 ||
        !(await passwordMatches(b.currentPassword, admin))
      )
        return json({ error: 'Nåværende passord er feil.' }, 400);
      const username = typeof b.username === 'string' ? b.username.trim().toLowerCase() : '';
      if (
        !username ||
        username.length > 50 ||
        typeof b.password !== 'string' ||
        b.password.length < 8 ||
        b.password.length > 200
      )
        return json(
          { error: 'Oppgi et brukernavn og et nytt passord på 8–200 tegn.' },
          400,
        );
      const salt = crypto.randomUUID(),
        hash = await passwordHash(b.password, salt);
      const result = await db()
        .prepare(
          'UPDATE admins SET username=?,hash=?,salt=?,version=version+1 WHERE id=1 AND NOT EXISTS (SELECT 1 FROM viewers WHERE username=lower(?))',
        )
        .bind(username, hash, salt,username)
        .run();
      if(!result.meta.changes)return json({error:'Brukernavnet er allerede i bruk.'},409);
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(req, '', 0) });
    }
    return json({ error: 'Ukjent handling.' }, 400);
  } catch (error) {
    if(error instanceof SyntaxError)return json({error: 'Ugyldig forespørsel.'},400);
    return json(
      { error: 'Kunne ikke fullføre forespørselen. Prøv igjen.' },
      503,
    );
  }
}
