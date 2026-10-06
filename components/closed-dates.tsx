'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from './language';
import { blocked, dateLabel, today } from '@/lib/schedule';
import { WEEKDAYS_SAVED } from '@/lib/settings-events';

// A month calendar instead of <input type="date">, so weekdays that are never
// open and dates that are already closed can be shown and disabled.
const MONTHS_AHEAD = 12;
function shiftMonth(month: string, delta: number) {
  const d = new Date(month + '-01T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

export function ClosedDates() {
  const { t, language } = useLanguage();
  const [dates, setDates] = useState<string[]>([]);
  const [weekdays, setWeekdays] = useState(62);
  const [date, setDate] = useState('');
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    Promise.all([
      fetch('/api/closed-dates', { signal: controller.signal }).then(async response => {
        const data = await response.json() as { dates: string[]; error?: string };
        if (!response.ok) throw new Error(data.error);
        return data.dates;
      }),
      fetch('/api/booking-settings', { signal: controller.signal }).then(async response => {
        if (!response.ok) throw new Error('Kunne ikke hente bestillingsinnstillingene.');
        return (await response.json() as { weekdays: number }).weekdays;
      }),
    ]).then(([closed, open]) => { setDates(closed); setWeekdays(open); setReady(true); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [retry]);
  // Follow booking days saved in "Vasketid og bestillingsdager" without a reload.
  useEffect(() => {
    const onSaved = (event: Event) => {
      const open = (event as CustomEvent<number>).detail;
      setWeekdays(open);
      setDate(selected => selected && blocked(selected, open) ? '' : selected);
    };
    window.addEventListener(WEEKDAYS_SAVED, onSaved);
    return () => window.removeEventListener(WEEKDAYS_SAVED, onSaved);
  }, []);
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
  const first = new Date(month + '-01T12:00:00Z');
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const firstMonth = today().slice(0, 7), lastMonth = shiftMonth(firstMonth, MONTHS_AHEAD);
  return <section className="panel closed-dates">
    <div className="settings-head"><h2>{t('Steng enkeltdager')}</h2>
    <p className="muted">{t('Steng datoer når dere har for få ansatte eller ikke kan tilby bilvask. Eksisterende bestillinger blir ikke avbestilt.')}</p></div>
    <div className="settings-body">
    {!ready && !error && <p role="status">{t('Laster…')}</p>}
    {ready && <>
      <div className="calendar-head">
        <strong>{first.toLocaleDateString(language === 'nb' ? 'nb-NO' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong>
        <div>
          <button type="button" aria-label={t('Forrige måned')} disabled={month <= firstMonth} onClick={() => setMonth(m => shiftMonth(m, -1))}>‹</button>{' '}
          <button type="button" aria-label={t('Neste måned')} disabled={month >= lastMonth} onClick={() => setMonth(m => shiftMonth(m, 1))}>›</button>
        </div>
      </div>
      <div className="calendar closed-dates-calendar">
        {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map(d => <span key={d}>{t(d)}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={'blank' + i} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = month + '-' + String(i + 1).padStart(2, '0');
          const closed = dates.includes(d);
          const reason = d < today() ? t('Datoen er passert') : closed ? t('Stengt') : blocked(d, weekdays) ? t('Ikke en bestillingsdag') : '';
          return <button type="button" key={d}
            className={closed && d >= today() ? 'closed-date' : date === d ? 'active' : ''}
            disabled={busy || !!reason}
            aria-pressed={date === d}
            aria-label={dateLabel(d, language) + (reason ? ', ' + reason : '')}
            title={reason || undefined}
            onClick={() => { setDate(d); setNotice(''); setError(''); }}>
            {i + 1}{closed && d >= today() && <small aria-hidden="true">{t('Stengt')}</small>}
          </button>;
        })}
      </div>
      <p className="muted calendar-legend">{t('Overstrøkne dager er ikke bestillingsdager eller er passert. Datoer merket «Stengt» er allerede stengt.')}</p>
      <div className="close-date-form">
        <p className="close-date-selected">{date ? dateLabel(date, language) : t('Velg en dato i kalenderen.')}</p>
        <button type="button" className="primary" disabled={busy || !date} onClick={() => void update(date, true)}>{t('Steng dato')}</button>
      </div>
      {dates.length ? <ul className="closed-date-list">{dates.map(day => <li key={day}><span>{dateLabel(day, language)}</span><button className="secondary" disabled={busy} onClick={() => void update(day, false)} aria-label={t('Åpne igjen') + ': ' + dateLabel(day, language)}>{t('Åpne igjen')}</button></li>)}</ul> : <p className="muted">{t('Ingen ekstra stengte datoer.')}</p>}
    </>}
    {error && <p className="error" role="alert">{t(error)} {!ready && <button className="secondary" onClick={() => setRetry(n => n + 1)}>{t('Prøv igjen')}</button>}</p>}
    {notice && <p className="notice" role="status">{t(notice)}</p>}
    </div>
  </section>;
}
