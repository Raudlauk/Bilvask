import {db} from './server';
import {today} from './schedule';
import {PERSONAL_DATA_RETENTION_DAYS} from './retention-policy';

// Privacy retention (see /personvern). Name, phone and booking code are removed
// PERSONAL_DATA_RETENTION_DAYS after the appointment; date, service and price stay for statistics.

export function retentionCutoff(from=today()){
 const d=new Date(from+'T12:00:00Z');
 d.setUTCDate(d.getUTCDate()-PERSONAL_DATA_RETENTION_DAYS);
 return d.toISOString().slice(0,10);
}

/** Anonymises old bookings and drops expired rate-limit rows. Never throws. */
export async function cleanupPersonalData(){
 try{
  await db().batch([
   db().prepare("UPDATE bookings SET name='',phone='',status_code=NULL WHERE date<? AND (name<>'' OR phone<>'' OR status_code IS NOT NULL)").bind(retentionCutoff()),
   // Rate-limit keys are hashed IP addresses; they are only needed while the block lasts.
   db().prepare('DELETE FROM attempts WHERE until<?').bind(Date.now()),
  ]);
 }catch(error){console.error('Personal data cleanup failed',error)}
}
