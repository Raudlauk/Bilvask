'use client';
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
  const [inside, setInside] = useState(false),
    [outside, setOutside] = useState(true);
  return (
    <>
      <header>
        <a className="brand" href="/">
          <Droplets /> gleam<span>CAR WASH</span>
        </a>
        <a className="worker-link" href="/admin">
          Worker login <ArrowUpRight size={16} />
        </a>
      </header>
      <main>
        <div className="intro">
          <div className="eyebrow">A FRESH START FOR YOUR CAR</div>
          <h1>
            A clean car.
            <br />
            <span>A time that suits you.</span>
          </h1>
          <p>Choose your wash, pick a time, and we’ll take care of the rest.</p>
        </div>
        <div className="booking-layout">
          <section className="panel">
            <div className="section-title">
              <b>01</b>
              <h2>Choose your wash</h2>
              <span>Select one or both</span>
            </div>
            <div className="services">
              {[
                {
                  id: 'outside',
                  name: 'Outside wash',
                  detail: 'A fresh finish, from top to tyres.',
                  icon: Droplets,
                  checked: outside,
                  set: setOutside,
                },
                {
                  id: 'inside',
                  name: 'Inside wash',
                  detail: 'A clean cabin for the road ahead.',
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
                    <Clock3 size={15} />
                    30 minutes
                  </span>
                </label>
              ))}
            </div>
            <div className="section-title">
              <b>02</b>
              <h2>Pick a date & time</h2>
            </div>
            <p className="notice">
              Mondays and Thursdays are reserved. Public bookings are available
              on all other days.
            </p>
            <Booking inside={inside} outside={outside} />
          </section>
          <aside>
            <div className="summary">
              <div className="eyebrow">YOUR NEXT CLEAN</div>
              <h2>
                A little care.
                <br />A big difference.
              </h2>
              <div className="summary-row">
                <span>Selected wash</span>
                <strong>
                  {inside && outside
                    ? 'Inside + outside'
                    : inside
                      ? 'Inside wash'
                      : outside
                        ? 'Outside wash'
                        : 'Choose a wash'}
                </strong>
              </div>
              <div className="summary-row">
                <span>Total time</span>
                <strong>
                  {30 * (Number(inside) + Number(outside))} minutes
                </strong>
              </div>
              <div className="summary-foot">
                <ShieldCheck />
                <p>
                  Your time is reserved
                  <br />
                  as soon as you book.
                </p>
              </div>
            </div>
            <div className="hours">
              <Clock3 size={20} />
              <div>
                <strong>Wash hours</strong>
                <p>
                  09:00–17:00 · Europe/Oslo
                  <br />
                  Monday & Thursday reserved
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <footer>
        <span>gleam / CAR WASH</span>
        <span>A cleaner car starts here.</span>
      </footer>
    </>
  );
}
function Booking({ inside, outside }: { inside: boolean; outside: boolean }) {
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
    if (!date || !duration) return;
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
          setSlots((s) => s.filter((n) => n !== start));
          setStart(null);
        }
        throw new Error(b.error);
      }
      setConfirmation(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  if (confirmation)
    return (
      <div className="success" role="status">
        <ShieldCheck size={35} />
        <h2>You’re booked, {confirmation.name}.</h2>
        <p>
          {dateLabel(confirmation.date)} · {timeLabel(confirmation.start)}–
          {timeLabel(confirmation.start + confirmation.duration)}
        </p>
        <p>
          {confirmation.inside && confirmation.outside
            ? 'Inside + outside wash'
            : confirmation.inside
              ? 'Inside wash'
              : 'Outside wash'}{' '}
          · {confirmation.duration} minutes
        </p>
        <p className="muted">
          All times are Europe/Oslo. Please save these details.
        </p>
        <button
          className="secondary"
          onClick={() => {
            setConfirmation(null);
            setName('');
            setPhone('');
            setStart(null);
            setRevision((r) => r + 1);
          }}
        >
          Book another wash
        </button>
      </div>
    );
  return (
    <form onSubmit={submit}>
      <div className="calendar-head">
        <strong>
          {first.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </strong>
        <div>
          <button
            type="button"
            aria-label="Previous month"
            disabled={month <= today().slice(0, 7)}
            onClick={() => move(-1)}
          >
            ‹
          </button>{' '}
          <button type="button" aria-label="Next month" onClick={() => move(1)}>
            ›
          </button>
        </div>
      </div>
      <div className="calendar">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
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
              aria-label={dateLabel(d) + (blocked(d) ? ', reserved' : '')}
              onClick={() => setDate(d)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="muted">
        {date ? dateLabel(date) : 'Select an available date above.'} ·
        Europe/Oslo
      </p>
      {loading ? (
        <p role="status">Checking available times…</p>
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
            <p className="notice">
              No times available for this wash. Please choose another date.
            </p>
          )}
        </>
      ) : null}
      {!duration && (
        <p className="notice">
          Select at least one wash to see available times.
        </p>
      )}
      <div className="section-title">
        <b>03</b>
        <h2>Your details</h2>
      </div>
      <div className="form-grid">
        <label>
          Full name
          <input
            required
            autoComplete="name"
            maxLength={100}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Phone number
          <input
            required
            type="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="Your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}{' '}
          <button
            type="button"
            className="secondary"
            onClick={() => setRevision((r) => r + 1)}
          >
            Refresh times
          </button>
        </div>
      )}
      <button
        className="primary book-submit"
        disabled={busy || loading || start === null || !duration}
        type="submit"
      >
        <span>{busy ? 'Confirming…' : 'Confirm booking'}</span>
        <span>{duration} min →</span>
      </button>
      <p className="muted">
        {start === null
          ? 'Select a time to complete your booking.'
          : `${dateLabel(date)} · ${timeLabel(start)}–${timeLabel(start + duration)}`}
      </p>
    </form>
  );
}
