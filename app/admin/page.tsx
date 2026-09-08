'use client';
import { ContactSection } from '@/components/contact';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import { useLanguage, LanguagePicker } from '@/components/language';
import { useState, useEffect, useRef } from 'react';
import { Droplets, ArrowLeft, CalendarDays, RefreshCw } from 'lucide-react';
import { today, dateLabel, timeLabel } from '@/lib/schedule';
type Job = {
  id: string;
  name: string;
  phone: string;
  date: string;
  start: number;
  duration: number;
  inside: number;
  outside: number;
};
export default function Admin() {
 const {t,language}=useLanguage();
 const activeRequest = useRef<AbortController | null>(null);
 const [requiresPasswordChange,setRequiresPasswordChange]=useState(false);
 const [cancelJob,setCancelJob]=useState<Job|null>(null),[cancelError,setCancelError]=useState(''),[cancelBusy,setCancelBusy]=useState(false),[cancelNotice,setCancelNotice]=useState('');
 async function cancelBooking(){if(!cancelJob)return;setCancelBusy(true);setCancelError('');try{
   const response=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel-booking',id:cancelJob.id})});
   const data=await response.json() as {error?:string};
   if(!response.ok){if(response.status===401){setLogged(false);setJobs([]);setCancelJob(null)}throw new Error(data.error)}
   setJobs(rows=>rows.filter(row=>row.id!==cancelJob.id));setCancelJob(null);setCancelNotice('Bestillingen er avbestilt. Tidspunktet og plassen er ledige igjen.');await load();
 }catch(e){setCancelError(e instanceof Error?e.message:'Kunne ikke avbestille. Prøv igjen.')}finally{setCancelBusy(false)}}
  const [logged, setLogged] = useState(false),
    [checking, setChecking] = useState(true),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [date, setDate] = useState(''),
    [jobs, setJobs] = useState<Job[]>([]),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [settings, setSettings] = useState(false),
    [current, setCurrent] = useState(''),
    [newPassword, setNewPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  async function load() {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setChecking(true);
    setError('');
    try {
      const r = await fetch('/api/admin' + (date ? '?date=' + date : ''), {signal:controller.signal});
      const b = (await r.json()) as {
        error?: string;
        username: string;
        bookings: Job[];
        requiresPasswordChange?: boolean;
      };
      if (r.status === 401) {
        setLogged(false);
        return;
      }
      if (!r.ok) throw new Error(b.error);
      setLogged(true);
      setUsername(b.username);
      setJobs(b.bookings);
      setRequiresPasswordChange(!!b.requiresPasswordChange);
      if(b.requiresPasswordChange) setSettings(true);
    } catch (e) {
      if(controller.signal.aborted) return;
      setError(
        e instanceof Error ? e.message : t("Kunne ikke laste arbeidslisten."),
      );
    } finally {
      if(!controller.signal.aborted) setChecking(false);
    }
  }
  useEffect(() => {
    load();
    return () => activeRequest.current?.abort();
  }, [date]);
  async function action(action: string, extra: Record<string, string> = {}) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const b = (await r.json()) as {
        error?: string;
        username: string;
        bookings: Job[];
      };
      if(r.status === 401 && action !== 'login'){setLogged(false);setJobs([]);}
      if (!r.ok) throw new Error(b.error);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Prøv igjen."));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (await action('login', { username, password })) {
      setPassword('');
      await load();
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError(t("De nye passordene er ikke like."));
      return;
    }
    if (
      await action('credentials', {
        username,
        password: newPassword,
        currentPassword: current,
      })
    ) {
      setLogged(false);
      setSettings(false);
      setCurrent('');
      setNewPassword('');
      setConfirm('');
      setMessage(
        t("Innloggingen er oppdatert. Logg inn med det nye brukernavnet og passordet."),
      );
    }
  }
  return (
    <>
      <header>
<div className="header-identity"><a href="https://ynvekst.no/" aria-label="Ytre Namdal Vekst"><img className="yn-logo" src="/yn-vekst-logo.svg" width="174" height="55" alt="Ytre Namdal Vekst" /></a>
        <a className="brand" href="/">
          <Droplets /> Steam<span>{t("ANSATTSIDE")}</span>
        </a>
        </div><div className="header-tools"><LanguagePicker /><a href="/" className="worker-link">
          <ArrowLeft size={16} /> {t("Tilbake til bestilling")} </a>
      </div></header>
      <main className="admin-wrap">
        {logged&&cancelNotice&&<p className="success" role="status">{t(cancelNotice)}</p>}
        {checking && !logged ? (
          <p role="status">{t("Laster ansattsiden…")}</p>
        ) : !logged ? (
          <section className="panel login">
            <div className="eyebrow">{t("ANSATTSIDE")}</div>
            <h1>{t("Velkommen tilbake.")}</h1>
            <p className="muted">{t("Logg inn for å se bestilte bilvasker.")}</p>
            {message && (
              <p className="success" role="status">
                {t(message)}
              </p>
            )}
            <form onSubmit={login}>
              <label> {t("Brukernavn")} <input
                  autoComplete="username"
                  required
                  maxLength={50}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label> {t("Passord")} <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error && (
                <p className="error" role="alert">
                  {t(error)}
                </p>
              )}
              <button className="primary" disabled={busy}>
                {' '}
                {busy ? t("Logger inn…") : t("Logg inn →")}
              </button>
            </form>
          </section>
        ) : (
          <>
            <div className="admin-top">
              <div>
                <div className="eyebrow">{t("ANSATTSIDE")}</div>
                <h1>
                  {settings ? t("Innloggingsinnstillinger") : t("Arbeidsliste")}
                </h1>
                <p className="muted">
                  {settings
                    ? t("Endre den felles innloggingen for ansatte.")
                    : t("Bestilte bilvasker i tidsrekkefølge. Alle klokkeslett er i norsk tid.")}
                </p>
              </div>
              <div className="admin-actions">
                <button
                  className="secondary"
                  disabled={requiresPasswordChange}
                  onClick={() => {
                    setSettings(!settings);
                    setError('');
                  }}
                >
                  {settings
                    ? t("Tilbake til arbeidslisten")
                    : t("Innloggingsinnstillinger")}
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={async () => {
                    if (await action('logout')) {
                      setLogged(false);
                      setJobs([]);
                    }
                  }}
                > {t("Logg ut")} </button>
              </div>
            </div>
            {error && (
              <p className="error" role="alert">
                {t(error)}
              </p>
            )}
            {requiresPasswordChange && <p className="notice" role="status">{t('Bytt standardpassordet før du åpner kundelisten. Velg et unikt passord på minst 8 tegn.')}</p>}
            {settings ? (
              <form className="panel settings" onSubmit={save}>
                <h2>{t("Endre innlogging")}</h2>
                <label> {t("Brukernavn")} <input
                    required
                    maxLength={50}
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
                <label> {t("Nåværende passord")} <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                  />
                </label>
                <label> {t("Nytt passord")} <input
                    required
                    minLength={8}
                    maxLength={200}
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </label>
                <label> {t("Bekreft nytt passord")} <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
                <p className="muted"> {t("Bruk minst 8 tegn. Alle ansatte blir logget ut når innloggingen endres.")} </p>
                <button className="primary" disabled={busy}>
                  {busy ? t("Lagrer…") : t("Lagre innlogging")}
                </button>
              </form>
            ) : (
              <>
                <div
                  className="admin-actions"
                  style={{
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <label> {t("Vis dato")}{' '}
                    <input
                      aria-label={t("Dato for arbeidslisten")}
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{ width: 190, marginLeft: 8 }}
                    />
                  </label>
                  <button
                    className="secondary"
                    onClick={() => setDate(today())}
                  > {t("I dag")} </button>
                  <button className="secondary" onClick={() => setDate('')}> {t("Alle kommende")} </button>
                  <button
                    className="secondary"
                    onClick={load}
                    aria-label={t("Oppdater arbeidslisten")}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
                <p className="muted">
                  {date ? dateLabel(date, language) : t("Kommende bestillinger")} ·{' '}
                  {jobs.length} {jobs.length === 1 ? t("bilvask") : t("bilvasker")} ·{' '}
                  {jobs.reduce((n, j) => n + j.duration, 0)} {t("minutter")} </p>
                {checking ? (
                  <p role="status">{t("Oppdaterer arbeidslisten…")}</p>
                ) : jobs.length ? (
                  <div className="jobs">
                    {jobs.map((j) => (
                      <article key={j.id} className="job">
                        <div className="job-time">
                          {timeLabel(j.start)}–{timeLabel(j.start + j.duration)}
                          <small>{dateLabel(j.date, language)}</small>
                        </div>
                        <div>
                          <h3>{j.name}</h3>
                          <p>
                            {j.inside && j.outside
                              ? t("Innvendig og utvendig vask")
                              : j.inside
                                ? t("Innvendig vask")
                                : t("Utvendig vask")}{' '}
                            · {j.duration} {t("minutter")} </p>
                        </div>
                        <a href={'tel:' + j.phone.replace(/[^+\d]/g, '')}>
                          {j.phone}
                        </a>
                        <button className="secondary cancel-booking" onClick={()=>{setCancelJob(j);setCancelError('');setCancelNotice('')}}>{t('Avbestill')}</button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="panel">
                    <CalendarDays size={32} />
                    <h2> {t("Ingen bestillinger")} {date ? t("på denne datoen") : t("ennå")}.
                    </h2>
                    <p className="muted"> {t("Nye bestillinger av bilvask vises her.")} </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
        {logged && !requiresPasswordChange && <ContactSection edit />}
      </main>
      <AlertDialog open={!!cancelJob} onOpenChange={open=>{if(!open&&!cancelBusy)setCancelJob(null)}}>
        <AlertDialogContent className="cancel-dialog">
          <AlertDialogHeader><AlertDialogTitle>{t('Avbestille denne bilvasken?')}</AlertDialogTitle><AlertDialogDescription>{cancelJob&&<>{cancelJob.name}<br/>{dateLabel(cancelJob.date,language)} · {timeLabel(cancelJob.start)}–{timeLabel(cancelJob.start+cancelJob.duration)}<br/></>}{t('Bestillingen fjernes, og plassen blir tilgjengelig for andre.')}</AlertDialogDescription></AlertDialogHeader>
          {cancelError&&<p className="error" role="alert">{t(cancelError)}</p>}
          <AlertDialogFooter><AlertDialogCancel className="secondary" disabled={cancelBusy}>{t('Behold bestillingen')}</AlertDialogCancel><AlertDialogAction className="primary" disabled={cancelBusy} onClick={cancelBooking}>{t(cancelBusy?'Avbestiller…':'Bekreft avbestilling')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
