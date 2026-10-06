'use client';
import {useState} from 'react';
import {useLanguage} from './language';
import {normalizePhoneInput} from '@/lib/phone-input';
import {dateLabel,timeLabel} from '@/lib/schedule';

type Options={booking:{date:string;start:number;duration:number};canMove:boolean;canCancel:boolean;reason:string|null;contactPhone:string;dates:{date:string;slots:number[]}[]};

// Lets a customer move or cancel their own booking from Vaskestatus (phone + code).
export function CustomerBookingChange({code,lookup,onMoved,onCancelled}:{code:string;lookup:string;onMoved:(date:string,start:number)=>void;onCancelled:()=>void}){
 const {t,language}=useLanguage();
 const [open,setOpen]=useState(false),[phone,setPhone]=useState(()=>/^[0-9 ]{8,11}$/.test(lookup.trim())?normalizePhoneInput(lookup):''),[options,setOptions]=useState<Options|null>(null);
 const [date,setDate]=useState(''),[start,setStart]=useState<number|null>(null),[confirmCancel,setConfirmCancel]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function call(body:Record<string,unknown>){
  const r=await fetch('/api/customer-booking',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,phone,...body})});
  const data=await r.json() as Options&{error?:string;ok?:boolean;date:string;start:number};
  if(!r.ok)throw new Error(data.error);
  return data;
 }
 async function loadOptions(e?:React.SubmitEvent<HTMLFormElement>){
  e?.preventDefault();setBusy(true);setError('');
  try{const data=await call({action:'options'});setOptions(data);setDate(data.dates[0]?.date??'');setStart(null)}
  catch(e){setError(e instanceof Error?e.message:'Prøv igjen.')}finally{setBusy(false)}
 }
 async function move(){
  if(start===null)return;setBusy(true);setError('');
  try{const data=await call({action:'move',date,start});onMoved(data.date,data.start);setOptions(null);setOpen(false);setNotice(`${t('Timen er flyttet til')} ${dateLabel(data.date,language)} ${t('kl.')} ${timeLabel(data.start)}.`)}
  catch(e){setError(e instanceof Error?e.message:'Prøv igjen.');void loadOptions()}finally{setBusy(false)}
 }
 async function cancel(){
  setBusy(true);setError('');
  try{await call({action:'cancel'});onCancelled()}
  catch(e){setError(e instanceof Error?e.message:'Prøv igjen.');setConfirmCancel(false)}finally{setBusy(false)}
 }
 const slots=options?.dates.find(d=>d.date===date)?.slots??[];
 if(!open)return <div className="customer-change">{notice&&<p className="success" role="status">{notice}</p>}<button type="button" className="secondary" onClick={()=>{setOpen(true);setNotice('')}}>{t('Endre eller avbestill timen')}</button></div>;
 return <section className="customer-change" aria-label={t('Endre eller avbestill timen')}>
  <h3>{t('Endre eller avbestill timen')}</h3>
  {!options?<form onSubmit={loadOptions}><p className="muted">{t('Bekreft med telefonnummeret du bestilte med.')}</p><label>{t('Telefonnummer')}<input type="tel" inputMode="numeric" autoComplete="tel-national" required pattern="[0-9]{8}" title={t('Oppgi 8 sifre uten +47.')} placeholder={t('8 sifre uten +47')} value={phone} onChange={e=>setPhone(normalizePhoneInput(e.target.value))}/></label><div className="admin-actions"><button className="primary" disabled={busy}>{t(busy?'Laster…':'Fortsett')}</button><button type="button" className="secondary" onClick={()=>{setOpen(false);setError('')}}>{t('Avbryt')}</button></div></form>
  :<>
   {options.reason&&<p className="notice">{t(options.reason)}{options.contactPhone&&<> <a href={'tel:'+options.contactPhone.replace(/[^+\d]/g,'')}>{options.contactPhone}</a></>}</p>}
   {options.canMove&&(options.dates.length?<div className="customer-move">
    <label>{t('Ny dato')}<select value={date} onChange={e=>{setDate(e.target.value);setStart(null)}}>{options.dates.map(d=><option key={d.date} value={d.date}>{dateLabel(d.date,language)}</option>)}</select></label>
    <div className="slots" role="group" aria-label={t('Ledige tider')}>{slots.map(s=><button type="button" key={s} className={'slot '+(start===s?'active':'')} aria-pressed={start===s} onClick={()=>setStart(s)}>{timeLabel(s)}-{timeLabel(s+options.booking.duration)}</button>)}</div>
    <button type="button" className="primary" disabled={busy||start===null} onClick={()=>void move()}>{t(busy?'Vennligst vent…':'Flytt timen')}</button>
   </div>:<p className="notice">{t('Ingen ledige tider å flytte til akkurat nå.')}</p>)}
   {options.canCancel&&(confirmCancel
    ?<div className="customer-cancel-confirm" role="alertdialog" aria-label={t('Avbestill timen')}><p>{t('Vil du avbestille timen')} {dateLabel(options.booking.date,language)} {t('kl.')} {timeLabel(options.booking.start)}?</p><div className="admin-actions"><button type="button" className="primary cancel-booking" disabled={busy} onClick={()=>void cancel()}>{t(busy?'Vennligst vent…':'Ja, avbestill')}</button><button type="button" className="secondary" disabled={busy} onClick={()=>setConfirmCancel(false)}>{t('Nei, behold timen')}</button></div></div>
    :<button type="button" className="secondary cancel-booking" onClick={()=>setConfirmCancel(true)}>{t('Avbestill timen')}</button>)}
   <button type="button" className="text-button" onClick={()=>{setOpen(false);setOptions(null);setConfirmCancel(false);setError('')}}>{t('Lukk')}</button>
  </>}
  {error&&<p className="error" role="alert">{t(error)}</p>}
 </section>;
}
