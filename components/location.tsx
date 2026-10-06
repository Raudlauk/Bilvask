'use client';
import {MapPin,ArrowUpRight} from 'lucide-react';
import {useLanguage} from './language';
import styles from './location.module.css';
import {defaultMapsUrl,validMapsUrl} from '@/lib/maps';

// mapsUrl comes from the booking settings the page already loads and refreshes.
export function LocationSection({mapsUrl:configured}:{mapsUrl?:string}){
 const {t}=useLanguage();
 const mapsUrl=configured&&validMapsUrl(configured)?configured:defaultMapsUrl;
 return <section className={styles.location} aria-labelledby="location-title">
  <div className={styles.icon}><MapPin size={32} aria-hidden="true"/></div>
  <div className={styles.copy}><h2 id="location-title">{t('Finn oss')}</h2><p>{t('Se hvor vi holder til, og få veibeskrivelse i Google Maps.')}</p></div>
  <a className={styles.link} href={mapsUrl} target="_blank" rel="noopener noreferrer">{t('Åpne i Google Maps')}<ArrowUpRight size={20} aria-hidden="true"/></a>
 </section>;
}
