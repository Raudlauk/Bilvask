import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { CUSTOMER_CHANGE_LOG_DAYS, PERSONAL_DATA_RETENTION_DAYS } from '@/lib/retention-policy';
import styles from './privacy.module.css';

export const metadata: Metadata = { title: 'Personvern' };

// Draft privacy notice for Ytre Namdal Vekst to review. Keep it in step with
// what the code actually does (retention periods come from lib/retention-policy).
export default function Privacy() {
  return <>
    <SiteHeader />
    <main className={styles.page}>
      <article className={styles.card}>
        <h1>Personvernerklæring for Steam bilvask</h1>
        <p className={styles.lead}>Her forklarer vi hvilke opplysninger vi samler inn når du bestiller bilvask, hvorfor vi trenger dem, og hvor lenge vi tar vare på dem.</p>

        <h2>Hvem er ansvarlig</h2>
        <p>Steam bilvask drives av Ytre Namdal Vekst AS, som er behandlingsansvarlig for personopplysningene. Har du spørsmål om personvern, kontakt oss på <a href="mailto:firmapost@ynvekst.no">firmapost@ynvekst.no</a> eller <a href="tel:+4774391377">74 39 13 77</a>.</p>

        <h2>Hvilke opplysninger vi behandler</h2>
        <ul>
          <li><strong>Når du bestiller:</strong> navn, telefonnummer, valgt vask og tillegg, dato og klokkeslett, pris og bestillingskode.</li>
          <li><strong>Når du endrer eller avbestiller selv i Vaskestatus:</strong> hva som ble endret og når, slik at de ansatte kan se det.</li>
          <li><strong>Sikkerhet:</strong> for å stoppe misbruk begrenser vi antall forsøk. Til dette lagrer vi en kryptografisk sjekksum (hash) av IP-adressen i kort tid, ikke selve adressen.</li>
          <li><strong>Ansatte:</strong> brukernavn, passord (lagret som hash, aldri i klartekst) og eventuelt e-post for passordgjenoppretting.</li>
        </ul>

        <h2>Hvorfor og med hvilket grunnlag</h2>
        <p>Vi bruker opplysningene for å gjennomføre bestillingen du har bedt om: holde av timen, sende bekreftelse og påminnelse på SMS, gi beskjed hvis timen endres, og la deg sjekke status. Grunnlaget er at behandlingen er nødvendig for å oppfylle avtalen med deg (personvernforordningen artikkel 6 nr. 1 bokstav b). Begrensning av innloggings- og bestillingsforsøk skjer for å beskytte tjenesten (artikkel 6 nr. 1 bokstav f).</p>
        <p>Vi bruker ikke opplysningene til markedsføring, og vi selger dem ikke.</p>

        <h2>Hvor lenge vi lagrer opplysningene</h2>
        <ul>
          <li>Navn, telefonnummer og bestillingskode slettes automatisk <strong>{PERSONAL_DATA_RETENTION_DAYS} dager etter timen</strong>. Etter det beholder vi bare dato, tjeneste og pris uten personopplysninger, til statistikk.</li>
          <li>Avbestilte timer slettes med en gang.</li>
          <li>Loggen over endringer gjort av kunder slettes etter {CUSTOMER_CHANGE_LOG_DAYS} dager.</li>
          <li>Opplysninger om forsøk (hash av IP-adresse) slettes når sperretiden er over, normalt innen 15 minutter.</li>
        </ul>

        <h2>Hvem som behandler opplysningene for oss</h2>
        <p>Vi bruker noen leverandører (databehandlere) som bare behandler opplysningene på våre vegne og etter våre instrukser:</p>
        <ul>
          <li><strong>Cloudflare</strong>: drift av nettsiden og lagring av bestillinger. Cloudflare er et amerikansk selskap, og overføring ut av EØS skjer etter gjeldende overføringsgrunnlag.</li>
          <li><strong>LINK Mobility</strong>: utsending av SMS med bekreftelse, påminnelse og endringer.</li>
          <li><strong>Resend</strong>: e-post for passordgjenoppretting for ansatte, når dette er tatt i bruk.</li>
        </ul>
        <p>Lenken «Åpne i Google Maps» sender ingen opplysninger til Google før du selv klikker på den.</p>

        <h2>Informasjonskapsler</h2>
        <p>Vi bruker bare det som er nødvendig for at tjenesten skal virke, og derfor ber vi ikke om samtykke:</p>
        <ul>
          <li>en innloggingskapsel for ansatte</li>
          <li>en kortvarig kapsel som viser bekreftelsen på bestillingen din i én time</li>
          <li>språkvalget ditt, lagret i nettleseren</li>
        </ul>
        <p>Vi bruker ingen analyseverktøy, annonser eller sporing.</p>

        <h2>Dine rettigheter</h2>
        <p>Du kan be om innsyn i opplysningene vi har om deg, få feil rettet, få opplysningene slettet eller begrense behandlingen. Du kan også protestere mot behandling som bygger på berettiget interesse. Du kan avbestille timen selv i Vaskestatus eller ved å kontakte oss, og da slettes bestillingen.</p>
        <p>Mener du at vi behandler opplysninger i strid med regelverket, kan du klage til <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer">Datatilsynet</a>. Vi setter pris på om du kontakter oss først.</p>

        <p className={styles.updated}>Sist oppdatert 6. oktober 2026.</p>
        <p><a className={styles.back} href="/">Tilbake til bestilling</a></p>
      </article>
    </main>
  </>;
}
