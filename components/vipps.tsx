'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from './language';
import styles from './vipps.module.css';
export function VippsSection(){
 const {t}=useLanguage();const [number,setNumber]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch('/api/contact',{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json() as {vipps?:string};setNumber(data.vipps||'')}).catch(()=>{if(!controller.signal.aborted)setFailed(true)});return()=>controller.abort()},[]);
 if(failed)return <p className="muted">{t('Vipps-nummeret er ikke tilgjengelig akkurat nå.')}</p>;
 if(!number)return null;
 return <section className={styles.payment}><div><h2>{t('Betal med Vipps')}</h2><p>{t('Send betalingen til dette nummeret i Vipps-appen.')}</p></div><div><span>{t('Vipps-nummer')}</span><strong>{number}</strong></div></section>;
}
