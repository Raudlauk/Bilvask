import {authorized,db,getAdmin,json,readBody,sameOrigin} from '@/lib/server';
export async function GET(){try{return json(await db().prepare('SELECT inside,outside FROM prices WHERE id=1').first()||{inside:null,outside:null})}catch{return json({error:'Kunne ikke hente prisene.'},503)}}
export async function POST(req:Request){if(!sameOrigin(req))return json({error:'Ugyldig forespørsel.'},403);try{
 if(!await authorized(req))return json({error:'Logg inn på nytt.'},401);if((await getAdmin()).version===1)return json({error:'Bytt standardpassordet først.'},403);
 const b=await readBody(req);if([b.inside,b.outside].some(v=>v!==null&&(typeof v!=='number'||!Number.isInteger(v)||v<0||v>10000000)))return json({error:'Oppgi en gyldig pris.'},400);
 await db().prepare('INSERT INTO prices (id,inside,outside) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET inside=excluded.inside,outside=excluded.outside').bind(b.inside,b.outside).run();return json({ok:true});
 }catch{return json({error:'Kunne ikke lagre prisene.'},503)}}
