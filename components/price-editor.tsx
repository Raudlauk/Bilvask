'use client';
import {useEffect,useRef,useState} from 'react';
import {useLanguage} from './language';
import type {Prices} from '@/lib/prices';
import {ChangedBadge,useSettingsSection} from './settings-save';

type Values={inside:string;outside:string;fluid:string;largeCarPercent:string};
const empty:Values={inside:'',outside:'',fluid:'',largeCarPercent:'0'};
export function PriceEditor(){
 const {t}=useLanguage();
 const [values,setValues]=useState<Values>(empty),[saved,setSaved]=useState<Values>(empty),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const form=useRef<HTMLFormElement>(null);
 useEffect(()=>{const controller=new AbortController();setError('');fetch('/api/prices',{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error('Kunne ikke hente prisene.');const p=await r.json() as Prices & {largeCarPercent:number};const loaded={largeCarPercent:String(p.largeCarPercent??0),inside:p.inside===null?'':String(p.inside/100),outside:p.outside===null?'':String(p.outside/100),fluid:p.fluid==null?'':String(p.fluid/100)};setValues(loaded);setSaved(loaded);setReady(true)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)});return()=>controller.abort()},[retry]);
 const dirty=ready&&(Object.keys(values) as (keyof Values)[]).some(k=>values[k]!==saved[k]);
 const store=useSettingsSection('prices',{label:'Priser for bilvask',dirty,
  validate:()=>form.current?.reportValidity()??true,
  save:async()=>{setBusy(true);setError('');try{const parse=(s:string)=>s.trim()===''?null:Math.round(Number(s.replace(',','.'))*100);const r=await fetch('/api/prices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inside:parse(values.inside),outside:parse(values.outside),fluid:parse(values.fluid),largeCarPercent:Number(values.largeCarPercent)})});const data=await r.json() as {error?:string};if(!r.ok)throw new Error(data.error);setSaved(values)}catch(e){setError(e instanceof Error?e.message:'Kunne ikke lagre prisene.');throw e}finally{setBusy(false)}},
  reset:()=>{setValues(saved);setError('')},
 });
 const field=(key:keyof Values)=>({value:values[key],disabled:busy,onChange:(e:React.ChangeEvent<HTMLInputElement>)=>{setValues(v=>({...v,[key]:e.target.value}));setError('')}});
 return <section className="panel price-editor"><div className="settings-head"><h2>{t('Priser for bilvask')} <ChangedBadge show={dirty}/></h2><p className="muted">{t('Priser i kroner. Tomt felt betyr at pris avtales. Endringer gjelder nye bestillinger.')}</p></div><div className="settings-body">{!ready&&!error&&<p role="status">{t('Laster…')}</p>}{ready&&<form ref={form} onSubmit={e=>{e.preventDefault();void store?.saveAll()}}><div className="form-grid"><label>{t('Innvendig vask')} · NOK<input type="number" min="0" max="100000" step="0.01" {...field('inside')}/></label><label>{t('Utvendig vask')} · NOK<input type="number" min="0" max="100000" step="0.01" {...field('outside')}/></label><label>{t('Påfyll av spylervæske')} · NOK<input type="number" min="0" max="100000" step="0.01" {...field('fluid')}/></label><label>{t('Stor / skitten bil')} · %<input type="number" required min="0" max="1000" step="1" aria-describedby="large-car-price-help" {...field('largeCarPercent')}/></label></div><p id="large-car-price-help" className="muted" style={{margin:'16px 0 0',fontSize:12,lineHeight:1.6}}>{t('Prosenttillegget gjelder vask og bilpolering, ikke spylervæske. 0 % gir ingen ekstra pris.')}</p></form>}{error&&<p className="error" role="alert">{t(error)} {!ready&&<button className="secondary" onClick={()=>setRetry(r=>r+1)}>{t('Prøv igjen')}</button>}</p>}</div></section>;
}
