import { authorized, db, getAdmin, json, passwordHash, readBody, sameOrigin, throttle } from '@/lib/server';

export async function GET(req:Request) {
  try {
    if(!await authorized(req)) return json({error:'Kun administrator har tilgang.'},403);
    if((await getAdmin()).version===1)return json({error:'Bytt standardpassordet først.'},403);
    const rows=await db().prepare('SELECT id,username,active,role FROM viewers ORDER BY username').all();
    return json({users:rows.results});
  } catch { return json({error:'Kunne ikke hente brukerne.'},503); }
}
export async function POST(req:Request) {
  if(!sameOrigin(req))return json({error:'Ugyldig forespørsel.'},403);
  try {
    if(!await authorized(req))return json({error:'Kun administrator har tilgang.'},403);
    if((await getAdmin()).version===1)return json({error:'Bytt standardpassordet først.'},403);
    if(await throttle(req,'manage-users',30,true))return json({error:'For mange forsøk. Prøv igjen om 15 minutter.'},429);
    const b=await readBody(req);
    if(b.action==='delete'){
      if(typeof b.id!=='string'||!b.id||b.id.length>100)return json({error:'Ugyldig forespørsel.'},400);
      const results=await db().batch([
        db().prepare('DELETE FROM sessions WHERE viewer_id=?').bind(b.id),
        db().prepare('DELETE FROM viewers WHERE id=?').bind(b.id),
      ]);
      return results[1].meta.changes?json({ok:true}):json({error:'Brukeren finnes ikke.'},404);
    }
    if(b.action==='role'){
      if(typeof b.id!=='string'||!['viewer','manager'].includes(String(b.role)))return json({error:'Ugyldig tilgangsnivå.'},400);
      const result=await db().prepare('UPDATE viewers SET role=?,version=version+1 WHERE id=?').bind(b.role,b.id).run();
      return result.meta.changes?json({ok:true}):json({error:'Brukeren finnes ikke.'},404);
    }
    if(b.action==='access'){
      if(typeof b.id!=='string'||typeof b.active!=='boolean')return json({error:'Ugyldig forespørsel.'},400);
      const result=await db().prepare('UPDATE viewers SET active=?,version=version+1 WHERE id=?').bind(Number(b.active),b.id).run();
      return result.meta.changes?json({ok:true}):json({error:'Brukeren finnes ikke.'},404);
    }
    if(b.action!=='create')return json({error:'Ugyldig forespørsel.'},400);
    const role=b.role===undefined?'viewer':b.role;
    if(role!=='viewer'&&role!=='manager')return json({error:'Ugyldig tilgangsnivå.'},400);
    const username=typeof b.username==='string'?b.username.trim().toLowerCase():'';
    if(!/^[a-z0-9æøå._@-]{2,50}$/.test(username)||typeof b.password!=='string'||b.password.length<8||b.password.length>200)
      return json({error:'Bruk 2-50 tegn i brukernavnet og 8-200 tegn i passordet.'},400);
    if(username===(await getAdmin()).username.toLowerCase())return json({error:'Brukernavnet er allerede i bruk.'},409);
    const salt=crypto.randomUUID(),hash=await passwordHash(b.password,salt);
    const result=await db().prepare('INSERT INTO viewers (id,username,hash,salt,role) SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM admins WHERE lower(username)=?) ON CONFLICT(username) DO NOTHING').bind(crypto.randomUUID(),username,hash,salt,role,username).run();
    return result.meta.changes?json({ok:true},201):json({error:'Brukernavnet er allerede i bruk.'},409);
  } catch(error) { return json({error:error instanceof SyntaxError?'Ugyldig forespørsel.':'Kunne ikke lagre brukeren.'},error instanceof SyntaxError?400:503); }
}
