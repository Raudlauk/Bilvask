import {db} from './server';
export async function bookingCode(id:string):Promise<string>{
 for(let attempt=0;attempt<10;attempt++){
  const existing=await db().prepare('SELECT status_code FROM bookings WHERE id=?').bind(id).first<{status_code:string|null}>();
  if(!existing)throw new Error('Booking not found');
  if(existing.status_code)return existing.status_code;
  // Six random characters, without easily confused letters or digits.
  const alphabet='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes=crypto.getRandomValues(new Uint8Array(6));
  const code=Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');
  await db().prepare('UPDATE OR IGNORE bookings SET status_code=? WHERE id=? AND status_code IS NULL').bind(code,id).run();
 }
 throw new Error('Could not allocate booking code');
}
