'use client';
import {useState} from 'react';
import {useLanguage} from './language';
import {washStatuses} from '@/lib/wash-status';
export function WashProgress({id,status,onSaved}:{id:string;status:number;onSaved:()=>void|Promise<void>}){
 const {t}=useLanguage(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function update(value:number){setBusy(true);setError('');try{const r=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'progress',id,status:value,expectedStatus:status})});const b=await r.json() as {error:string};if(!r.ok)throw new Error(b.error);await onSaved()}catch(e){setError(e instanceof Error?e.message:'Prøv igjen.')}finally{setBusy(false)}}
 return <div className="wash-progress"><span className="progress-label">{t('Vaskestatus')}</span><div role="group" aria-label={t('Vaskestatus')}>{washStatuses.map((label,i)=><button key={label} type="button" className={status===i?'primary':'secondary'} aria-pressed={status===i} disabled={busy||status===i} onClick={()=>void update(i)}>{t(label)}</button>)}</div>{error&&<p className="error" role="alert">{t(error)}</p>}</div>;
}
