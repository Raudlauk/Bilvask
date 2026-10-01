import {authorized,db,getAdmin,json,readBody,sameOrigin} from '@/lib/server';
export async function GET(){try{const prices=await db().prepare('SELECT inside,outside,fluid FROM prices WHERE id=1').first()||{inside:null,outside:null,fluid:null};const settings=await db().prepare('SELECT large_car_percent FROM booking_settings WHERE id=1').first<{large_car_percent:number}>();return json({...prices,largeCarPercent:settings?.large_car_percent??0})}catch{return json({error:'Kunne ikke hente prisene.'},503)}}
export async function POST(req:Request){if(!sameOrigin(req))return json({error:'Ugyldig forespørsel.'},403);try{
 if(!await authorized(req))return json({error:'Logg inn på nytt.'},401);if((await getAdmin()).version===1)return json({error:'Bytt standardpassordet først.'},403);
 const b=await readBody(req);if([b.inside,b.outside,b.fluid].some(v=>v!==null&&(typeof v!=='number'||!Number.isInteger(v)||v<0||v>10000000)))return json({error:'Oppgi en gyldig pris.'},400);
 if(b.largeCarPercent!==undefined&&(typeof b.largeCarPercent!=='number'||!Number.isInteger(b.largeCarPercent)||b.largeCarPercent<0||b.largeCarPercent>1000))return json({error:'Velg et pristillegg fra 0 til 1000 prosent.'},400);
 const statements=[db().prepare('INSERT INTO prices (id,inside,outside,fluid) VALUES (1,?,?,?) ON CONFLICT(id) DO UPDATE SET inside=excluded.inside,outside=excluded.outside,fluid=excluded.fluid').bind(b.inside,b.outside,b.fluid)];
 if(b.largeCarPercent!==undefined)statements.push(db().prepare('INSERT INTO booking_settings(id,large_car_percent) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET large_car_percent=excluded.large_car_percent').bind(b.largeCarPercent));
 await db().batch(statements);return json({ok:true});
 }catch{return json({error:'Kunne ikke lagre prisene.'},503)}}
