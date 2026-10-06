'use client';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from './language';
import {validMapsUrl,mapsUrlError} from '@/lib/maps';
import { ChangedBadge, useSettingsSection } from './settings-save';
import { WEEKDAYS_SAVED } from '@/lib/settings-events';

type Values={weeks:string;insideMinutes:string;outsideMinutes:string;weekdays:number;mapsUrl:string};

export function BookingSettings({mapsOnly=false}:{mapsOnly?:boolean}) {
  const { t } = useLanguage();
  const empty:Values={weeks:'',insideMinutes:'30',outsideMinutes:'30',weekdays:44,mapsUrl:''};
  const [values,setValues]=useState<Values>(empty),[saved,setSaved]=useState<Values>(empty);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const form=useRef<HTMLFormElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/api/booking-settings', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Kunne ikke hente bestillingsinnstillingene.');
      const data = await response.json() as { weeksAhead: number;insideMinutes:number;outsideMinutes:number;weekdays:number;mapsUrl:string };
      const loaded={weeks:String(data.weeksAhead),insideMinutes:String(data.insideMinutes),outsideMinutes:String(data.outsideMinutes),weekdays:data.weekdays,mapsUrl:data.mapsUrl};
      setValues(loaded);setSaved(loaded);setReady(true);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [retry]);
  const dirty=ready&&(mapsOnly?values.mapsUrl!==saved.mapsUrl:values.weeks!==saved.weeks||values.insideMinutes!==saved.insideMinutes||values.outsideMinutes!==saved.outsideMinutes||values.weekdays!==saved.weekdays);
  const store=useSettingsSection(mapsOnly?'maps':'booking',{
    label:mapsOnly?'Finn oss':'Vasketid og bestillingsdager',dirty,
    validate:()=>{
      if(mapsOnly&&!validMapsUrl(values.mapsUrl.trim())){setError(mapsUrlError);return false}
      return form.current?.reportValidity()??true;
    },
    save:async()=>{
      setBusy(true);setError('');
      try{
        const response = await fetch('/api/booking-settings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mapsOnly?{action:'maps',mapsUrl:values.mapsUrl.trim()}:{ weeksAhead: Number(values.weeks),insideMinutes:Number(values.insideMinutes),outsideMinutes:Number(values.outsideMinutes),weekdays:values.weekdays }),
        });
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error);
        const next=mapsOnly?{...saved,mapsUrl:values.mapsUrl.trim()}:{...values,mapsUrl:saved.mapsUrl};
        setSaved(next);setValues(v=>mapsOnly?{...v,mapsUrl:next.mapsUrl}:v);
        // Let other settings (the closed-dates calendar) follow the saved booking days.
        if(!mapsOnly)window.dispatchEvent(new CustomEvent(WEEKDAYS_SAVED,{detail:next.weekdays}));
      }catch(e){setError(e instanceof Error ? e.message : 'Kunne ikke lagre bestillingsinnstillingene.');throw e}
      finally{setBusy(false)}
    },
    reset:()=>{setValues(saved);setError('')},
  });
  const set=(patch:Partial<Values>)=>{setValues(v=>({...v,...patch}));setError('')};
  const submit=(e:React.SubmitEvent<HTMLFormElement>)=>{e.preventDefault();void store?.saveAll()};
  if(mapsOnly)return <section className="panel maps-settings">
    <div className="settings-head maps-settings-heading"><h2>{t('Finn oss')} <ChangedBadge show={dirty}/></h2><p className="muted">{t('Brukes av «Finn oss» på bestillingssiden.')}</p></div>
    <div className="settings-body maps-settings-content">
      {!ready&&!error&&<p role="status">{t('Laster innstillinger…')}</p>}
      {ready&&<form ref={form} noValidate onSubmit={submit}><label>{t('Google Maps-lenke')}<input type="url" required maxLength={2048} disabled={busy} value={values.mapsUrl} aria-invalid={error===mapsUrlError} aria-describedby={error?'maps-url-error':undefined} onChange={e=>set({mapsUrl:e.target.value})} placeholder="https://maps.app.goo.gl/..." /></label></form>}
      {error&&<div id="maps-url-error" className="maps-url-error" role="alert">{error===mapsUrlError?<>
        <strong>{t('Bruk en lenke fra Google Maps')}</strong>
        <p>{t('Åpne stedet i Google Maps, velg «Del» og kopier lenken.')}</p>
        <span className="maps-example-label">{t('Eksempler på godkjente lenker:')}</span>
        <div className="maps-url-examples"><code>https://maps.app.goo.gl/…</code><code>https://www.google.com/maps/…</code></div>
      </>:<p>{t(error)}</p>}{!ready&&<button className="secondary" onClick={()=>setRetry(r=>r+1)}>{t('Prøv igjen')}</button>}</div>}
    </div>
  </section>;
  return <section className="panel settings">
    <div className="settings-head"><h2>{t('Vasketid og bestillingsdager')} <ChangedBadge show={dirty}/></h2>
    <p className="muted">{t('Velg hvor mange uker frem i tid kunder kan bestille bilvask. Perioden regnes fra dagens dato i norsk tid. Eksisterende bestillinger beholdes.')}</p></div>
    <div className="settings-body">
    {!ready && !error && <p role="status">{t('Laster innstillinger…')}</p>}
    {ready && <form ref={form} onSubmit={submit}>
      <label>{t('Antall uker frem i tid')}<input type="number" min="1" max="52" step="1" required disabled={busy} value={values.weeks} onChange={e => set({weeks:e.target.value})} /></label>
      <p className="muted">{t('Velg mellom 1 og 52 uker. Siste dato er inkludert.')}</p>
      <div className="form-grid"><label>{t('Innvendig vask')} · {t('minutter')}<input type="number" required min="15" max="120" step="15" disabled={busy} value={values.insideMinutes} onChange={e=>set({insideMinutes:e.target.value})}/></label><label>{t('Utvendig vask')} · {t('minutter')}<input type="number" required min="15" max="120" step="15" disabled={busy} value={values.outsideMinutes} onChange={e=>set({outsideMinutes:e.target.value})}/></label></div>
      <p className="muted">{t('Velg 15-120 minutter per vask. Ved begge vasker legges tidene sammen. Eksisterende bestillinger beholder vasketiden.')}</p>
      <fieldset className="weekday-settings" disabled={busy}><legend>{t('Dager for bestilling')}</legend>{[[1,'Mandag'],[2,'Tirsdag'],[3,'Onsdag'],[4,'Torsdag'],[5,'Fredag']].map(([day,label])=><label key={day}><input type="checkbox" checked={!!(values.weekdays & (1<<Number(day)))} onChange={()=>set({weekdays:values.weekdays^(1<<Number(day))})}/>{t(String(label))}</label>)}</fieldset>
      <p className="muted">{t(values.weekdays?'Stengte enkeltdager gjelder fortsatt. Eksisterende bestillinger beholdes.':'Ingen ukedager er valgt. Nye bestillinger er stengt.')}</p>
    </form>}
    {error && <p className="error" role="alert">{t(error)} {!ready && <button className="secondary" onClick={() => setRetry(r => r + 1)}>{t('Prøv igjen')}</button>}</p>}
    </div>
  </section>;
}
