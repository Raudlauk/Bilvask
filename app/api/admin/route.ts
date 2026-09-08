import {
  authorized,
  cookie,
  db,
  digest,
  getAdmin,
  json,
  passwordHash,
  sameOrigin,
  sessionToken,
  throttle,
} from '@/lib/server';
import { validDate } from '@/lib/schedule';
export async function GET(req: Request) {
  try {
    if (!(await authorized(req))) return json({ error: 'Logg inn.' }, 401);
    const date = new URL(req.url).searchParams.get('date');
    const admin = await getAdmin();
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
    const rows = await query.all();
    return json({ username: admin.username, bookings: rows.results });
  } catch {
    return json({ error: 'Kunne ikke laste arbeidslisten. Prøv igjen.' }, 503);
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Ugyldig forespørsel.' }, 403);
  try {
    const b = (await req.json()) as Record<string, unknown>;
    if (b.action === 'login') {
      if (await throttle(req, 'login', 10))
        return json(
          { error: 'For mange forsøk. Prøv igjen om 15 minutter.' },
          429,
        );
      const admin = await getAdmin();
      if (
        typeof b.password !== 'string' ||
        b.password.length > 200 ||
        b.username !== admin.username ||
        (await passwordHash(b.password, admin.salt)) !== admin.hash
      )
        return json({ error: 'Feil brukernavn eller passord.' }, 401);
      const token = crypto.randomUUID() + crypto.randomUUID();
      await db().batch([
        db().prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),
        db()
          .prepare(
            'INSERT INTO sessions (token,expires,version) VALUES (?,?,?)',
          )
          .bind(await digest(token), Date.now() + 28800000, admin.version),
      ]);
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(req, token) });
    }
    if (!(await authorized(req)))
      return json({ error: 'Logg inn på nytt.' }, 401);
    if (b.action === 'logout') {
      await db()
        .prepare('DELETE FROM sessions WHERE token=?')
        .bind(await digest(sessionToken(req)))
        .run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(req, '', 0) });
    }
    if (b.action === 'credentials') {
      const admin = await getAdmin();
      if (
        typeof b.currentPassword !== 'string' ||
        b.currentPassword.length > 200 ||
        (await passwordHash(b.currentPassword, admin.salt)) !== admin.hash
      )
        return json({ error: 'Nåværende passord er feil.' }, 400);
      const username = typeof b.username === 'string' ? b.username.trim() : '';
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
      await db()
        .prepare(
          'UPDATE admins SET username=?,hash=?,salt=?,version=version+1 WHERE id=1',
        )
        .bind(username, hash, salt)
        .run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(req, '', 0) });
    }
    return json({ error: 'Ukjent handling.' }, 400);
  } catch {
    return json(
      { error: 'Kunne ikke fullføre forespørselen. Prøv igjen.' },
      503,
    );
  }
}
