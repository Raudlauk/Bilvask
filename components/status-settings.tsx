'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from './language';
import {ChangedBadge,useSettingsSection} from './settings-save';

type Values={enabled:boolean;changes:boolean};
export function StatusSettings(){
 const {t}=useLanguage(),[values,setValues]=useState<Values>({enabled:false,changes:false}),[saved,setSaved]=useState<Values>({enabled:false,changes:false}),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const c=new AbortController();fetch('/api/booking-settings',{signal:c.signal}).then(async r=>{if(!r.ok)throw new Error('Prøv igjen.');const b=await r.json() as {statusEnabled:boolean;customerChanges?:boolean};const loaded={enabled:b.statusEnabled,changes:!!b.customerChanges};setValues(loaded);setSaved(loaded);setReady(true);setError('')}).catch(e=>{if(!c.signal.aborted)setError(e.message)});return()=>c.abort()},[retry]);
 // Customer changes only apply while status is enabled.
 const effective={enabled:values.enabled,changes:values.enabled&&values.changes};
 const dirty=ready&&(effective.enabled!==saved.enabled||effective.changes!==saved.changes);
 useSettingsSection('status',{label:'Vaskestatus',dirty,validate:()=>true,
  save:async()=>{setBusy(true);setError('');try{const r=await fetch('/api/booking-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'status-enabled',statusEnabled:effective.enabled,customerChanges:effective.changes})});const b=await r.json() as {error?:string};if(!r.ok)throw new Error(b.error);setSaved(effective)}catch(e){setError(e instanceof Error?e.message:'Prøv igjen.');throw e}finally{setBusy(false)}},
  reset:()=>{setValues(saved);setError('')},
 });
 const row={display:'flex',gap:10,alignItems:'center',margin:'20px 0'} as const;
 return <section className="panel status-settings"><div className="settings-head"><h2>{t('Vaskestatus')} <ChangedBadge show={dirty}/></h2><p className="muted">{t('Kunder kan sjekke status med navn eller telefonnummer og bestillingskode. Ansatte kan oppdatere fremdriften.')}</p></div><div className="settings-body">{ready&&<div>
  <label style={row}><input style={{width:18}} type="checkbox" checked={values.enabled} disabled={busy} onChange={e=>{setValues(v=>({...v,enabled:e.target.checked}));setError('')}}/>{t('Aktiver vaskestatus')}</label>
  <label style={{...row,alignItems:'flex-start'}}><input style={{width:18,marginTop:3}} type="checkbox" checked={effective.changes} disabled={busy||!values.enabled} onChange={e=>{setValues(v=>({...v,changes:e.target.checked}));setError('')}}/><span>{t('La kunder flytte eller avbestille timen selv')}<br/><small className="muted">{t('Med telefonnummer og bestillingskode, frem til 2 timer før timen og før vasken er påbegynt. Endringer vises i arbeidslisten.')}</small></span></label>
 </div>}{error&&<p role="alert" className="error">{t(error)}{!ready&&<button className="secondary" onClick={()=>setRetry(v=>v+1)}>{t('Prøv igjen')}</button>}</p>}</div></section>;
}
