'use client';
import styles from './admin.module.css';
import {StatusSettings} from '@/components/status-settings';
import {WashProgress} from '@/components/wash-progress';
import {PolishSettings} from '@/components/polish-settings';
import {UserManager} from '@/components/user-manager';
import {RecoveryEmail} from '@/components/recovery-email';
import { BookingSettings } from '@/components/booking-settings';
import { ClosedDates } from '@/components/closed-dates';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ContactSection } from '@/components/contact';
import {PriceEditor} from '@/components/price-editor';
import {money} from '@/lib/prices';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import { useLanguage, LanguagePicker } from '@/components/language';
import { useState, useEffect, useRef } from 'react';
import { Droplets, ArrowLeft, CalendarDays, RefreshCw } from 'lucide-react';
import { today, dateLabel, timeLabel } from '@/lib/schedule';
type Job = { status:number;
  polish:number;
  status_code:string;
  large_car:number;
  id: string;
  name: string;
  phone: string;
  date: string;
  start: number;
  duration: number;
  inside: number;
  outside: number;
  fluid:number;
  price:number|null;
};
export default function Admin() {
 const {t,language}=useLanguage();
 const activeRequest = useRef<AbortController | null>(null);
 const [statusEnabled,setStatusEnabled]=useState(false);
 const [role,setRole]=useState<'admin'|'viewer'|'manager'>('viewer');
 const [requiresPasswordChange,setRequiresPasswordChange]=useState(false);
 const [durationJob,setDurationJob]=useState<Job|null>(null),[editMinutes,setEditMinutes]=useState(''),[durationBusy,setDurationBusy]=useState(false),[durationError,setDurationError]=useState('');
 async function saveDuration(e:React.SubmitEvent<HTMLFormElement>){e.preventDefault();if(!durationJob||role==='viewer')return;setDurationBusy(true);setDurationError('');try{const r=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'duration',id:durationJob.id,duration:Number(editMinutes),expectedDuration:durationJob.duration})});const b=await r.json() as {error?:string};if(!r.ok)throw new Error(b.error);setDurationJob(null);setCancelNotice('Vasketiden er oppdatert.');await load()}catch(e){setDurationError(e instanceof Error?e.message:'Prøv igjen.')}finally{setDurationBusy(false)}}
 const [rescheduleJob,setRescheduleJob]=useState<Job|null>(null),[editDate,setEditDate]=useState(''),[editStart,setEditStart]=useState(''),[rescheduleBusy,setRescheduleBusy]=useState(false),[rescheduleError,setRescheduleError]=useState('');
 function minutesFromTime(value:string){const match=value.match(/^(\d{2}):(\d{2})$/);return match?Number(match[1])*60+Number(match[2]):-1}
 async function saveReschedule(e:React.SubmitEvent<HTMLFormElement>){e.preventDefault();if(!rescheduleJob||role==='viewer')return;setRescheduleBusy(true);setRescheduleError('');try{const r=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reschedule',id:rescheduleJob.id,date:editDate,start:minutesFromTime(editStart),expectedDate:rescheduleJob.date,expectedStart:rescheduleJob.start})});const b=await r.json() as {error?:string;smsWarning?:string};if(!r.ok)throw new Error(b.error);setRescheduleJob(null);setCancelNotice(b.smsWarning?`Timen er flyttet. ${b.smsWarning}`:'Timen er flyttet, og kunden har fått SMS om endringen.');await load()}catch(e){setRescheduleError(e instanceof Error?e.message:'Prøv igjen.')}finally{setRescheduleBusy(false)}}
 const [cancelJob,setCancelJob]=useState<Job|null>(null),[cancelError,setCancelError]=useState(''),[cancelBusy,setCancelBusy]=useState(false),[cancelNotice,setCancelNotice]=useState('');
 async function cancelBooking(){if(!cancelJob||role==='viewer')return;setCancelBusy(true);setCancelError('');try{
   const response=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel-booking',id:cancelJob.id})});
   const data=await response.json() as {error?:string;smsWarning?:string};
   if(!response.ok){if(response.status===401){setLogged(false);setJobs([]);setCancelJob(null)}throw new Error(data.error)}
   setJobs(rows=>rows.filter(row=>row.id!==cancelJob.id));setCancelJob(null);setCancelNotice(data.smsWarning?`Bestillingen er avbestilt. ${data.smsWarning}`:'Bestillingen er avbestilt. Kunden har fått SMS, og tidspunktet er ledig igjen.');await load();
 }catch(e){setCancelError(e instanceof Error?e.message:'Kunne ikke avbestille. Prøv igjen.')}finally{setCancelBusy(false)}}
  const [logged, setLogged] = useState(false),
    [bookingSettings, setBookingSettings] = useState(false),
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
  async function load({background=false}: {background?:boolean} = {}) {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    if(!background) setChecking(true);
    setError('');
    try {
      const r = await fetch('/api/admin' + (date ? '?date=' + date : ''), {signal:controller.signal});
      const b = (await r.json()) as {
        error?: string;
        username: string;
        bookings: Job[];statusEnabled:boolean;
        requiresPasswordChange?: boolean;
        role:'admin'|'viewer'|'manager';
      };
      if (r.status === 401) {
        setLogged(false);
        return;
      }
      if (!r.ok) throw new Error(b.error);
      setStatusEnabled(b.statusEnabled);setRole(b.role);
      if(b.role==='viewer'){setCancelJob(null);setDurationJob(null);setRescheduleJob(null);}
      if(b.role!=='admin'){setSettings(false);setBookingSettings(false);setCurrent('');setNewPassword('');setConfirm('');}
      setLogged(true);
      setUsername(b.username);
      setJobs(b.bookings);
      setRequiresPasswordChange(!!b.requiresPasswordChange);
      if(b.requiresPasswordChange) { setSettings(true); setBookingSettings(false); }
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
    void load();
    return () => activeRequest.current?.abort();
    // load is recreated each render and reads date; re-running on date alone is intended.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
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
        bookings: Job[];statusEnabled:boolean;
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
  async function login(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (await action('login', { username, password })) {
      setPassword('');
      setSettings(false);
      setBookingSettings(false);
      await load();
    }
  }
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
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
    <div className={styles.page}>
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
            <p style={{marginTop:24}}><a href="/reset-password">{t("Glemt passord?")}</a></p>
          </section>
        ) : (
          <>
            <div className="admin-top">
              <div>
                <div className="eyebrow">{t("ANSATTSIDE")}</div>
                <h1>
                  {bookingSettings ? t('Bestillingsinnstillinger') : settings ? t("Innloggingsinnstillinger") : t("Arbeidsliste")}
                </h1>

              </div>
              <div className="admin-actions">
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
                <p className="muted admin-description">
                  {bookingSettings ? t('Bestillingsperiode, priser og kontaktinformasjon.') : settings
                    ? t("Administrer innlogging og tilgang.")
                    : t("Bestilte bilvasker i tidsrekkefølge. Alle klokkeslett er i norsk tid.")}
                </p>
            </div>
            <Tabs className="admin-tabs" value={bookingSettings ? 'booking' : settings ? 'login' : 'jobs'} onValueChange={value => { setBookingSettings(value === 'booking'); setSettings(value === 'login'); setError(''); }}>
              {role==='admin'&&<TabsList aria-label={t('Ansattside')}>
                <TabsTrigger value="jobs" disabled={requiresPasswordChange}>{t('Arbeidsliste')}</TabsTrigger>
                <TabsTrigger value="login" aria-label={t('Innloggingsinnstillinger')}><span className="tab-label-wide">{t('Innloggingsinnstillinger')}</span><span className="tab-label-mobile" aria-hidden="true">{t('Tilgang')}</span></TabsTrigger>
                <TabsTrigger value="booking" disabled={requiresPasswordChange} aria-label={t('Bestillingsinnstillinger')}><span className="tab-label-wide">{t('Bestillingsinnstillinger')}</span><span className="tab-label-mobile" aria-hidden="true">{t('Bestilling')}</span></TabsTrigger>
              </TabsList>}
              {role==='admin'&&<TabsContent value="booking">
                {!requiresPasswordChange && <><div className="admin-settings-grid"><div className="service-settings-column"><BookingSettings /><StatusSettings /><ClosedDates /></div><div className="service-settings-column"><PriceEditor /><PolishSettings /></div></div><ContactSection edit /><BookingSettings mapsOnly /></>}
              </TabsContent>}

            {error && (
              <p className="error" role="alert">
                {t(error)}
              </p>
            )}
            {role==='admin'&&<TabsContent value="login">
              {requiresPasswordChange && <p className="notice" role="status">{t('Bytt standardpassordet før du åpner kundelisten. Velg et unikt passord på minst 8 tegn.')}</p>}
              <div className="admin-settings-grid">
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
                <p className="muted"> {t("Bruk minst 8 tegn. Administratorøkter avsluttes når innloggingen endres.")} </p>
                <button className="primary" disabled={busy}>
                  {busy ? t("Lagrer…") : t("Lagre innlogging")}
                </button>
              </form>
              {!requiresPasswordChange && <RecoveryEmail />}
              </div>
              {!requiresPasswordChange&&<UserManager />}
            </TabsContent>}
            <TabsContent value="jobs">
              <>
                <div
                  className="admin-actions schedule-filters"
                >
                  <label> {t("Vis dato")}{' '}
                    <input
                      aria-label={t("Dato for arbeidslisten")}
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      
                    />
                  </label>
                  <button
                    className="secondary"
                    aria-pressed={date === today()}
                    onClick={() => setDate(today())}
                  > {t("I dag")} </button>
                  <button className="secondary" aria-pressed={!date} onClick={() => setDate('')}> {t("Alle kommende")} </button>
                  <button
                    className="secondary"
                    onClick={()=>void load()}
                    aria-label={t("Oppdater arbeidslisten")}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
                <div className="schedule-summary"><strong>{date ? dateLabel(date, language) : t("Kommende bestillinger")}</strong><span>{jobs.length} {jobs.length === 1 ? t("bilvask") : t("bilvasker")} · {jobs.reduce((n, j) => n + j.duration, 0)} {t("minutter")}</span></div>
                {checking ? (
                  <p role="status">{t("Oppdaterer arbeidslisten…")}</p>
                ) : jobs.length ? (
                  <div className="jobs">
                    {jobs.map((j) => (
                      <article key={j.id} className="job job-card">
                        <div className="job-time">
                          {timeLabel(j.start)}-{timeLabel(j.start + j.duration)}
                          <small>{dateLabel(j.date, language)}</small>
                        </div>
                        <div>
                          <h3>{j.name}</h3>
                          <p>
                            {j.inside && j.outside
                              ? t("Innvendig og utvendig vask")
                              : j.inside
                                ? t("Innvendig vask")
                                : j.outside?t("Utvendig vask"):t('Bilpolering')}{' '}
                            · {j.duration} {t("minutter")} </p>
                          {j.polish===1&&!!(j.inside||j.outside)&&<p className="fluid-tag">{t('Bilpolering')}</p>}{j.large_car===1&&<p className="fluid-tag">{t('Stor bil eller veldig skitten bil')}</p>}{j.fluid===1&&<p className="fluid-tag">{t('Påfyll av spylervæske')}</p>}
                          <p>{t('Totalpris')}: {j.price==null?t('Pris avtales'):money(j.price,language)}</p>
                          <p className="job-booking-code">{t('Bestillingskode')} <code>{j.status_code}</code></p>
                        </div>
                        <a href={'tel:' + j.phone.replace(/[^+\d]/g, '')}>
                          {/^[0-9]{8}$/.test(j.phone) ? j.phone.replace(/([0-9]{2})(?=[0-9])/g, '$1 ') : j.phone}
                        </a>
                        {(statusEnabled||role!=='viewer')&&<div className="job-footer">
                        {statusEnabled&&<WashProgress readOnly={role==='viewer'} id={j.id} status={j.status} onSaved={()=>load({background:true})}/>}
                        {role!=='viewer'&&<div className="job-actions"><button className="secondary" onClick={()=>{setRescheduleJob(j);setEditDate(j.date);setEditStart(timeLabel(j.start));setRescheduleError('');setCancelNotice('')}}>{t('Endre dato/tid')}</button><button className="secondary" onClick={()=>{setDurationJob(j);setEditMinutes(String(j.duration));setDurationError('')}}>{t('Endre vasketid')}</button><button className="secondary cancel-booking" onClick={()=>{setCancelJob(j);setCancelError('');setCancelNotice('')}}>{t('Avbestill')}</button></div>}
                        </div>}
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
            </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      <AlertDialog open={!!rescheduleJob&&role!=='viewer'} onOpenChange={open=>{if(!open&&!rescheduleBusy)setRescheduleJob(null)}}>
        <AlertDialogContent className={`cancel-dialog ${styles.dialog}`}><AlertDialogHeader><AlertDialogTitle>{t('Endre dato og tidspunkt')}</AlertDialogTitle><AlertDialogDescription>{rescheduleJob&&<>{rescheduleJob.name}<br/>{t('Nåværende time')}: {dateLabel(rescheduleJob.date,language)} · {timeLabel(rescheduleJob.start)}-{timeLabel(rescheduleJob.start+rescheduleJob.duration)}<br/></>}{t('Vasketid og pris beholdes. Kunden får SMS når endringen lagres.')}</AlertDialogDescription></AlertDialogHeader>
        <form className="duration-editor" onSubmit={saveReschedule}><label>{t('Ny dato')}<input type="date" min={today()} required disabled={rescheduleBusy} value={editDate} onChange={e=>setEditDate(e.target.value)}/></label><label>{t('Ny starttid')}<input type="time" min="08:00" max="14:00" step="900" required disabled={rescheduleBusy} value={editStart} onChange={e=>setEditStart(e.target.value)}/></label>
        {rescheduleJob&&minutesFromTime(editStart)>=0&&<p className="muted">{t('Ny tid')}: {editDate?dateLabel(editDate,language):''} · {editStart}-{timeLabel(minutesFromTime(editStart)+rescheduleJob.duration)}</p>}
        {rescheduleError&&<p className="error" role="alert">{t(rescheduleError)}</p>}
        <AlertDialogFooter><button type="button" className="secondary" disabled={rescheduleBusy} onClick={()=>setRescheduleJob(null)}>{t('Lukk')}</button><button type="submit" className="primary" disabled={rescheduleBusy}>{t(rescheduleBusy?'Lagrer…':'Lagre ny time')}</button></AlertDialogFooter></form></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!durationJob&&role!=='viewer'} onOpenChange={open=>{if(!open&&!durationBusy)setDurationJob(null)}}>
        <AlertDialogContent className={`cancel-dialog ${styles.dialog}`}><AlertDialogHeader><AlertDialogTitle>{t('Endre vasketid')}</AlertDialogTitle><AlertDialogDescription>{durationJob&&<>{durationJob.name} · {dateLabel(durationJob.date,language)}<br/>{t('Starttid')}: {timeLabel(durationJob.start)}<br/></>}{t('Endrer kun denne bestillingen. Starttid og pris beholdes.')}</AlertDialogDescription></AlertDialogHeader>
        <form className="duration-editor" onSubmit={saveDuration}><label>{t('Vasketid i minutter')}<input type="number" min="15" max="240" step="15" required disabled={durationBusy} value={editMinutes} onChange={e=>setEditMinutes(e.target.value)}/></label>
        {durationJob&&Number(editMinutes)>0&&<p className="muted">{t('Ny sluttid')}: {timeLabel(durationJob.start+Number(editMinutes))}</p>}
        {durationError&&<p className="error" role="alert">{t(durationError)}</p>}
        <AlertDialogFooter><button type="button" className="secondary" disabled={durationBusy} onClick={()=>setDurationJob(null)}>{t('Lukk')}</button><button type="submit" className="primary" disabled={durationBusy}>{t(durationBusy?'Lagrer…':'Lagre vasketid')}</button></AlertDialogFooter></form></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!cancelJob&&role!=='viewer'} onOpenChange={open=>{if(!open&&!cancelBusy)setCancelJob(null)}}>
        <AlertDialogContent className={`cancel-dialog ${styles.dialog}`}>
          <AlertDialogHeader><AlertDialogTitle>{t('Avbestille denne bilvasken?')}</AlertDialogTitle><AlertDialogDescription>{cancelJob&&<>{cancelJob.name}<br/>{dateLabel(cancelJob.date,language)} · {timeLabel(cancelJob.start)}-{timeLabel(cancelJob.start+cancelJob.duration)}<br/></>}{t('Bestillingen fjernes, og plassen blir tilgjengelig for andre.')}</AlertDialogDescription></AlertDialogHeader>
          {cancelError&&<p className="error" role="alert">{t(cancelError)}</p>}
          <AlertDialogFooter><AlertDialogCancel className="secondary" disabled={cancelBusy}>{t('Behold bestillingen')}</AlertDialogCancel><AlertDialogAction className="primary" disabled={cancelBusy} onClick={cancelBooking}>{t(cancelBusy?'Avbestiller…':'Bekreft avbestilling')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}