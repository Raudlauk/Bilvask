'use client';
import {MapPin,ArrowUpRight} from 'lucide-react';
import {useLanguage} from './language';
import styles from './location.module.css';
import {useEffect,useState} from 'react';
import {defaultMapsUrl,validMapsUrl} from '@/lib/maps';

export function LocationSection(){
 const {t}=useLanguage();
 const [mapsUrl,setMapsUrl]=useState(defaultMapsUrl);
 useEffect(()=>{
  const controller=new AbortController();
  async function refresh(){try{const r=await fetch('/api/booking-settings',{signal:controller.signal});if(r.ok){const data=await r.json() as {mapsUrl:string};if(validMapsUrl(data.mapsUrl))setMapsUrl(data.mapsUrl)}}catch{}}
  void refresh();window.addEventListener('focus',refresh);
  return()=>{controller.abort();window.removeEventListener('focus',refresh)};
 },[]);
 return <section className={styles.location} aria-labelledby="location-title">
  <div className={styles.icon}><MapPin size={32} aria-hidden="true"/></div>
  <div className={styles.copy}><h2 id="location-title">{t('Finn oss')}</h2><p>{t('Se hvor Steam holder til, og få veibeskrivelse i Google Maps.')}</p></div>
  <a className={styles.link} href={mapsUrl} target="_blank" rel="noopener noreferrer">{t('Åpne i Google Maps')}<ArrowUpRight size={20} aria-hidden="true"/></a>
 </section>;
}
