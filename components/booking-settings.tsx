'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from './language';
import {validMapsUrl,mapsUrlError} from '@/lib/maps';

export function BookingSettings({mapsOnly=false}:{mapsOnly?:boolean}) {
  const { t } = useLanguage();
  const [insideMinutes,setInsideMinutes]=useState('30'),[outsideMinutes,setOutsideMinutes]=useState('30'),[weekdays,setWeekdays]=useState(44);
  const [mapsUrl,setMapsUrl]=useState('');
  const [weeks, setWeeks] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/api/booking-settings', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Kunne ikke hente bestillingsinnstillingene.');
      const data = await response.json() as { largeCarPercent:number;weeksAhead: number;insideMinutes:number;outsideMinutes:number;weekdays:number;mapsUrl:string };
      setMapsUrl(data.mapsUrl);setWeeks(String(data.weeksAhead));setInsideMinutes(String(data.insideMinutes));setOutsideMinutes(String(data.outsideMinutes));setWeekdays(data.weekdays); setReady(true);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [retry]);
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    if(mapsOnly&&!validMapsUrl(mapsUrl.trim())){setError(mapsUrlError);setBusy(false);return;}
    try {
      const response = await fetch('/api/booking-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapsOnly?{action:'maps',mapsUrl:mapsUrl.trim()}:{ weeksAhead: Number(weeks),insideMinutes:Number(insideMinutes),outsideMinutes:Number(outsideMinutes),weekdays }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error);
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Kunne ikke lagre bestillingsinnstillingene.'); }
    finally { setBusy(false); }
  }
  if(mapsOnly)return <section className="panel maps-settings">
    <div className="maps-settings-heading"><h2>{t('Finn oss')}</h2><p className="muted">{t('Brukes av «Finn oss» på bestillingssiden.')}</p></div>
    <div className="maps-settings-content">
      {!ready&&!error&&<p role="status">{t('Laster innstillinger…')}</p>}
      {ready&&<form noValidate onSubmit={save}><label>{t('Google Maps-lenke')}<input type="url" required maxLength={2048} disabled={busy} value={mapsUrl} aria-invalid={error===mapsUrlError} aria-describedby={error?'maps-url-error':undefined} onChange={e=>{setMapsUrl(e.target.value);setSaved(false);setError('')}} placeholder="https://maps.app.goo.gl/..." /></label><button className="primary" disabled={busy}>{t(busy?'Lagrer…':'Lagre lenke')}</button></form>}
      {error&&<div id="maps-url-error" className="maps-url-error" role="alert">{error===mapsUrlError?<>
        <strong>{t('Bruk en lenke fra Google Maps')}</strong>
        <p>{t('Åpne stedet i Google Maps, velg «Del» og kopier lenken.')}</p>
        <span className="maps-example-label">{t('Eksempler på godkjente lenker:')}</span>
        <div className="maps-url-examples"><code>https://maps.app.goo.gl/…</code><code>https://www.google.com/maps/…</code></div>
      </>:<p>{t(error)}</p>}{!ready&&<button className="secondary" onClick={()=>setRetry(r=>r+1)}>{t('Prøv igjen.')}</button>}</div>}
      {saved&&<p className="success" role="status">{t('Innstillingene er lagret.')}</p>}
    </div>
  </section>;
  return <section className="panel settings">
    <h2>{t(mapsOnly?'Google Maps-lenke':'Vasketid og bestillingsdager')}</h2>
    {!mapsOnly&&<p className="muted">{t('Velg hvor mange uker frem i tid kunder kan bestille bilvask. Perioden regnes fra dagens dato i norsk tid. Eksisterende bestillinger beholdes.')}</p>}
    {!ready && !error && <p role="status">{t('Laster innstillinger…')}</p>}
    {ready && <form onSubmit={save}>
      {!mapsOnly&&<><label>{t('Antall uker frem i tid')}<input type="number" min="1" max="52" step="1" required disabled={busy} value={weeks} onChange={e => { setWeeks(e.target.value); setSaved(false); }} /></label>
      <p className="muted">{t('Velg mellom 1 og 52 uker. Siste dato er inkludert.')}</p>
      <div className="form-grid"><label>{t('Innvendig vask')} · {t('minutter')}<input type="number" required min="15" max="120" step="15" disabled={busy} value={insideMinutes} onChange={e=>{setInsideMinutes(e.target.value);setSaved(false)}}/></label><label>{t('Utvendig vask')} · {t('minutter')}<input type="number" required min="15" max="120" step="15" disabled={busy} value={outsideMinutes} onChange={e=>{setOutsideMinutes(e.target.value);setSaved(false)}}/></label></div>
      <p className="muted">{t('Velg 15-120 minutter per vask. Ved begge vasker legges tidene sammen. Eksisterende bestillinger beholder vasketiden.')}</p>
      <fieldset className="weekday-settings" disabled={busy}><legend>{t('Dager for bestilling')}</legend>{[[1,'Mandag'],[2,'Tirsdag'],[3,'Onsdag'],[4,'Torsdag'],[5,'Fredag']].map(([day,label])=><label key={day}><input type="checkbox" checked={!!(weekdays & (1<<Number(day)))} onChange={()=>{setWeekdays(v=>v^(1<<Number(day)));setSaved(false)}}/>{t(String(label))}</label>)}</fieldset>
      <p className="muted">{t(weekdays?'Stengte enkeltdager gjelder fortsatt. Eksisterende bestillinger beholdes.':'Ingen ukedager er valgt. Nye bestillinger er stengt.')}</p>
      </>}{mapsOnly&&<><label>{t('Google Maps-lenke')}<input type="url" required maxLength={2048} disabled={busy} value={mapsUrl} onChange={e=>{setMapsUrl(e.target.value);setSaved(false)}} placeholder="https://maps.app.goo.gl/..." /></label><p className="muted">{t('Brukes av «Finn oss» på bestillingssiden.')}</p></>}
      <button className="primary" disabled={busy}>{t(busy ? 'Lagrer…' : 'Lagre innstillinger')}</button>
    </form>}
    {error && <p className="error" role="alert">{t(error)} {!ready && <button className="secondary" onClick={() => setRetry(r => r + 1)}>{t('Prøv igjen.')}</button>}</p>}
    {saved && <p className="success" role="status">{t('Innstillingene er lagret.')}</p>}
  </section>;
}
