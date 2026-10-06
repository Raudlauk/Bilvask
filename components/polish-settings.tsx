'use client';
import {useEffect,useRef,useState} from 'react';
import {useLanguage} from './language';
import {ChangedBadge,useSettingsSection} from './settings-save';

type Values={enabled:boolean;minutes:string;price:string};
const empty:Values={enabled:false,minutes:'60',price:''};
export function PolishSettings(){
  const {t}=useLanguage();const [values,setValues]=useState<Values>(empty),[saved,setSaved]=useState<Values>(empty),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const form=useRef<HTMLFormElement>(null);
  useEffect(()=>{const c=new AbortController();setError('');fetch('/api/polish-settings',{signal:c.signal}).then(async r=>{const b=await r.json() as {enabled:number;minutes:number;price:number|null;error?:string};if(!r.ok)throw new Error(b.error);const loaded={enabled:b.enabled===1,minutes:String(b.minutes),price:b.price===null?'':String(b.price/100)};setValues(loaded);setSaved(loaded);setReady(true)}).catch(e=>{if(!c.signal.aborted)setError(e.message)});return()=>c.abort()},[retry]);
  const dirty=ready&&(values.enabled!==saved.enabled||values.minutes!==saved.minutes||values.price!==saved.price);
  const store=useSettingsSection('polish',{label:'Bilpolering',dirty,
    validate:()=>form.current?.reportValidity()??true,
    save:async()=>{setBusy(true);setError('');try{const r=await fetch('/api/polish-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:values.enabled,minutes:Number(values.minutes),price:values.price.trim()===''?null:Math.round(Number(values.price)*100)})});const b=await r.json() as {error?:string};if(!r.ok)throw new Error(b.error);setSaved(values)}catch(e){setError(e instanceof Error?e.message:'Prøv igjen.');throw e}finally{setBusy(false)}},
    reset:()=>{setValues(saved);setError('')},
  });
  const set=(patch:Partial<Values>)=>{setValues(v=>({...v,...patch}));setError('')};
  return <section className="panel polish-settings"><div className="settings-head"><h2>{t('Bilpolering')} <ChangedBadge show={dirty}/></h2><p className="muted">{t('Deaktivert som standard. Aktiver for å vise polering på bestillingssiden. Eksisterende bestillinger beholdes.')}</p></div><div className="settings-body">{!ready&&!error&&<p>{t('Laster…')}</p>}{ready&&<form ref={form} onSubmit={e=>{e.preventDefault();void store?.saveAll()}}><label className="polish-toggle"><input type="checkbox" checked={values.enabled} disabled={busy} onChange={e=>set({enabled:e.target.checked})}/>{t('Tilby bilpolering')}</label><div className="form-grid"><label>{t('Arbeidstid i minutter')}<input required type="number" min="15" max="180" step="15" value={values.minutes} disabled={busy} onChange={e=>set({minutes:e.target.value})}/></label><label>{t('Pris')} · NOK<input type="number" min="0" max="100000" step="0.01" value={values.price} disabled={busy} onChange={e=>set({price:e.target.value})}/></label></div><p className="muted">{t('Tom pris betyr at pris avtales. Ved flere tjenester legges tid og pris sammen.')}</p></form>}{error&&<p className="error" role="alert">{t(error)}{!ready&&<button className="secondary" onClick={()=>setRetry(n=>n+1)}>{t('Prøv igjen')}</button>}</p>}</div></section>;
}
