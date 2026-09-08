import {GET as confirmation} from '../confirmation/route';
import {calendarEvent} from '@/lib/calendar';
export async function GET(req:Request){
 const response=await confirmation(req);
 if(!response.ok)return response;
 const receipt=await response.json() as {date:string;start:number;duration:number};
 const id=req.headers.get('cookie')!.match(/(?:^|;\s*)steam_receipt=([^;]+)/)![1];
 return new Response(calendarEvent(receipt.date,receipt.start,receipt.duration,id,new URL(req.url).searchParams.get('lang')==='en'),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="steam-bilvask.ics"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
