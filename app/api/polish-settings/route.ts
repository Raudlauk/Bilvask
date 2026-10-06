import {authorized,db,getAdmin,json,readBody,sameOrigin} from '@/lib/server';
export async function GET(req:Request){try{
  if(!await authorized(req))return json({error:'Kun administrator har tilgang.'},403);
  return json(await db().prepare('SELECT enabled,minutes,price FROM polish_settings WHERE id=1').first()??{enabled:0,minutes:60,price:null});
}catch{return json({error:'Kunne ikke hente innstillinger for polering.'},503)}}
export async function POST(req:Request){
  if(!sameOrigin(req))return json({error:'Ugyldig forespørsel.'},403);
  try{
    if(!await authorized(req))return json({error:'Kun administrator har tilgang.'},403);
    if((await getAdmin()).version===1)return json({error:'Bytt standardpassordet først.'},403);
    const {enabled,minutes,price}=await readBody(req);
    if(typeof enabled!=='boolean'||typeof minutes!=='number'||!Number.isInteger(minutes)||minutes<15||minutes>180||minutes%15!==0|| (price!==null&&(typeof price!=='number'||!Number.isInteger(price)||price<0||price>10000000)))
      return json({error:'Oppgi gyldig pris og 15-180 minutter i trinn på 15.'},400);
    await db().prepare('INSERT INTO polish_settings(id,enabled,minutes,price) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,minutes=excluded.minutes,price=excluded.price').bind(Number(enabled),minutes,price).run();
    return json({ok:true});
  }catch{return json({error:'Kunne ikke lagre innstillinger for polering.'},503)}
}
