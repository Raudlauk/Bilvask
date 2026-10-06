'use client';
import {ArrowRight} from 'lucide-react';
import {useLanguage} from './language';
import styles from './site-footer.module.css';
import {ContactSection} from './contact';
import {LocationSection} from './location';
const links=[['Jobbsøkere','jobbsokere/'],['Næringsliv','naeringsliv/'],['NAV','nav/'],['Produkter','produkter/'],['Aktuelt','aktuelt/'],['Om oss','om-oss/'],['Ledige stillinger','ledige-stillinger/'],['Kontakt oss','kontakt/']];
export function SiteFooter({mapsUrl}:{mapsUrl?:string}){
 const {t}=useLanguage();
 return <footer className={styles.footer}><div className={styles.contactArea}><ContactSection/><LocationSection mapsUrl={mapsUrl}/></div><div className={styles.columns}>
 <a href="https://ynvekst.no/" className={styles.logo}><img src="/yn-vekst-logo.svg" width="230" height="73" alt="Ytre Namdal Vekst"/></a>
 <section><h2>Ytre Namdal Vekst</h2><address><div><span>{t('Telefon sentralbord')}</span><a href="tel:+4774391377">74 39 13 77</a></div><div><span>{t('E-post')}</span><a href="mailto:firmapost@ynvekst.no">firmapost@ynvekst.no</a></div></address><a className={styles.contactLink} href="https://ynvekst.no/kontakt/">{t('Se all kontaktinfo')}<ArrowRight size={20} aria-hidden="true"/></a></section>
 <nav aria-label={t('Snarveier')}><h2>{t('Snarveier')}</h2><ul>{links.map(([label,path])=><li key={path}><a href={'https://ynvekst.no/'+path}>{t(label)}</a></li>)}</ul></nav>
 </div><a className={styles.social} href="https://facebook.com/Ytre-Namdal-Vekst-AS-157904070936458/" target="_blank" rel="noopener noreferrer" aria-label="Ytre Namdal Vekst på Facebook"><span aria-hidden="true" style={{fontFamily:'Arial',fontWeight:800,fontSize:30}}>f</span></a></footer>;
}
