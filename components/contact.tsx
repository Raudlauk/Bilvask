'use client';
import {useEffect,useRef,useState} from 'react';
import {Mail,MapPin,Phone,UserRound} from 'lucide-react';
import {useLanguage} from './language';
import {ChangedBadge,useSettingsSection} from './settings-save';
type Contact={name:string;phone:string;email:string;address:string;vipps:string};
const empty:Contact={name:'',phone:'',email:'',address:'',vipps:''};
export function ContactSection({edit=false}:{edit?:boolean}){
 const {t}=useLanguage();const [contact,setContact]=useState<Contact>(empty),[saved,setSaved]=useState<Contact>(empty),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 const form=useRef<HTMLFormElement>(null);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');fetch('/api/contact',{signal:controller.signal}).then(async r=>{const data=await r.json() as Contact&{error?:string};if(!r.ok)throw new Error(data.error);setContact(data);setSaved(data)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[retry]);
 const dirty=edit&&!loading&&(Object.keys(empty) as (keyof Contact)[]).some(k=>contact[k]!==saved[k]);
 // Only the admin editor takes part in the shared save bar; the public footer is read-only.
 const store=useSettingsSection(edit?'contact':'contact-view',{label:'Kontaktinformasjon',dirty,
  validate:()=>form.current?.reportValidity()??true,
  save:async()=>{setBusy(true);setError('');try{const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(contact)});const data=await r.json() as {error?:string};if(!r.ok)throw new Error(data.error);setSaved(contact)}catch(e){setError(e instanceof Error?e.message:'Kunne ikke lagre kontaktinformasjonen.');throw e}finally{setBusy(false)}},
  reset:()=>{setContact(saved);setError('')},
 });
 const field=(key:keyof Contact)=>({value:contact[key],onChange:(e:React.ChangeEvent<HTMLInputElement>)=>{setContact(c=>({...c,[key]:e.target.value}));setError('')}});
 const errorBox=error&&<p className="error" role="alert">{t(error)} <button type="button" className="secondary" onClick={()=>setRetry(v=>v+1)}>{t('Prøv igjen')}</button></p>;
 if(edit)return <section className="contact-section contact-editor panel" aria-labelledby="contact-editor-title"><div className="settings-head"><h2 id="contact-editor-title">{t('Kontaktinformasjon')} <ChangedBadge show={dirty}/></h2><p className="muted">{t('Opplysningene vises nederst på bestillingssiden. Tomme felt skjules.')}</p></div><div className="settings-body">{loading?<p role="status">{t('Laster kontaktinformasjon…')}</p>:<form ref={form} onSubmit={e=>{e.preventDefault();void store?.saveAll()}}><fieldset disabled={busy} className="contact-fields"><label>{t('Kontaktperson / virksomhet')}<input maxLength={120} {...field('name')}/></label><label>{t('Telefonnummer')}<input type="tel" maxLength={30} {...field('phone')}/></label><label>{t('E-post')}<input type="email" maxLength={254} {...field('email')}/></label><label>{t('Besøksadresse')}<input maxLength={300} {...field('address')}/></label><label>{t('Vipps-nummer')}<input type="tel" maxLength={30} {...field('vipps')}/><small>{t('Vises i betalingsfeltet. La stå tomt for å skjule.')}</small></label></fieldset></form>}{errorBox}</div></section>;
 return <section className="contact-section" aria-labelledby="contact-title"><div><div className="eyebrow">{t('STEAM BILVASK')}</div><h2 id="contact-title">{t('Kontakt oss')}</h2></div>{loading?<p role="status">{t('Laster kontaktinformasjon…')}</p>:<div className="contact-items">{contact.name&&<p><UserRound size={20}/><span>{contact.name}</span></p>}{contact.phone&&<a href={'tel:'+contact.phone.replace(/[^+\d]/g,'')}><Phone size={20}/><span>{contact.phone}</span></a>}{contact.email&&<a href={'mailto:'+contact.email}><Mail size={20}/><span>{contact.email}</span></a>}{contact.address&&<p><MapPin size={20}/><span>{contact.address}</span></p>}{!error&&![contact.name,contact.phone,contact.email,contact.address].some(Boolean)&&<p>{t('Kontaktinformasjon kommer snart.')}</p>}</div>}{error&&<p className="error" role="alert">{t(error)} <button type="button" className="secondary" onClick={()=>setRetry(v=>v+1)}>{t('Prøv igjen')}</button></p>}</section>
}
