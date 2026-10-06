'use client';
import {SiteFooter} from '@/components/site-footer';
import {SiteHeader} from '@/components/site-header';
import styles from '@/components/booking-design.module.css';
import {normalizePhoneInput} from '@/lib/phone-input';
import {bookingTotal,servicePrice,emptyPrices,money,type Prices} from '@/lib/prices';
import { useLanguage } from '@/components/language';
import { useState, useEffect, useRef } from 'react';
import { today, blocked, washDuration, timeLabel, dateLabel } from '@/lib/schedule';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Droplets,
  Sparkles,
  ArrowUpRight,
  Clock3,
  ShieldCheck,
  Check,
} from 'lucide-react';
export default function Home({ slideBooking = true }: { slideBooking?: boolean }) {
 const {t,language}=useLanguage();
  const [step, setStep] = useState(1);
  const panelRef = useRef<HTMLElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (slideBooking && previousStep.current !== step) {
      panelRef.current?.querySelector<HTMLElement>(`[data-step-heading="${step}"]`)?.focus({preventScroll:true});
      if (previousStep.current !== step) {
        if (window.matchMedia('(max-width:720px)').matches) panelRef.current?.scrollIntoView({block:'start'});
        else window.scrollTo({top:0});
      }
    }
    previousStep.current = step;
  }, [slideBooking, step]);
  const [inside, setInside] = useState(false),
    [outside, setOutside] = useState(true);
  const [polish,setPolish]=useState(false);
  const [largeCar,setLargeCar]=useState(false);
  const [fluid,setFluid]=useState(false),[prices,setPrices]=useState<Prices>(emptyPrices),[priceReady,setPriceReady]=useState(false),[priceError,setPriceError]=useState(''),[priceRevision,setPriceRevision]=useState(0);
  useEffect(()=>{if(!inside&&!outside){setFluid(false);setLargeCar(false)}},[inside,outside]);
  useEffect(()=>{const controller=new AbortController();setPriceReady(false);setPriceError('');fetch('/api/prices',{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error('Kunne ikke hente prisene.');setPrices(await r.json() as Prices);setPriceReady(true)}).catch(e=>{if(!controller.signal.aborted)setPriceError(e.message)});return()=>controller.abort()},[priceRevision]);
  const [schedule,setSchedule]=useState({insideMinutes:30,outsideMinutes:30,weekdays:44,statusEnabled:false,largeCarPercent:0,polishEnabled:false,polishMinutes:60,polishPrice:null as number|null,mapsUrl:''}),[scheduleReady,setScheduleReady]=useState(false),[scheduleError,setScheduleError]=useState('');
  useEffect(()=>{const controller=new AbortController();async function refresh(){try{const r=await fetch('/api/booking-settings',{signal:controller.signal});if(!r.ok)throw new Error();const data=await r.json() as {insideMinutes:number;outsideMinutes:number;weekdays:number;statusEnabled:boolean;largeCarPercent:number;polishEnabled:boolean;polishMinutes:number;polishPrice:number|null;mapsUrl:string};setSchedule(data);setScheduleReady(true);setScheduleError('')}catch{if(!controller.signal.aborted){setScheduleReady(false);setScheduleError('Kunne ikke hente bestillingsinnstillingene.')}}}void refresh();const timer=setInterval(()=>void refresh(),30000);window.addEventListener('focus',refresh);return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh)}},[priceRevision]);
  const weekdayText=scheduleReady?([1,2,3,4,5,6,0].filter(d=>schedule.weekdays&(1<<d)).map(d=>new Date(Date.UTC(2026,0,4+d)).toLocaleDateString(language==='nb'?'nb-NO':'en-GB',{weekday:'long',timeZone:'UTC'})).join(', ')||t('Ingen åpne bestillingsdager.')):t('Laster innstillinger…');
  useEffect(()=>{if(!schedule.polishEnabled||!outside)setPolish(false)},[schedule.polishEnabled,outside]);
  const selectedPolish=polish&&schedule.polishEnabled&&outside;
  const price=bookingTotal(prices,inside,outside,fluid,selectedPolish,schedule.polishPrice,largeCar,schedule.largeCarPercent);
  return (
    <div className={styles.bookingDesign}>
      <SiteHeader statusEnabled={schedule.statusEnabled} />
      <main>
        <div className="intro booking-intro">
          <h1>{t('Bestill bilvask')}</h1>
          <p>{t("Velg vask og tidspunkt, så ordner vi resten.")}</p>
        </div>
        <div className="booking-layout">
          <section className="panel" ref={panelRef}>
            {slideBooking && <ol className="booking-progress" aria-label={t('Bestillingstrinn')}>
              {['Velg bilvask', 'Velg dato og tidspunkt', 'Dine opplysninger'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step > index + 1 ? 'complete' : ''}><span>{String(index + 1).padStart(2, '0')}</span><span>{t(label)}</span></li>)}
            </ol>}
            <div className="booking-slide" hidden={slideBooking && step !== 1}>
            <div className="section-title">
              <b>01</b>
              <h2 data-step-heading="1" tabIndex={slideBooking ? -1 : undefined}>{t("Velg bilvask")}</h2>
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
                  <div className="service-meta"><strong className="wash-price">{priceReady?(prices[s.id as keyof Prices]===null?t('Pris avtales'):money(servicePrice(prices[s.id as keyof Prices]!,largeCar,schedule.largeCarPercent),language)):t('Henter priser…')}</strong>
                  <span>
                    <Clock3 size={15} /> {scheduleReady?((s.id==='inside'?schedule.insideMinutes:schedule.outsideMinutes)+(largeCar?15:0)):'…'} {t('minutter')} </span>
                  </div>
                </label>
              ))}
            </div>
            <div className="booking-options">
            {scheduleReady&&schedule.polishEnabled&&<label className={'booking-option polish-option'+(selectedPolish?' selected':'')+(!outside?' unavailable':'')}><Checkbox aria-label={t('Bilpolering')} checked={selectedPolish} disabled={!outside} onCheckedChange={value=>setPolish(value===true&&outside)}/><span className="option-copy"><strong>{t('Bilpolering')}</strong><small>{t('Kun sammen med utvendig vask.')}</small></span><span className="option-meta"><strong>{schedule.polishPrice===null?t('Pris avtales'):money(servicePrice(schedule.polishPrice,largeCar,schedule.largeCarPercent),language)}</strong><small><Clock3 size={14}/>{schedule.polishMinutes} {t('minutter')}</small></span></label>}
            <label className={'booking-option'+(largeCar?' selected':'')+(!inside&&!outside?' unavailable':'')}><Checkbox aria-label={t('Stor bil eller veldig skitten bil')} checked={largeCar&&(inside||outside)} disabled={!inside&&!outside} onCheckedChange={value=>setLargeCar(value===true&&(inside||outside))}/><span className="option-copy"><strong>{t('Stor bil eller veldig skitten bil')}</strong><small>{t('15 minutter ekstra per valgt vask. 30 minutter ekstra ved begge vasker.')}</small>{schedule.largeCarPercent>0&&<small>+{schedule.largeCarPercent}% {t('på vask og bilpolering')}</small>}</span></label>
            <label className={'booking-option'+(fluid?' selected':'')+(!inside&&!outside?' unavailable':'')}><Checkbox aria-label={t('Påfyll av spylervæske')} checked={fluid} disabled={!inside&&!outside} onCheckedChange={value=>setFluid(value && (inside||outside))}/><span className="option-copy"><strong>{t('Påfyll av spylervæske')}</strong><small>{t('Kun sammen med bilvask. Ingen ekstra tid.')}</small></span><span className="option-meta"><strong>{priceReady?(prices.fluid==null?t('Pris avtales'):money(prices.fluid,language)):t('Henter priser…')}</strong></span></label>
            </div>
            {priceError&&<p className="error" role="alert">{t(priceError)} <button className="secondary" onClick={()=>setPriceRevision(v=>v+1)}>{t('Prøv igjen.')}</button></p>}
            {slideBooking && <div className="slide-navigation step-bar"><StepTotal empty={!inside && !outside} price={price} priceReady={priceReady} duration={washDuration(schedule,inside,outside,largeCar,selectedPolish)} scheduleReady={scheduleReady}/><button type="button" className="primary" disabled={!inside && !outside} onClick={()=>setStep(2)}>{t('Neste')} →</button></div>}
            </div>
            <div className="booking-slide" hidden={slideBooking && step !== 2}>
            <div className="section-title">
              <b>02</b>
              <h2 data-step-heading="2" tabIndex={slideBooking ? -1 : undefined}>{t("Velg dato og tidspunkt")}</h2>
            </div>
            <p className="notice"> {t('Dager for bestilling')}: {weekdayText} </p>
            {scheduleError&&<p className="error" role="alert">{t(scheduleError)} <button type="button" className="secondary" onClick={()=>setPriceRevision(v=>v+1)}>{t('Prøv igjen.')}</button></p>}
            </div>
            <Booking slideBooking={slideBooking} step={step} setStep={setStep} polish={selectedPolish} largeCar={largeCar} schedule={schedule} scheduleReady={scheduleReady} inside={inside} outside={outside} fluid={fluid} price={price} priceReady={priceReady} refreshPrices={()=>setPriceRevision(v=>v+1)} />
          </section>
          <aside>
            <div className="summary booking-summary">
              <h2>{t('Din bestilling')}</h2>
              <div className="summary-row">
                <span>{t("Valgt vask")}</span>
                <strong>
                  {inside && outside
                    ? t("Innvendig og utvendig")
                    : inside
                      ? t("Innvendig vask")
                      : outside
                        ? t("Utvendig vask")
                        : selectedPolish?t('Bilpolering'):t("Velg vask")}
                </strong>
              </div>
              <div className="summary-row">
                <span>{t("Samlet tid")}</span>
                <strong>
                  {scheduleReady?washDuration(schedule,inside,outside,largeCar,selectedPolish):'…'} {t("minutter")} </strong>
              </div>
              {(selectedPolish||largeCar||fluid)&&<ul className="summary-additions">
                {selectedPolish&&<li><Check size={16} aria-hidden="true"/>{t('Bilpolering')}</li>}
                {largeCar&&<li><Check size={16} aria-hidden="true"/>{t('Stor bil eller veldig skitten bil')}</li>}
                {fluid&&<li><Check size={16} aria-hidden="true"/>{t('Påfyll av spylervæske')}</li>}
              </ul>}
              <div className="summary-total"><span>{t('Totalpris')}</span><strong>{priceReady?(price===null?t('Pris avtales'):money(price,language)):t('Henter priser…')}</strong></div>
              <div className="summary-foot">
                <ShieldCheck />
                <p> {t("Timen din blir reservert")} <br /> {t("så snart du bestiller.")} </p>
              </div>
            </div>
            <div className="hours">
              <Clock3 size={20} />
              <div>
                <strong>{t("Åpningstider")}</strong>
                <p> {t("08:00–15:00 · norsk tid")} <br /> {t("Siste bestillingstid kl. 14:00")} <br />{t('Pause 11:30–12:00')}<br />{t('Dager for bestilling')}: {weekdayText} </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter mapsUrl={schedule.mapsUrl} />
    </div>
  );
}
// Running total for the phone step bar; desktop shows the summary sidebar instead.
function StepTotal({empty=false,price,priceReady,duration,scheduleReady}:{empty?:boolean;price:number|null;priceReady:boolean;duration:number;scheduleReady:boolean}){
 const {t,language}=useLanguage();
 if(empty)return <p className="step-total"><span>{t('Velg vask')}</span></p>;
 return <p className="step-total"><strong>{priceReady?(price===null?t('Pris avtales'):money(price,language)):t('Henter priser…')}</strong><span>{scheduleReady?`${duration} ${t('minutter')}`:t('Laster…')}</span></p>;
}
function Booking({ slideBooking,step,setStep,inside, outside,fluid,price,priceReady,refreshPrices,schedule,scheduleReady,largeCar,polish }: {slideBooking:boolean;step:number;setStep:(step:number)=>void;polish:boolean;largeCar:boolean;schedule:{insideMinutes:number;outsideMinutes:number;weekdays:number;statusEnabled:boolean;largeCarPercent:number;polishEnabled:boolean;polishMinutes:number;polishPrice:number|null};scheduleReady:boolean; inside: boolean; outside: boolean;fluid:boolean;price:number|null;priceReady:boolean;refreshPrices:()=>void }) {
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
    [redirecting, setRedirecting] = useState(false);
  const duration = washDuration(schedule,inside,outside,largeCar,polish);
  useEffect(()=>{if(date&&blocked(date,schedule.weekdays)){setDate('');setStart(null);setSlots([])}},[date,schedule.weekdays]);
  const [maxDate, setMaxDate] = useState('');
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [fullDates,setFullDates]=useState<string[]>([]),[calendarMonth,setCalendarMonth]=useState(''),[calendarError,setCalendarError]=useState('');
  useEffect(()=>{
    setStart(null);
    setSlots([]);
    setLoading(!!date && !!duration && scheduleReady && !blocked(date,schedule.weekdays));
    if(date && duration && scheduleReady && !blocked(date,schedule.weekdays))setError('');
  },[date,duration,revision,schedule.weekdays,scheduleReady]);
  useEffect(()=>{
    // Duration depends on the loaded settings; fetching earlier only repeats the request once they arrive.
    if(!scheduleReady)return;
    const controller=new AbortController();let pending=false;
    async function refresh(){if(pending)return;pending=true;try{
      const canFetchSlots=!!date && !!duration && scheduleReady && !blocked(date,schedule.weekdays);
      const [data,dayData]=await Promise.all([
        fetch(`/api/availability?month=${month}&duration=${duration||15}`,{signal:controller.signal}).then(async response=>{
          if(!response.ok)throw new Error('Availability request failed');
          return await response.json() as {fullDates:string[];closedDates:string[];maxDate:string};
        }),
        canFetchSlots ? fetch(`/api/availability?date=${date}&duration=${duration}`,{signal:controller.signal}).then(async response=>{
          if(!response.ok)throw new Error('Availability request failed');
          return await response.json() as {slots:number[]};
        }) : Promise.resolve(null),
      ]);
      if(controller.signal.aborted)return;
      setFullDates(data.fullDates);setCalendarMonth(month);setCalendarError('');
      setMaxDate(data.maxDate);
      setClosedDates(data.closedDates);
      const freshSlots=dayData && date<=data.maxDate && !data.closedDates.includes(date) && !data.fullDates.includes(date) ? dayData.slots : [];
      setSlots(freshSlots);
      setStart(selected=>selected!==null && freshSlots.includes(selected) ? selected : null);
      if(data.closedDates.includes(date)){setDate('');setStart(null);setSlots([]);}
      if(month > data.maxDate.slice(0,7)) setMonth(data.maxDate.slice(0,7));
      if(date > data.maxDate){setDate('');setStart(null);setSlots([]);}
      if(data.fullDates.includes(date)){setStart(null);setSlots([]);}
    }catch(e){if(!controller.signal.aborted){setCalendarError('Kunne ikke hente ledige dager. Prøv igjen.');setSlots([]);setStart(null)}}finally{pending=false;if(!controller.signal.aborted)setLoading(false)}}
    void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},30000);
    const onFocus=()=>{void refresh()};window.addEventListener('focus',onFocus);
    return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',onFocus)};
  },[month,date,revision,duration,schedule.weekdays,scheduleReady]);
  const first = new Date(month + '-01T12:00:00Z'),
    offset = (first.getUTCDay() + 6) % 7,
    days = new Date(
      first.getUTCFullYear(),
      first.getUTCMonth() + 1,
      0,
    ).getDate();
  const validTime = scheduleReady && !!date && !blocked(date,schedule.weekdays) && !loading && start !== null && slots.includes(start) && duration > 0 && !!maxDate && date >= today() && date <= maxDate && !closedDates.includes(date) && !fullDates.includes(date) && !calendarError;
  useEffect(() => {
    if (slideBooking && step === 3 && !validTime && !busy && !redirecting) {
      // Availability refreshes must reveal the calendar when the selected slot disappears.
      // oxlint-disable-next-line react/react-compiler
      setError('Tidspunktet er ikke lenger tilgjengelig. Velg et nytt tidspunkt.');
      // oxlint-disable-next-line react/react-compiler
      setStep(2);
    }
  }, [slideBooking, step, validTime, busy, redirecting, setStep]);
  function move(delta: number) {
    const d = new Date(first);
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMonth(d.toISOString().slice(0, 7));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (slideBooking && (step !== 3 || !validTime || !priceReady || busy || redirecting)) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, date, start, inside, outside,fluid,largeCar,polish,expectedPrice:price,expectedDuration:duration }),
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
        fluid:boolean;
        price:number|null;
      };
      if (!r.ok) {
        if (r.status === 409) {
          refreshPrices();
          setSlots([]);
          setStart(null);
          setRevision(r=>r+1);
        }
        throw new Error(b.error);
      }
      setRedirecting(true);
      window.location.assign('/bekreftelse');
      setRevision(r=>r+1);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Prøv igjen."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} hidden={slideBooking && step === 1}>
      <div className="booking-slide" hidden={slideBooking && step !== 2}>
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
            disabled={!scheduleReady || !maxDate || month >= maxDate.slice(0,7)}
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
          const full = d >= today() && !closedDates.includes(d) && !(scheduleReady && blocked(d, schedule.weekdays)) && !(maxDate && d > maxDate) && fullDates.includes(d);
          const reason = d < today() ? t('Datoen er passert')
            : closedDates.includes(d) || (scheduleReady && blocked(d, schedule.weekdays)) ? t('Stengt')
            : maxDate && d > maxDate ? t('Utenfor bestillingsperioden')
            : full ? t('Fullbooket') : '';
          return (
            <button
              type="button"
              key={d}
              className={full ? 'fully-booked' : date === d ? 'active' : ''}
              disabled={!scheduleReady || !maxDate || d > maxDate || d < today() || blocked(d,schedule.weekdays) || closedDates.includes(d) || fullDates.includes(d) || calendarMonth!==month || !!calendarError}
              aria-pressed={date === d}
              aria-label={dateLabel(d, language) + (reason ? ', ' + reason : '')}
              title={reason || undefined}
              onClick={() => setDate(d)}
            >
              {i + 1}
              {full && <small aria-hidden="true">{t('Fullt')}</small>}
            </button>
          );
        })}
      </div>
      <p className="calendar-legend muted">{t('Overstrøkne datoer kan ikke bestilles. Ledige tider avhenger av hvilke tjenester du velger og hvor lang tid de tar.')}{fullDates.length > 0 && calendarMonth === month && <> {t('Datoer merket «Fullt» har ingen ledige tider igjen.')}</>}</p>
      {maxDate && <p className="muted">{t('Du kan bestille til og med')} {dateLabel(maxDate, language)}.</p>}
      {calendarError&&<p role="alert" className="error">{t(calendarError)} <button type="button" className="secondary" onClick={()=>setRevision(r=>r+1)}>{t('Prøv igjen.')}</button></p>}
      <p className="muted calendar-caption">
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
          {!slots.length && !error && !calendarError && (
            <p className="notice"> {t("Ingen ledige tider for denne vasken. Velg en annen dato.")} </p>
          )}
        </>
      ) : null}
      {!duration && (
        <p className="notice">{t("Velg minst én tjeneste for å se ledige tider.")}</p>
      )}
      {slideBooking && <div className="slide-navigation step-bar"><button type="button" className="secondary" onClick={()=>setStep(1)}>← {t('Tilbake')}</button><StepTotal price={price} priceReady={priceReady} duration={duration} scheduleReady={scheduleReady}/><button type="button" className="primary" disabled={!validTime} onClick={()=>setStep(3)}>{t('Neste')} →</button></div>}
      </div>
      <div className="booking-slide" hidden={slideBooking && step !== 3}>
      <div className="section-title customer-details-heading">
        <b>03</b>
        <h2 data-step-heading="3" tabIndex={slideBooking ? -1 : undefined}>{t("Dine opplysninger")}</h2>
      </div>
      <div className="form-grid">
        <label> {t("Fullt navn")} <input
            required={!slideBooking || step === 3}
            disabled={slideBooking && step !== 3}
            autoComplete="name"
            maxLength={100}
            placeholder={t("Navnet ditt")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label> {t("Telefonnummer")} <input
            required={!slideBooking || step === 3}
            disabled={slideBooking && step !== 3}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            minLength={8}
            pattern="[0-9]{8}"
            title={t('Oppgi 8 sifre uten +47.')}
            placeholder={t('8 sifre uten +47')}
            value={phone}
            onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
            onPaste={(e) => {
              e.preventDefault();
              const input = e.currentTarget;
              const pasted = e.clipboardData.getData('text');
              const start = input.selectionStart ?? phone.length;
              const end = input.selectionEnd ?? start;
              setPhone(normalizePhoneInput(phone.slice(0, start) + pasted + phone.slice(end)));
            }}
          />
        </label>
      </div>
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
      <div className="booking-slide" hidden={slideBooking && step !== 3}>
      <dl className="mobile-booking-total" aria-live="polite" aria-atomic="true">
        <div><dt>{t('Samlet tid')}</dt><dd>{scheduleReady ? `${duration} ${t('minutter')}` : t('Laster…')}</dd></div>
        <div><dt>{t('Totalpris')}</dt><dd>{priceReady && scheduleReady ? (price === null ? t('Pris avtales') : money(price, language)) : t('Henter priser…')}</dd></div>
      </dl>
      {slideBooking && <div className="slide-navigation"><button type="button" className="secondary" disabled={busy || redirecting} onClick={()=>setStep(2)}>← {t('Tilbake')}</button></div>}
      <button
        className="primary book-submit"
        disabled={!scheduleReady || blocked(date,schedule.weekdays) || busy || redirecting || loading || start === null || !duration || !priceReady || !maxDate || date > maxDate || closedDates.includes(date) || !!calendarError}
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
      </div>
    </form>
  );
}
