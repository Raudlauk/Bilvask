'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {useLanguage} from './language';

// One save action for all admin settings sections. Each section registers
// whether it has unsaved changes plus how to validate, save and reset itself.
type Section={label:string;dirty:boolean;validate:()=>boolean;save:()=>Promise<void>;reset:()=>void};
export type SettingsStore={
 dirty:string[];
 saving:boolean;
 register:(id:string,section:Section)=>void;
 unregister:(id:string)=>void;
 saveAll:()=>Promise<boolean>;
 discardAll:()=>void;
};
const Context=createContext<SettingsStore|null>(null);

export function useSettingsStore():SettingsStore{
 const sections=useRef(new Map<string,Section>());
 const [dirty,setDirty]=useState<string[]>([]);
 const [saving,setSaving]=useState(false);
 const refresh=useCallback(()=>setDirty([...sections.current.values()].filter(s=>s.dirty).map(s=>s.label)),[]);
 const register=useCallback((id:string,section:Section)=>{sections.current.set(id,section);refresh()},[refresh]);
 const unregister=useCallback((id:string)=>{sections.current.delete(id);refresh()},[refresh]);
 const saveAll=useCallback(async()=>{
  const pending=[...sections.current.values()].filter(s=>s.dirty);
  // Validate everything first so nothing is half-saved because of a typo further down.
  if(!pending.every(s=>s.validate()))return false;
  setSaving(true);
  let ok=true;
  // Sequential: several sections write to the same settings row.
  for(const section of pending){try{await section.save()}catch{ok=false}}
  setSaving(false);
  return ok;
 },[]);
 const discardAll=useCallback(()=>{for(const section of sections.current.values())if(section.dirty)section.reset()},[]);
 // Warn before closing or reloading the tab with unsaved changes.
 useEffect(()=>{
  if(!dirty.length)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault()};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[dirty.length]);
 return useMemo(()=>({dirty,saving,register,unregister,saveAll,discardAll}),[dirty,saving,register,unregister,saveAll,discardAll]);
}

export function SettingsSaveProvider({store,children}:{store:SettingsStore;children:React.ReactNode}){
 return <Context.Provider value={store}>{children}</Context.Provider>;
}

/** Registers a settings section. Call with the current dirty state on every render. */
export function useSettingsSection(id:string,section:Section){
 const store=useContext(Context);
 const latest=useRef(section);
 latest.current=section;
 const {register,unregister}=store??{};
 const {label,dirty}=section;
 useEffect(()=>{
  register?.(id,{label,dirty,validate:()=>latest.current.validate(),save:()=>latest.current.save(),reset:()=>latest.current.reset()});
 },[id,label,dirty,register]);
 useEffect(()=>()=>unregister?.(id),[id,unregister]);
 return store;
}

export function ChangedBadge({show}:{show:boolean}){
 const {t}=useLanguage();
 return show?<span className="settings-changed">{t('Endret')}</span>:null;
}

export function SettingsSaveBar(){
 const store=useContext(Context);
 const {t}=useLanguage();
 const [message,setMessage]=useState<{ok:boolean;text:string}|null>(null);
 if(!store)return null;
 const {dirty,saving,saveAll,discardAll}=store;
 if(!dirty.length&&!message)return null;
 async function save(){
  setMessage(null);
  const ok=await saveAll();
  setMessage(ok?{ok:true,text:'Alle endringer er lagret.'}:{ok:false,text:'Noen endringer ble ikke lagret. Se feilmeldingen i seksjonen.'});
  if(ok)setTimeout(()=>setMessage(current=>current?.ok?null:current),4000);
 }
 return <div className={'settings-save-bar'+(dirty.length?'':' saved')} role="region" aria-label={t('Lagre innstillinger')}>
  <p aria-live="polite">{dirty.length
   ?<><strong>{t('Ulagrede endringer')}</strong><span>{dirty.map(label=>t(label)).join(', ')}</span></>
   :message&&<strong className={message.ok?'ok':'failed'}>{t(message.text)}</strong>}</p>
  {dirty.length>0&&<div className="settings-save-actions">
   {message&&!message.ok&&<span className="failed">{t(message.text)}</span>}
   <button type="button" className="secondary" disabled={saving} onClick={()=>{discardAll();setMessage(null)}}>{t('Forkast')}</button>
   <button type="button" className="primary" disabled={saving} onClick={()=>void save()}>{t(saving?'Lagrer…':'Lagre endringer')}</button>
  </div>}
 </div>;
}
