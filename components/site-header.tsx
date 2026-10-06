'use client';
import {useEffect,useState} from 'react';
import {Droplets} from 'lucide-react';
import {useLanguage,LanguagePicker} from '@/components/language';

// Shared public header. Pass statusEnabled when the page already knows it;
// otherwise the header loads it so the Vaskestatus link matches the setting.
export function SiteHeader({statusEnabled,current}:{statusEnabled?:boolean;current?:'status'|'admin'}){
 const {t}=useLanguage();
 const [loadedStatus,setLoadedStatus]=useState(false);
 useEffect(()=>{if(statusEnabled!==undefined)return;const c=new AbortController();fetch('/api/booking-settings',{signal:c.signal}).then(async r=>{if(r.ok)setLoadedStatus((await r.json() as {statusEnabled:boolean}).statusEnabled)}).catch(()=>{});return()=>c.abort()},[statusEnabled]);
 const showStatus=current==='status'||(statusEnabled??loadedStatus);
 return <header><div className="header-identity"><a href="https://ynvekst.no/" aria-label="Ytre Namdal Vekst"><img className="yn-logo" src="/yn-vekst-logo.svg" width="174" height="55" alt="Ytre Namdal Vekst"/></a><a className="brand" href="/"><Droplets/> Steam<span>{t('BILVASK')}</span></a></div><div className="header-tools booking-header-tools"><LanguagePicker/><nav className="header-navigation" aria-label={t('Hovedmeny')}>{showStatus&&<a className="worker-link status-link" href="/status" aria-current={current==='status'?'page':undefined}>{t('Vaskestatus')}</a>}<a className="worker-link" href="/admin" aria-current={current==='admin'?'page':undefined}>{t('Ansattinnlogging')}</a></nav></div></header>;
}
