import {authorized,db,getAdmin,json,readBody,sameOrigin} from '@/lib/server';
export async function GET(){try{const row=await db().prepare('SELECT name,phone,email,address,vipps FROM contact WHERE id=1').first();return json(row||{name:'',phone:'',email:'',address:'',vipps:''})}catch{return json({error:'Kunne ikke hente kontaktinformasjonen.'},503)}}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Ugyldig forespørsel.'},403);
 try{
  if(!await authorized(req))return json({error:'Logg inn på nytt.'},401);
  if((await getAdmin()).version===1)return json({error:'Bytt standardpassordet først.'},403);
  const body=await readBody(req);const fields=['name','phone','email','address'] as const;
  if(fields.some(k=>typeof body[k]!=='string'))return json({error:'Kontroller kontaktinformasjonen.'},400);
  const vipps=typeof body.vipps==='string'?body.vipps.trim():'';
  if(vipps&&!/^[+\d\s()-]{5,30}$/.test(vipps))return json({error:'Kontroller Vipps-nummeret.'},400);
  const name=(body.name as string).trim(),phone=(body.phone as string).trim(),email=(body.email as string).trim(),address=(body.address as string).trim();
  if(name.length>120||address.length>300||phone.length>30||email.length>254||(phone&&!/^[+\d\s().-]{7,30}$/.test(phone))||(email&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))||[name,phone,email,address].some(v=>/[\u0000-\u001f\u007f]/.test(v)))return json({error:'Kontroller kontaktinformasjonen.'},400);
  await db().prepare('INSERT INTO contact (id,name,phone,email,address,vipps) VALUES (1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,email=excluded.email,address=excluded.address,vipps=excluded.vipps').bind(name,phone,email,address,vipps).run();
  return json({ok:true});
 }catch(error){return json({error:'Kunne ikke lagre kontaktinformasjonen.'},error instanceof SyntaxError?400:503)}
}
