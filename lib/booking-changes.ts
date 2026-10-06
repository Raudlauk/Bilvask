import {db} from './server';
import {getBookingSettings} from './booking-settings';
import {available,currentMinutes,today} from './schedule';
import {cancelReminder,scheduleReminder,sendBookingCancelled,sendBookingChanged} from './link-sms';
import {CUSTOMER_CHANGE_LOG_DAYS} from './retention-policy';

// Shared by staff (/api/admin) and customers (/api/customer-booking) so both
// paths keep the same atomic conflict checks and SMS reminder handling.
export type ChangeableBooking={id:string;name:string;phone:string;date:string;start:number;duration:number};
export type ChangedBy='staff'|'customer';
export const CUSTOMER_CUTOFF_MINUTES=120;
export const CUSTOMER_MAX_MOVES=3;

/** Minutes from now (Oslo time) until the given appointment; negative once it has passed. */
export function minutesUntil(date:string,start:number){
 const days=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today()+'T12:00:00Z'))/86400000);
 return days*1440+start-currentMinutes();
}

export async function freeSlots(date:string,duration:number,excludeId:string,weekdays:number){
 const busy=(await db().prepare('SELECT start,duration FROM bookings WHERE date=? AND id<>? ORDER BY start').bind(date,excludeId).all<{start:number;duration:number}>()).results;
 return available(date,duration,busy,weekdays);
}

type MoveFailure='outside-period'|'unavailable'|'conflict';
export async function moveBooking(booking:ChangeableBooking,date:string,start:number,by:ChangedBy):Promise<{ok:true;smsWarning:boolean}|{ok:false;reason:MoveFailure}>{
 const settings=await getBookingSettings();
 if(date>settings.maxDate)return {ok:false,reason:'outside-period'};
 if(!(await freeSlots(date,booking.duration,booking.id,settings.weekdays)).includes(start))return {ok:false,reason:'unavailable'};
 const customer=by==='customer';
 // Customers may only move a booking that has not started and has moves left.
 const result=await db().prepare(`UPDATE bookings SET date=?1,start=?2${customer?',customer_moves=customer_moves+1,customer_changed_at=?9':''} WHERE id=?3 AND date=?4 AND start=?5${customer?' AND status=0 AND customer_moves<?8':''}
   AND NOT EXISTS (SELECT 1 FROM bookings other WHERE other.id<>?3 AND other.date=?1 AND other.start<?2+bookings.duration AND other.start+other.duration>?2)
   AND (SELECT COUNT(*) FROM bookings other WHERE other.id<>?3 AND other.date=?1)<4
   AND (SELECT COUNT(*) FROM bookings other WHERE other.id<>?3 AND other.date=?1 AND other.start>=?6 AND other.start<?7)<2
   AND NOT EXISTS (SELECT 1 FROM closed_dates WHERE date=?1)`)
  .bind(date,start,booking.id,booking.date,booking.start,start<720?0:720,start<720?720:1440,...(customer?[CUSTOMER_MAX_MOVES,Date.now()]:[])).run();
 if(!result.meta.changes)return {ok:false,reason:'conflict'};
 const moved={...booking,date,start};
 const sms=await Promise.allSettled([
  (async()=>{await cancelReminder(booking.id);return scheduleReminder(moved)})(),
  sendBookingChanged(moved,{date:booking.date,start:booking.start}),
 ]);
 for(const outcome of sms)if(outcome.status==='rejected')console.error('Reschedule SMS failed',outcome.reason);
 if(customer)await logCustomerChange('moved',booking,{date,start});
 return {ok:true,smsWarning:sms.some(outcome=>outcome.status==='rejected')};
}

export async function cancelBooking(booking:ChangeableBooking,by:ChangedBy):Promise<{ok:true;smsWarning:boolean}|{ok:false}>{
 let smsWarning=false;
 try{await cancelReminder(booking.id)}catch(error){smsWarning=true;console.error('Reminder cancellation failed',error)}
 // Customers cannot cancel once the wash has started.
 const result=await db().prepare(`DELETE FROM bookings WHERE id=?${by==='customer'?' AND status=0':''}`).bind(booking.id).run();
 if(!result.meta.changes)return {ok:false};
 try{await sendBookingCancelled(booking)}catch(error){smsWarning=true;console.error('Cancellation SMS failed',error)}
 if(by==='customer')await logCustomerChange('cancelled',booking);
 return {ok:true,smsWarning};
}

async function logCustomerChange(action:'moved'|'cancelled',booking:ChangeableBooking,to?:{date:string;start:number}){
 try{
  const now=Date.now();
  await db().batch([
   db().prepare('DELETE FROM booking_changes WHERE created<?').bind(now-CUSTOMER_CHANGE_LOG_DAYS*86400000),
   db().prepare('INSERT INTO booking_changes (id,booking_id,action,name,phone,old_date,old_start,new_date,new_start,created) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),booking.id,action,booking.name,booking.phone,booking.date,booking.start,to?.date??null,to?.start??null,now),
  ]);
 }catch(error){console.error('Could not log customer booking change',error)}
}
