import {db,json,readBody,sameOrigin,throttle} from '@/lib/server';
import {getBookingSettings} from '@/lib/booking-settings';
import {available,blocked,today,validDate} from '@/lib/schedule';
import {CUSTOMER_CUTOFF_MINUTES,CUSTOMER_MAX_MOVES,cancelBooking,minutesUntil,moveBooking} from '@/lib/booking-changes';

// Customer self-service from Vaskestatus: move or cancel with phone number + booking code.
type Row={id:string;name:string;phone:string;date:string;start:number;duration:number;status:number;customer_moves:number};
const notFound='Fant ingen bestilling med dette telefonnummeret og bestillingskoden.';
const reasons={
 started:'Vasken er allerede påbegynt, så timen kan ikke endres her. Kontakt oss.',
 'too-late':'Timen kan ikke endres eller avbestilles mindre enn 2 timer før. Kontakt oss.',
 'max-moves':'Timen er flyttet for mange ganger. Kontakt oss for å endre den igjen.',
};
function blockedReason(row:Row,action:'move'|'cancel'):keyof typeof reasons|null{
 if(row.status!==0)return 'started';
 if(minutesUntil(row.date,row.start)<CUSTOMER_CUTOFF_MINUTES)return 'too-late';
 if(action==='move'&&row.customer_moves>=CUSTOMER_MAX_MOVES)return 'max-moves';
 return null;
}
async function contactPhone(){
 try{return (await db().prepare('SELECT phone FROM contact WHERE id=1').first<{phone:string}>())?.phone||''}catch{return ''}
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Ugyldig forespørsel.'},403);
 try{
  const settings=await getBookingSettings();
  if(!settings.customerChanges)return json({error:'Endring av bestillinger er ikke tilgjengelig. Kontakt oss for å endre timen.'},403);
  const b=await readBody(req);
  const mutating=b.action==='move'||b.action==='cancel';
  if(await throttle(req,mutating?'customer-booking-change':'customer-booking',mutating?10:30))return json({error:'For mange forsøk. Prøv igjen om 15 minutter.'},429);
  const phone=typeof b.phone==='string'?b.phone.replace(/\s/g,''):'';
  const code=typeof b.code==='string'?b.code.trim():'';
  if(!/^[0-9]{8}$/.test(phone)||!code||code.length>36)return json({error:notFound},404);
  const row=await db().prepare('SELECT id,name,phone,date,start,duration,status,customer_moves FROM bookings WHERE id=? OR status_code=?').bind(code.toLowerCase(),code.toUpperCase()).first<Row>();
  if(!row||row.phone!==phone)return json({error:notFound},404);

  if(b.action==='options'){
   const moveBlocked=blockedReason(row,'move'),cancelBlocked=blockedReason(row,'cancel');
   const dates:{date:string;slots:number[]}[]=[];
   if(!moveBlocked){
    const from=today();
    const closed=new Set((await db().prepare('SELECT date FROM closed_dates WHERE date>=?').bind(from).all<{date:string}>()).results.map(r=>r.date));
    // One query for the whole period; the booking being moved does not block itself.
    const busyByDate=new Map<string,{start:number;duration:number}[]>();
    for(const other of (await db().prepare('SELECT date,start,duration FROM bookings WHERE date>=? AND date<=? AND id<>?').bind(from,settings.maxDate,row.id).all<{date:string;start:number;duration:number}>()).results)
     busyByDate.set(other.date,[...(busyByDate.get(other.date)??[]),other]);
    for(const day=new Date(from+'T12:00:00Z');day.toISOString().slice(0,10)<=settings.maxDate;day.setUTCDate(day.getUTCDate()+1)){
     const date=day.toISOString().slice(0,10);
     if(blocked(date,settings.weekdays)||closed.has(date))continue;
     const slots=available(date,row.duration,busyByDate.get(date)??[],settings.weekdays).filter(start=>minutesUntil(date,start)>=CUSTOMER_CUTOFF_MINUTES&&!(date===row.date&&start===row.start));
     if(slots.length)dates.push({date,slots});
    }
   }
   return json({booking:{date:row.date,start:row.start,duration:row.duration},
    canMove:!moveBlocked,canCancel:!cancelBlocked,
    reason:moveBlocked&&cancelBlocked?reasons[cancelBlocked]:moveBlocked?reasons[moveBlocked]:null,
    contactPhone:await contactPhone(),dates});
  }
  if(b.action==='move'){
   if(typeof b.date!=='string'||!validDate(b.date)||typeof b.start!=='number'||!Number.isInteger(b.start))return json({error:'Velg en gyldig dato og starttid.'},400);
   const reason=blockedReason(row,'move');
   if(reason)return json({error:reasons[reason]},409);
   if(minutesUntil(b.date,b.start)<CUSTOMER_CUTOFF_MINUTES)return json({error:'Velg et tidspunkt minst 2 timer frem i tid.'},409);
   const moved=await moveBooking(row,b.date,b.start,'customer');
   if(!moved.ok)return json({error:'Tidspunktet er ikke lenger ledig. Velg et annet tidspunkt.'},409);
   return json({ok:true,date:b.date,start:b.start});
  }
  if(b.action==='cancel'){
   const reason=blockedReason(row,'cancel');
   if(reason)return json({error:reasons[reason]},409);
   const cancelled=await cancelBooking(row,'customer');
   if(!cancelled.ok)return json({error:reasons.started},409);
   return json({ok:true});
  }
  return json({error:'Ugyldig forespørsel.'},400);
 }catch(error){
  if(error instanceof SyntaxError)return json({error:'Ugyldig forespørsel.'},400);
  return json({error:'Kunne ikke fullføre forespørselen. Prøv igjen.'},503);
 }
}
