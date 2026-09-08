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
    if (!(await authorized(req)))
      return json({ error: 'Please sign in.' }, 401);
    const date = new URL(req.url).searchParams.get('date');
    const admin = await getAdmin();
    if (date && !validDate(date)) return json({ error: 'Invalid date' }, 400);
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
    return json(
      { error: 'The schedule could not be loaded. Please try again.' },
      503,
    );
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Invalid request.' }, 403);
  try {
    const b = (await req.json()) as Record<string, unknown>;
    if (b.action === 'login') {
      if (await throttle(req, 'login', 10))
        return json(
          { error: 'Too many attempts. Please try again in 15 minutes.' },
          429,
        );
      const admin = await getAdmin();
      if (
        typeof b.password !== 'string' ||
        b.password.length > 200 ||
        b.username !== admin.username ||
        (await passwordHash(b.password, admin.salt)) !== admin.hash
      )
        return json({ error: 'Incorrect username or password.' }, 401);
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
      return json({ error: 'Please sign in again.' }, 401);
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
        return json({ error: 'Current password is incorrect.' }, 400);
      const username = typeof b.username === 'string' ? b.username.trim() : '';
      if (
        !username ||
        username.length > 50 ||
        typeof b.password !== 'string' ||
        b.password.length < 8 ||
        b.password.length > 200
      )
        return json(
          { error: 'Use a username and a new password of 8–200 characters.' },
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
    return json({ error: 'Unknown action.' }, 400);
  } catch {
    return json(
      { error: 'The request could not be completed. Please try again.' },
      503,
    );
  }
}
