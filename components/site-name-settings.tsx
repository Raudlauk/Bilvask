'use client';
import { useRef, useState } from 'react';
import { useLanguage } from './language';
import { useSiteName } from './site-name';
import { ChangedBadge, useSettingsSection } from './settings-save';
import { SITE_NAME_MAX, validSiteName } from '@/lib/brand';
import { SITE_NAME_SAVED } from '@/lib/settings-events';

export function SiteNameSettings() {
  const { t } = useLanguage();
  const current = useSiteName();
  const [saved, setSaved] = useState(current), [name, setName] = useState(current);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const dirty = name.trim() !== saved;
  const store = useSettingsSection('site-name', {
    label: 'Navn på nettsiden', dirty,
    validate: () => {
      if (!validSiteName(name)) { setError(`Bruk 1-${SITE_NAME_MAX} tegn, uten < og >.`); return false; }
      return form.current?.reportValidity() ?? true;
    },
    save: async () => {
      setBusy(true); setError('');
      try {
        const r = await fetch('/api/booking-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'site-name', siteName: name.trim() }) });
        const data = await r.json() as { error?: string };
        if (!r.ok) throw new Error(data.error);
        setSaved(name.trim()); setName(name.trim());
        window.dispatchEvent(new CustomEvent(SITE_NAME_SAVED, { detail: name.trim() }));
      } catch (e) { setError(e instanceof Error ? e.message : 'Kunne ikke lagre navnet.'); throw e; }
      finally { setBusy(false); }
    },
    reset: () => { setName(saved); setError(''); },
  });
  return <section className="panel site-name-settings">
    <div className="settings-head"><h2>{t('Navn på nettsiden')} <ChangedBadge show={dirty} /></h2><p className="muted">{t('Vises øverst på sidene, i fanetittelen, i SMS-er til kunder og i kalenderinvitasjonen.')}</p></div>
    <div className="settings-body">
      <form ref={form} onSubmit={e => { e.preventDefault(); void store?.saveAll(); }}>
        <label>{t('Navn')}<input required maxLength={SITE_NAME_MAX} disabled={busy} value={name} onChange={e => { setName(e.target.value); setError(''); }} /></label>
        <p className="muted">{t('Avsendernavnet på SMS (for eksempel «Steam») er registrert hos LINK Mobility og endres der.')}</p>
      </form>
      {error && <p className="error" role="alert">{t(error)}</p>}
    </div>
  </section>;
}
