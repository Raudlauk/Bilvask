'use client';
import { useState, useEffect } from 'react';
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
    setChecking(true);
    setError('');
    try {
      const r = await fetch('/api/admin' + (date ? '?date=' + date : ''));
      const b = (await r.json()) as {
        error?: string;
        username: string;
        bookings: Job[];
      };
      if (r.status === 401) {
        setLogged(false);
        return;
      }
      if (!r.ok) throw new Error(b.error);
      setLogged(true);
      setUsername(b.username);
      setJobs(b.bookings);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Kunne ikke laste arbeidslisten.',
      );
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    load();
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
      if (!r.ok) throw new Error(b.error);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prøv igjen.');
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
      setError('De nye passordene er ikke like.');
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
        'Innloggingen er oppdatert. Logg inn med det nye brukernavnet og passordet.',
      );
    }
  }
  return (
    <>
      <header>
        <a className="brand" href="/">
          <Droplets /> Steam<span>ANSATTSIDE</span>
        </a>
        <a href="/" className="worker-link">
          <ArrowLeft size={16} />
          Tilbake til bestilling
        </a>
      </header>
      <main className="admin-wrap">
        {checking && !logged ? (
          <p role="status">Laster ansattsiden…</p>
        ) : !logged ? (
          <section className="panel login">
            <div className="eyebrow">ANSATTSIDE</div>
            <h1>Velkommen tilbake.</h1>
            <p className="muted">Logg inn for å se bestilte bilvasker.</p>
            {message && (
              <p className="success" role="status">
                {message}
              </p>
            )}
            <form onSubmit={login}>
              <label>
                Brukernavn
                <input
                  autoComplete="username"
                  required
                  maxLength={50}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label>
                Passord
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary" disabled={busy}>
                {' '}
                {busy ? 'Logger inn…' : 'Logg inn →'}
              </button>
            </form>
          </section>
        ) : (
          <>
            <div className="admin-top">
              <div>
                <div className="eyebrow">ANSATTSIDE</div>
                <h1>
                  {settings ? 'Innloggingsinnstillinger' : 'Arbeidsliste'}
                </h1>
                <p className="muted">
                  {settings
                    ? 'Endre den felles innloggingen for ansatte.'
                    : 'Bestilte bilvasker i tidsrekkefølge. Alle klokkeslett er i norsk tid.'}
                </p>
              </div>
              <div className="admin-actions">
                <button
                  className="secondary"
                  onClick={() => {
                    setSettings(!settings);
                    setError('');
                  }}
                >
                  {settings
                    ? 'Tilbake til arbeidslisten'
                    : 'Innloggingsinnstillinger'}
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
                >
                  Logg ut
                </button>
              </div>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {settings ? (
              <form className="panel settings" onSubmit={save}>
                <h2>Endre innlogging</h2>
                <label>
                  Brukernavn
                  <input
                    required
                    maxLength={50}
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
                <label>
                  Nåværende passord
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                  />
                </label>
                <label>
                  Nytt passord
                  <input
                    required
                    minLength={8}
                    maxLength={200}
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </label>
                <label>
                  Bekreft nytt passord
                  <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
                <p className="muted">
                  Bruk minst 8 tegn. Alle ansatte blir logget ut når
                  innloggingen endres.
                </p>
                <button className="primary" disabled={busy}>
                  {busy ? 'Lagrer…' : 'Lagre innlogging'}
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
                  <label>
                    Vis dato{' '}
                    <input
                      aria-label="Dato for arbeidslisten"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{ width: 190, marginLeft: 8 }}
                    />
                  </label>
                  <button
                    className="secondary"
                    onClick={() => setDate(today())}
                  >
                    I dag
                  </button>
                  <button className="secondary" onClick={() => setDate('')}>
                    Alle kommende
                  </button>
                  <button
                    className="secondary"
                    onClick={load}
                    aria-label="Oppdater arbeidslisten"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
                <p className="muted">
                  {date ? dateLabel(date) : 'Kommende bestillinger'} ·{' '}
                  {jobs.length} {jobs.length === 1 ? 'bilvask' : 'bilvasker'} ·{' '}
                  {jobs.reduce((n, j) => n + j.duration, 0)} minutter
                </p>
                {checking ? (
                  <p role="status">Oppdaterer arbeidslisten…</p>
                ) : jobs.length ? (
                  <div className="jobs">
                    {jobs.map((j) => (
                      <article key={j.id} className="job">
                        <div className="job-time">
                          {timeLabel(j.start)}–{timeLabel(j.start + j.duration)}
                          <small>{dateLabel(j.date)}</small>
                        </div>
                        <div>
                          <h3>{j.name}</h3>
                          <p>
                            {j.inside && j.outside
                              ? 'Innvendig og utvendig vask'
                              : j.inside
                                ? 'Innvendig vask'
                                : 'Utvendig vask'}{' '}
                            · {j.duration} minutter
                          </p>
                        </div>
                        <a href={'tel:' + j.phone.replace(/[^+\d]/g, '')}>
                          {j.phone}
                        </a>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="panel">
                    <CalendarDays size={32} />
                    <h2>
                      Ingen bestillinger {date ? 'på denne datoen' : 'ennå'}.
                    </h2>
                    <p className="muted">
                      Nye bestillinger av bilvask vises her.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
