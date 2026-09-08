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
      setError(e instanceof Error ? e.message : 'Could not load schedule.');
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
      setError(e instanceof Error ? e.message : 'Please try again.');
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
      setError('New passwords do not match.');
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
      setMessage('Login updated. Sign in with your new credentials.');
    }
  }
  return (
    <>
      <header>
        <a className="brand" href="/">
          <Droplets /> gleam<span>WORKER SPACE</span>
        </a>
        <a href="/" className="worker-link">
          <ArrowLeft size={16} />
          Back to booking
        </a>
      </header>
      <main className="admin-wrap">
        {checking && !logged ? (
          <p role="status">Loading worker space…</p>
        ) : !logged ? (
          <section className="panel login">
            <div className="eyebrow">WORKER SPACE</div>
            <h1>Welcome back.</h1>
            <p className="muted">Sign in to see your booked washes.</p>
            {message && (
              <p className="success" role="status">
                {message}
              </p>
            )}
            <form onSubmit={login}>
              <label>
                Username
                <input
                  autoComplete="username"
                  required
                  maxLength={50}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label>
                Password
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
                {busy ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          </section>
        ) : (
          <>
            <div className="admin-top">
              <div>
                <div className="eyebrow">WORKER SPACE</div>
                <h1>{settings ? 'Login settings' : 'The wash schedule'}</h1>
                <p className="muted">
                  {settings
                    ? 'Update the shared worker login.'
                    : 'Booked work, in time order. All times are Europe/Oslo.'}
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
                  {settings ? 'Back to schedule' : 'Login settings'}
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
                  Sign out
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
                <h2>Change login</h2>
                <label>
                  Username
                  <input
                    required
                    maxLength={50}
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
                <label>
                  Current password
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                  />
                </label>
                <label>
                  New password
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
                  Confirm new password
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
                  Use at least 8 characters. Updating the login signs out all
                  workers.
                </p>
                <button className="primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save login'}
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
                    Show date{' '}
                    <input
                      aria-label="Schedule date"
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
                    Today
                  </button>
                  <button className="secondary" onClick={() => setDate('')}>
                    All upcoming
                  </button>
                  <button
                    className="secondary"
                    onClick={load}
                    aria-label="Refresh schedule"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
                <p className="muted">
                  {date ? dateLabel(date) : 'Upcoming bookings'} · {jobs.length}{' '}
                  {jobs.length === 1 ? 'wash' : 'washes'} ·{' '}
                  {jobs.reduce((n, j) => n + j.duration, 0)} minutes
                </p>
                {checking ? (
                  <p role="status">Updating schedule…</p>
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
                              ? 'Inside + outside wash'
                              : j.inside
                                ? 'Inside wash'
                                : 'Outside wash'}{' '}
                            · {j.duration} minutes
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
                    <h2>No bookings {date ? 'on this date' : 'yet'}.</h2>
                    <p className="muted">
                      New car wash bookings will appear here.
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
