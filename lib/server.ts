import { env } from 'cloudflare:workers';
export function db() {
  if (!env.DB) throw new Error('Database unavailable');
  return env.DB;
}
export function json(
  value: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', ...extra },
  });
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return origin === new URL(req.url).origin;
}
function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function digest(value: string) {
  return hex(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  );
}
export async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      256,
    ),
  );
}
export async function getAdmin() {
  let row = await db()
    .prepare('SELECT * FROM admins WHERE id=1')
    .first<{ username: string; hash: string; salt: string; version: number }>();
  if (!row) {
    const salt = crypto.randomUUID(),
      hash = await passwordHash('admin', salt);
    await db()
      .prepare(
        'INSERT OR IGNORE INTO admins (id,username,hash,salt,version) VALUES (1,?,?,?,1)',
      )
      .bind('admin', hash, salt)
      .run();
    row = await db()
      .prepare('SELECT * FROM admins WHERE id=1')
      .first<{
        username: string;
        hash: string;
        salt: string;
        version: number;
      }>();
  }
  return row!;
}
export function sessionToken(req: Request) {
  return (
    req.headers.get('cookie')?.match(/(?:^|;\s*)gleam_session=([^;]+)/)?.[1] ||
    ''
  );
}
export async function authorized(req: Request) {
  const token = sessionToken(req);
  if (!token) return false;
  return !!(await db()
    .prepare(
      'SELECT s.token FROM sessions s JOIN admins a ON a.id=1 AND a.version=s.version WHERE s.token=? AND s.expires>?',
    )
    .bind(await digest(token), Date.now())
    .first());
}
export function cookie(req: Request, token: string, age = 28800) {
  return `gleam_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function throttle(req: Request, bucket: string, max: number) {
  const key = await digest(
      bucket + ':' + (req.headers.get('cf-connecting-ip') || 'local'),
    ),
    now = Date.now();
  const row = await db()
    .prepare(
      'INSERT INTO attempts (key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END, until=CASE WHEN until<? THEN excluded.until ELSE until END RETURNING count',
    )
    .bind(key, now + 900000, now, now)
    .first<{ count: number }>();
  return (row?.count || 0) > max;
}
