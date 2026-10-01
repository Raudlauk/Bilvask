import {db,json,readBody,sameOrigin,throttle} from '@/lib/server';
import {getBookingSettings} from '@/lib/booking-settings';
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Ugyldig forespørsel.'},403);
 try{
  if(!(await getBookingSettings()).statusEnabled)return json({error:'Statusvisning er deaktivert.'},403);
  if(await throttle(req,'wash-status',10))return json({error:'For mange forsøk. Prøv igjen om 15 minutter.'},429);
  const b=await readBody(req);
  if(typeof b.code!=='string'||typeof b.lookup!=='string'||b.lookup.length>100)return json({error:'Ingen bestilling funnet. Kontroller navn eller telefonnummer og bestillingskode.'},404);
  const row=await db().prepare('SELECT name,phone,date,start,status FROM bookings WHERE id=? OR status_code=?').bind(b.code.trim().toLowerCase(),b.code.trim().toUpperCase()).first<{name:string;phone:string;date:string;start:number;status:number}>();
  const lookup=b.lookup.trim();
  if(!row||(row.name.toLocaleLowerCase('nb-NO')!==lookup.toLocaleLowerCase('nb-NO')&&row.phone!==lookup.replace(/\s/g,'')))return json({error:'Ingen bestilling funnet. Kontroller navn eller telefonnummer og bestillingskode.'},404);
  return json({date:row.date,start:row.start,status:row.status});
 }catch{return json({error:'Kunne ikke hente status. Prøv igjen.'},503)}
}
