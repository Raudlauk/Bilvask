import {cookie,db,digest,json,passwordHash,readBody,sameOrigin,throttle} from '@/lib/server';
import {mailConfig,sendResetEmail} from '@/lib/reset-mail';
const generic={message:'Hvis adressen er registrert, får du en lenke på e-post. Sjekk også søppelpost.'};
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Ugyldig forespørsel.'},403);
 try{
  const body=await readBody(req);
  if(body.action==='request'){
   if(await throttle(req,'reset-request',5)||await throttle(req,'reset-request-global',10,true))return json({error:'For mange forsøk. Prøv igjen om 15 minutter.'},429);
   const config=mailConfig();
   if(!config)return json({error:'E-post for passordgjenoppretting er ikke konfigurert ennå.'},503);
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   if(email.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))return json({error:'Oppgi en gyldig e-postadresse.'},400);
   const admin=await db().prepare('SELECT recovery_email,version FROM admins WHERE id=1').first<{recovery_email:string;version:number}>();
   if(!admin||admin.recovery_email!==email||admin.version===1)return json(generic);
   const token=crypto.randomUUID()+crypto.randomUUID(),hash=await digest(token);
   await db().batch([db().prepare('DELETE FROM password_resets WHERE expires<?').bind(Date.now()),db().prepare('INSERT INTO password_resets (token,email,version,expires) VALUES (?,?,?,?)').bind(hash,email,admin.version,Date.now()+900000)]);
   try{await sendResetEmail(config,email,token,body.language==='en',hash)}catch{
    await db().prepare('DELETE FROM password_resets WHERE token=?').bind(hash).run();
    // Keep the response identical for registered and unknown addresses.
    return json(generic);
   }
   return json(generic);
  }
  if(body.action==='reset'){
   if(await throttle(req,'reset-submit',10)||await throttle(req,'reset-submit-global',30,true))return json({error:'For mange forsøk. Prøv igjen om 15 minutter.'},429);
   if(typeof body.token!=='string'||!/^[a-f0-9-]{72}$/.test(body.token))return json({error:'Lenken er ugyldig eller utløpt. Be om en ny lenke.'},400);
   if(typeof body.password!=='string'||body.password.length<8||body.password.length>200)return json({error:'Bruk et passord på 8–200 tegn.'},400);
   const salt=crypto.randomUUID(),hash=await passwordHash(body.password,salt),token=await digest(body.token);
   // One atomic compare-and-update: changing version consumes every outstanding
   // reset link and revokes every existing session, including concurrent resets.
   const result=await db().prepare('UPDATE admins SET hash=?,salt=?,version=version+1 WHERE id=1 AND EXISTS (SELECT 1 FROM password_resets r WHERE r.token=? AND r.expires>? AND r.version=admins.version AND r.email=admins.recovery_email)').bind(hash,salt,token,Date.now()).run();
   if(!result.meta.changes)return json({error:'Lenken er ugyldig eller utløpt. Be om en ny lenke.'},400);
   return json({ok:true},200,{'Set-Cookie':cookie(req,'',0)});
  }
  return json({error:'Ugyldig forespørsel.'},400);
 }catch{return json({error:'Kunne ikke fullføre forespørselen. Prøv igjen.'},503)}
}
