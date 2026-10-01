'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from './language';
import { dateLabel, today } from '@/lib/schedule';

export function ClosedDates() {
  const { t, language } = useLanguage();
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/api/closed-dates', { signal: controller.signal }).then(async response => {
      const data = await response.json() as { dates: string[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setDates(data.dates); setReady(true);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [retry]);
  async function update(day: string, closed: boolean) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/closed-dates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: day, closed }) });
      const data = await response.json() as { existingBookings: number; error?: string };
      if (!response.ok) throw new Error(data.error);
      setDates(current => closed ? Array.from(new Set([...current, day])).sort() : current.filter(d => d !== day));
      if (closed) setDate('');
      setNotice(closed
        ? data.existingBookings > 0 ? 'Datoen er stengt. Den har allerede bestillinger. Se arbeidslisten og kontakt kundene ved behov.' : 'Datoen er stengt for nye bestillinger.'
        : 'Datoen er åpnet igjen. Vanlig bestillingsperiode og kapasitet gjelder.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Kunne ikke endre datoen. Prøv igjen.'); }
    finally { setBusy(false); }
  }
  return <section className="panel closed-dates">
    <h2>{t('Steng enkeltdager')}</h2>
    <p className="muted">{t('Steng datoer når dere har for få ansatte eller ikke kan tilby bilvask. Eksisterende bestillinger blir ikke avbestilt.')}</p>
    {!ready && !error && <p role="status">{t('Laster…')}</p>}
    {ready && <>
      <form className="close-date-form" onSubmit={e => { e.preventDefault(); void update(date, true); }}>
        <label>{t('Dato')}<input type="date" required min={today()} value={date} disabled={busy} onChange={e => { setDate(e.target.value); setNotice(''); }} /></label>
        <button className="primary" disabled={busy || !date || dates.includes(date)}>{t('Steng dato')}</button>
      </form>
      {date && dates.includes(date) && <p className="muted">{t('Datoen er allerede stengt.')}</p>}
      {dates.length ? <ul className="closed-date-list">{dates.map(day => <li key={day}><span>{dateLabel(day, language)}</span><button className="secondary" disabled={busy} onClick={() => void update(day, false)} aria-label={t('Åpne igjen') + ': ' + dateLabel(day, language)}>{t('Åpne igjen')}</button></li>)}</ul> : <p className="muted">{t('Ingen ekstra stengte datoer.')}</p>}
    </>}
    {error && <p className="error" role="alert">{t(error)} {!ready && <button className="secondary" onClick={() => setRetry(n => n + 1)}>{t('Prøv igjen.')}</button>}</p>}
    {notice && <p className="notice" role="status">{t(notice)}</p>}
  </section>;
}
