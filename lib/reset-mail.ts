import {env} from 'cloudflare:workers';
type MailConfig={BOOKING_PUBLIC_ORIGIN?:string;BOOKING_RESEND_API_KEY?:string;BOOKING_EMAIL_FROM?:string};
export function mailConfig(){
 const values=env as unknown as MailConfig;
 if(!values.BOOKING_PUBLIC_ORIGIN||!values.BOOKING_RESEND_API_KEY||!values.BOOKING_EMAIL_FROM)return null;
 try{const url=new URL(values.BOOKING_PUBLIC_ORIGIN);if(url.protocol!=='https:'||url.origin!==values.BOOKING_PUBLIC_ORIGIN)return null}catch{return null}
 return {origin:values.BOOKING_PUBLIC_ORIGIN,key:values.BOOKING_RESEND_API_KEY,from:values.BOOKING_EMAIL_FROM};
}
export async function sendResetEmail(config:NonNullable<ReturnType<typeof mailConfig>>,email:string,token:string,english:boolean,id:string,siteName='Steam'){
 const link=config.origin+'/reset-password#'+token;
 const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:config.from,to:[email],subject:english?`Reset your ${siteName} password`:`Tilbakestill passordet for ${siteName}`,text:english?`Choose a new password for ${siteName}:\n\n${link}\n\nThis link expires in 15 minutes and can only be used once. If you did not request this, ignore this email.`:`Velg et nytt passord for ${siteName}:\n\n${link}\n\nLenken utløper etter 15 minutter og kan bare brukes én gang. Hvis du ikke ba om dette, kan du se bort fra e-posten.`})});
 if(!response.ok){
  // Resend's error name (e.g. validation_error) is safe to log; its message can contain addresses.
  const name=await response.json().then(b=>(b as {name?:unknown}).name,()=>undefined);
  throw new Error(`Resend responded ${response.status}${typeof name==='string'?' '+name:''}`);
 }
}
