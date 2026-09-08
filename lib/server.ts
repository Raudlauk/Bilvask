import { env } from 'cloudflare:workers';
import { timingSafeEqual } from 'node:crypto';
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
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', ...extra },
  });
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (origin === new URL(req.url).origin) return true;
  // An explicit local tunnel origin preserves CSRF protection when a proxy
  // rewrites the request URL to localhost. Never trust arbitrary forwarded hosts.
  const configured = (env as unknown as { BOOKING_PUBLIC_ORIGIN?: string }).BOOKING_PUBLIC_ORIGIN;
  if (!configured || !origin) return false;
  try {
    const allowed = new URL(configured);
    return allowed.protocol === 'https:' && configured === allowed.origin && origin === allowed.origin;
  } catch { return false; }
}
export async function readBody(req:Request):Promise<Record<string,unknown>> {
  if(!req.headers.get('content-type')?.startsWith('application/json')) throw new SyntaxError('JSON required');
  const reader=req.body?.getReader();if(!reader)throw new SyntaxError('Body required');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new SyntaxError('Body too large')}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  const value=JSON.parse(new TextDecoder().decode(bytes));
  if(!value||typeof value!=='object'||Array.isArray(value))throw new SyntaxError('Object required');return value;
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
export async function passwordMatches(password: string, admin: {salt:string;hash:string}) {
  const candidate = new TextEncoder().encode(await passwordHash(password, admin.salt));
  const expected = new TextEncoder().encode(admin.hash);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
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
  if (!/^[a-f0-9-]{72}$/.test(token)) return false;
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
export async function throttle(req: Request, bucket: string, max: number, account = false) {
  const key = await digest(
      bucket + ':' + (account ? 'shared-admin' : (req.headers.get('cf-connecting-ip') || 'local')),
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
