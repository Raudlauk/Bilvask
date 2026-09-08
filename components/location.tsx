'use client';
import {MapPin,ArrowUpRight} from 'lucide-react';
import {useLanguage} from './language';
import styles from './location.module.css';

export function LocationSection(){
 const {t}=useLanguage();
 return <section className={styles.location} aria-labelledby="location-title">
  <div className={styles.icon}><MapPin size={32} aria-hidden="true"/></div>
  <div className={styles.copy}><h2 id="location-title">{t('Finn oss')}</h2><p>{t('Se hvor Steam holder til, og få veibeskrivelse i Google Maps.')}</p></div>
  <a className={styles.link} href="https://maps.app.goo.gl/Mni517D6GykSQNg7A" target="_blank" rel="noopener noreferrer">{t('Åpne i Google Maps')}<ArrowUpRight size={20} aria-hidden="true"/></a>
 </section>;
}
