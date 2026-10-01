import {bookingCode} from '@/lib/booking-code';
import {getBookingSettings} from '@/lib/booking-settings';
import {db,json} from '@/lib/server';
export async function GET(req:Request){try{
 const id=req.headers.get('cookie')?.match(/(?:^|;\s*)steam_receipt=([^;]+)/)?.[1];
 if(!id||!/^[a-f0-9-]{36}$/.test(id))return json({error:'Ingen nylig bestilling å vise.'},404);
 const row=await db().prepare('SELECT name,date,start,duration,inside,outside,fluid,price,large_car,polish FROM bookings WHERE id=? AND created>?').bind(id,Date.now()-3600000).first();
 if(!row)return json({error:'Bekreftelsen er utløpt eller bestillingen er avbestilt.'},404);
 return json({...row,code:await bookingCode(id),statusEnabled:(await getBookingSettings()).statusEnabled});
 }catch{return json({error:'Kunne ikke hente bekreftelsen. Prøv igjen.'},503)}}
