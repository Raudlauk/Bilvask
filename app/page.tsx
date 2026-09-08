'use client';
import { useLanguage, LanguagePicker } from '@/components/language';
import { useState, useEffect } from 'react';
import { today, blocked, timeLabel, dateLabel } from '@/lib/schedule';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Droplets,
  Sparkles,
  ArrowUpRight,
  Clock3,
  ShieldCheck,
} from 'lucide-react';
export default function Home() {
 const {t,language}=useLanguage();
  const [inside, setInside] = useState(false),
    [outside, setOutside] = useState(true);
  return (
    <>
      <header>
<div className="header-identity"><a href="https://ynvekst.no/" aria-label="Ytre Namdal Vekst"><img className="yn-logo" src="/yn-vekst-logo.svg" width="174" height="55" alt="Ytre Namdal Vekst" /></a>
        <a className="brand" href="/">
          <Droplets /> Steam<span>{t("BILVASK")}</span>
        </a>
        </div><div className="header-tools"><LanguagePicker /><a className="worker-link" href="/admin"> {t("Ansattinnlogging")} <ArrowUpRight size={16} />
        </a>
      </div></header>
      <main>
        <div className="intro">
          <div className="eyebrow">{t("EN FRISK START FOR BILEN")}</div>
          <h1> {t("En ren bil.")} <br />
            <span>{t("Et tidspunkt som passer deg.")}</span>
          </h1>
          <p>{t("Velg vask og tidspunkt, så ordner vi resten.")}</p>
        </div>
        <div className="booking-layout">
          <section className="panel">
            <div className="section-title">
              <b>01</b>
              <h2>{t("Velg bilvask")}</h2>
              <span>{t("Velg én eller begge")}</span>
            </div>
            <div className="services">
              {[
                {
                  id: 'outside',
                  name: t("Utvendig vask"),
                  detail: t("Skinnende ren, fra tak til dekk."),
                  icon: Droplets,
                  checked: outside,
                  set: setOutside,
                },
                {
                  id: 'inside',
                  name: t("Innvendig vask"),
                  detail: t("En ren kupé for kjøreturen videre."),
                  icon: Sparkles,
                  checked: inside,
                  set: setInside,
                },
              ].map((s) => (
                <label
                  key={s.id}
                  className={'service ' + (s.checked ? 'selected' : '')}
                >
                  <div className="service-top">
                    <s.icon size={30} />
                    <Checkbox
                      checked={s.checked}
                      onCheckedChange={s.set}
                      aria-label={s.name}
                    />
                  </div>
                  <h3>{s.name}</h3>
                  <p>{s.detail}</p>
                  <span>
                    <Clock3 size={15} /> {t("30 minutter")} </span>
                </label>
              ))}
            </div>
            <div className="section-title">
              <b>02</b>
              <h2>{t("Velg dato og tidspunkt")}</h2>
            </div>
            <p className="notice"> {t("Du kan bestille bilvask tirsdag, onsdag og fredag. Mandag og torsdag er reservert. Stengt lørdag og søndag., og vi holder stengt i helgene.")} </p>
            <Booking inside={inside} outside={outside} />
          </section>
          <aside>
            <div className="summary">
              <div className="eyebrow">{t("DIN NESTE BILVASK")}</div>
              <h2> {t("Litt omtanke.")} <br /> {t("Stor forskjell.")} </h2>
              <div className="summary-row">
                <span>{t("Valgt vask")}</span>
                <strong>
                  {inside && outside
                    ? t("Innvendig og utvendig")
                    : inside
                      ? t("Innvendig vask")
                      : outside
                        ? t("Utvendig vask")
                        : t("Velg vask")}
                </strong>
              </div>
              <div className="summary-row">
                <span>{t("Samlet tid")}</span>
                <strong>
                  {30 * (Number(inside) + Number(outside))} {t("minutter")} </strong>
              </div>
              <div className="summary-foot">
                <ShieldCheck />
                <p> {t("Timen din blir reservert")} <br /> {t("så snart du bestiller.")} </p>
              </div>
            </div>
            <div className="hours">
              <Clock3 size={20} />
              <div>
                <strong>{t("Åpningstider")}</strong>
                <p> {t("08:00–15:00 · norsk tid")} <br /> {t("Siste starttid kl. 14:00")} <br />{t('Pause 11:30–12:00')}<br />{t('Maks. 4 biler per dag: 2 før pausen og 2 etter.')}<br /> {t("Mandag og torsdag er reservert. Stengt lørdag og søndag.")} </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <footer>
        <span>{t("Steam / BILVASK")}</span>
        <span>{t("En renere bil starter her.")}</span>
      </footer>
    </>
  );
}
function Booking({ inside, outside }: { inside: boolean; outside: boolean }) {
 const {t,language}=useLanguage();
  const [month, setMonth] = useState(() => today().slice(0, 7)),
    [date, setDate] = useState(''),
    [start, setStart] = useState<number | null>(null),
    [slots, setSlots] = useState<number[]>([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [name, setName] = useState(''),
    [phone, setPhone] = useState(''),
    [revision, setRevision] = useState(0),
    [confirmation, setConfirmation] = useState<any>(null);
  const duration = (Number(inside) + Number(outside)) * 30;
  useEffect(() => {
    setStart(null);
    setSlots([]);
    if (!date || !duration) {setLoading(false);return;}
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/availability?date=${date}&duration=${duration}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const b = (await r.json()) as { error?: string; slots: number[] };
        if (!r.ok) throw new Error(b.error);
        setSlots(b.slots);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, duration, revision]);
  const first = new Date(month + '-01T12:00:00Z'),
    offset = (first.getUTCDay() + 6) % 7,
    days = new Date(
      first.getUTCFullYear(),
      first.getUTCMonth() + 1,
      0,
    ).getDate();
  function move(delta: number) {
    const d = new Date(first);
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMonth(d.toISOString().slice(0, 7));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, date, start, inside, outside }),
      });
      const b = (await r.json()) as {
        error?: string;
        id: string;
        name: string;
        date: string;
        start: number;
        duration: number;
        inside: boolean;
        outside: boolean;
      };
      if (!r.ok) {
        if (r.status === 409) {
          setSlots([]);
          setStart(null);
          setRevision(r=>r+1);
        }
        throw new Error(b.error);
      }
      setConfirmation(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Prøv igjen."));
    } finally {
      setBusy(false);
    }
  }
  if (confirmation)
    return (
      <div className="success" role="status">
        <ShieldCheck size={35} />
        <h2>{t("Timen er bestilt,")} {confirmation.name}.</h2>
        <p>
          {dateLabel(confirmation.date, language)} · {timeLabel(confirmation.start)}–
          {timeLabel(confirmation.start + confirmation.duration)}
        </p>
        <p>
          {confirmation.inside && confirmation.outside
            ? t("Innvendig og utvendig vask")
            : confirmation.inside
              ? t("Innvendig vask")
              : t("Utvendig vask")}{' '}
          · {confirmation.duration} {t("minutter")} </p>
        <p className="muted"> {t("Alle klokkeslett er i norsk tid. Ta vare på bestillingsdetaljene.")} </p>
        <button
          className="secondary"
          onClick={() => {
            setConfirmation(null);
            setName('');
            setPhone('');
            setStart(null);
            setRevision((r) => r + 1);
          }}
        > {t("Bestill en ny vask")} </button>
      </div>
    );
  return (
    <form onSubmit={submit}>
      <div className="calendar-head">
        <strong>
          {first.toLocaleDateString(language === 'nb' ? 'nb-NO' : 'en-GB', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </strong>
        <div>
          <button
            type="button"
            aria-label={t("Forrige måned")}
            disabled={month <= today().slice(0, 7)}
            onClick={() => move(-1)}
          >
            ‹
          </button>{' '}
          <button
            type="button"
            aria-label={t("Neste måned")}
            onClick={() => move(1)}
          >
            ›
          </button>
        </div>
      </div>
      <div className="calendar">
        {[t("Man"), t("Tir"), t("Ons"), t("Tor"), t("Fre"), t("Lør"), t("Søn")].map((d) => (
          <span key={d}>{d}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={'blank' + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = month + '-' + String(i + 1).padStart(2, '0');
          return (
            <button
              type="button"
              key={d}
              className={date === d ? 'active' : ''}
              disabled={d < today() || blocked(d)}
              aria-pressed={date === d}
              aria-label={dateLabel(d, language) + (blocked(d) ? t(", reservert") : '')}
              onClick={() => setDate(d)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="muted">
        {date ? dateLabel(date, language) : t("Velg en ledig dato ovenfor.")} · {t('norsk tid')}
      </p>
      {loading ? (
        <p role="status">{t("Henter ledige tider…")}</p>
      ) : date && duration > 0 ? (
        <>
          <div className="slots">
            {slots.map((s) => (
              <button
                className={'slot ' + (start === s ? 'active' : '')}
                key={s}
                type="button"
                aria-pressed={start === s}
                onClick={() => setStart(s)}
              >
                {timeLabel(s)}–{timeLabel(s + duration)}
              </button>
            ))}
          </div>
          {!slots.length && !error && (
            <p className="notice"> {t("Ingen ledige tider for denne vasken. Velg en annen dato.")} </p>
          )}
        </>
      ) : null}
      {!duration && (
        <p className="notice">{t("Velg minst én vask for å se ledige tider.")}</p>
      )}
      <div className="section-title">
        <b>03</b>
        <h2>{t("Dine opplysninger")}</h2>
      </div>
      <div className="form-grid">
        <label> {t("Fullt navn")} <input
            required
            autoComplete="name"
            maxLength={100}
            placeholder={t("Navnet ditt")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label> {t("Telefonnummer")} <input
            required
            type="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder={t("Telefonnummeret ditt")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <div role="alert" className="error">
          {t(error)}{' '}
          <button
            type="button"
            className="secondary"
            onClick={() => setRevision((r) => r + 1)}
          > {t("Oppdater tider")} </button>
        </div>
      )}
      <button
        className="primary book-submit"
        disabled={busy || loading || start === null || !duration}
        type="submit"
      >
        <span>{busy ? t("Bekrefter…") : t("Bekreft bestilling")}</span>
        <span>{duration} min →</span>
      </button>
      <p className="muted">
        {start === null
          ? t("Velg et tidspunkt for å fullføre bestillingen.")
          : `${dateLabel(date, language)} · ${timeLabel(start)}–${timeLabel(start + duration)}`}
      </p>
    </form>
  );
}
