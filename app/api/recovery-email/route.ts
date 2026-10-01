import {authorized,db,getAdmin,json,passwordMatches,readBody,sameOrigin,throttle} from '@/lib/server';
import {mailConfig} from '@/lib/reset-mail';

export async function GET(req:Request){
 try {
  if(!await authorized(req))return json({error:'Logg inn på nytt.'},401);
  if((await getAdmin()).version===1)return json({error:'Bytt standardpassordet først.'},403);
  const row=await db().prepare('SELECT recovery_email FROM admins WHERE id=1').first<{recovery_email:string}>();
  return json({email:row?.recovery_email||'',emailConfigured:!!mailConfig()});
 }catch{return json({error:'Kunne ikke hente gjenopprettingsadressen.'},503)}
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Ugyldig forespørsel.'},403);
 try{
  if(!await authorized(req))return json({error:'Logg inn på nytt.'},401);
  const admin=await getAdmin();
  if(admin.version===1)return json({error:'Bytt standardpassordet først.'},403);
  if(await throttle(req,'recovery-settings',10,true))return json({error:'For mange forsøk. Prøv igjen om 15 minutter.'},429);
  const body=await readBody(req);
  if(typeof body.password!=='string'||body.password.length>200||!await passwordMatches(body.password,admin))return json({error:'Nåværende passord er feil.'},400);
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))return json({error:'Oppgi en gyldig e-postadresse.'},400);
  // Compare credentials version to prevent a stale authenticated edit racing a reset.
  const result=await db().prepare('UPDATE admins SET recovery_email=? WHERE id=1 AND version=?').bind(email,admin.version).run();
  if(!result.meta.changes)return json({error:'Logg inn på nytt.'},401);
  return json({ok:true});
 }catch{return json({error:'Kunne ikke lagre gjenopprettingsadressen.'},503)}
}
