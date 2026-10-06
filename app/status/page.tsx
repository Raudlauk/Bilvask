'use client';
import styles from './status.module.css';
import {useEffect,useState,useRef} from 'react';
import {useLanguage} from '@/components/language';
import {SiteHeader} from '@/components/site-header';
import {CustomerBookingChange} from '@/components/customer-booking-change';
import {washStatuses} from '@/lib/wash-status';
import {dateLabel,timeLabel} from '@/lib/schedule';
export default function Status(){
 const {t,language}=useLanguage(),[enabled,setEnabled]=useState<boolean|null>(null),[changesEnabled,setChangesEnabled]=useState(false),[cancelled,setCancelled]=useState(false),[lookup,setLookup]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{date:string;start:number;status:number}|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{const c=new AbortController();fetch('/api/booking-settings',{signal:c.signal}).then(async r=>{if(!r.ok)throw new Error('Prøv igjen.');const settings=await r.json() as {statusEnabled:boolean;customerChanges?:boolean};setEnabled(settings.statusEnabled);setChangesEnabled(!!settings.customerChanges);setError('')}).catch(e=>{if(!c.signal.aborted)setError(e.message)});return()=>c.abort()},[retry]);
 const activeSearch=useRef<AbortController|null>(null);
 useEffect(()=>()=>activeSearch.current?.abort(),[]);
 function clearSearch(){activeSearch.current?.abort();activeSearch.current=null;setBusy(false);setResult(null);setCancelled(false);setError('')}
 async function search(values={lookup,code}){
  activeSearch.current?.abort();
  const controller=new AbortController();
  activeSearch.current=controller;
  setBusy(true);setResult(null);setError('');
  try{
   const r=await fetch('/api/wash-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values),signal:controller.signal});
   const b=await r.json() as {error:string;date:string;start:number;status:number};
   if(controller.signal.aborted)return;
   if(!r.ok){if(r.status===403)setEnabled(false);throw new Error(b.error)}
   setResult(b);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Prøv igjen.')}
  finally{if(!controller.signal.aborted){activeSearch.current=null;setBusy(false)}}
 }
 const openedFromLink=useRef(false);
 useEffect(()=>{
  if(!enabled||openedFromLink.current)return;
  openedFromLink.current=true;
  const params=new URLSearchParams(window.location.hash.slice(1));
  const linkLookup=params.get('lookup'),linkCode=params.get('code');
  if(!linkLookup||!linkCode||linkLookup.length>100||linkCode.length>36)return;
  setLookup(linkLookup);setCode(linkCode);
  window.history.replaceState(null,'',window.location.pathname+window.location.search);
  void search({lookup:linkLookup,code:linkCode});
 },[enabled]);
 return <><SiteHeader statusEnabled current="status"/>
 <main className={styles.page}><section className={styles.hero}>
 <div className={styles.eyebrow}>{t('DIN NESTE BILVASK')}</div><h1>{t('Vaskestatus')}</h1><p className={styles.intro}>{t('Følg bilen din fra bestilt til ferdig.')}</p>
 <a className={styles.back} href="/">← {t('Tilbake til bestilling')}</a></section><section className={styles.card} aria-label={t('Sjekk status')}>
 <h2>{t('Sjekk status')}</h2>
 {enabled===null&&!error&&<p role="status">{t('Laster…')}</p>}{enabled===false&&<p>{t('Statusvisning er deaktivert.')}</p>}
 {enabled&&<form className={styles.form} onSubmit={e=>{e.preventDefault();void search()}} onChange={clearSearch}><label>{t('Navn eller telefonnummer')}<input required maxLength={100} value={lookup} onChange={e=>setLookup(e.target.value)}/></label><label>{t('Bestillingskode')}<input required maxLength={36} autoCapitalize="characters" placeholder="ABC234" spellCheck={false} aria-describedby="code-help" value={code} onChange={e=>setCode(e.target.value)}/></label><p id="code-help" className={styles.help}>{t('Koden har 6 tegn og står på bestillingsbekreftelsen. Tidligere lange koder fungerer også.')}</p><button className="primary" disabled={busy}>{t(busy?'Laster…':'Sjekk status')}</button></form>}
 {error&&<p className="error" role="alert">{t(error)}{enabled===null&&<button className="secondary" onClick={()=>setRetry(v=>v+1)}>{t('Prøv igjen.')}</button>}</p>}
 {result&&<div className={styles.result}><div className={styles.resultTitle} role="status"><span>{t('Vaskestatus')}</span><strong>{t(washStatuses[result.status])}</strong></div><ol className={styles.steps}>{washStatuses.map((label,i)=><li key={label} className={i<=result.status?styles.reached:''} aria-current={i===result.status?'step':undefined}><span aria-hidden="true">{i<result.status||result.status===washStatuses.length-1?'✓':i+1}</span>{t(label)}</li>)}</ol><div className={styles.appointment}><span>{dateLabel(result.date,language)}</span><strong>{timeLabel(result.start)}</strong></div>{changesEnabled&&result.status===0&&<CustomerBookingChange code={code} lookup={lookup} onMoved={(date,start)=>setResult({...result,date,start})} onCancelled={()=>{setResult(null);setCancelled(true)}}/>}</div>}
 {cancelled&&<div className={styles.cancelled} role="status"><strong>{t('Timen er avbestilt.')}</strong>{t('Tidspunktet er ledig igjen. Du er velkommen til å bestille en ny time.')} <a href="/">{t('Bestill ny bilvask')}</a></div>}
 </section></main></>;
}
