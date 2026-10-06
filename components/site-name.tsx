'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_SITE_NAME } from '@/lib/brand';
import { SITE_NAME_SAVED } from '@/lib/settings-events';

// The site name is read once per request in the root layout and shared here,
// so every client component shows the configured name without its own fetch.
const Context = createContext(DEFAULT_SITE_NAME);

export function SiteNameProvider({ initial, children }: { initial: string; children: React.ReactNode }) {
  const [name, setName] = useState(initial);
  // Admin renames take effect on the open page straight away.
  useEffect(() => {
    const onSaved = (event: Event) => setName((event as CustomEvent<string>).detail);
    window.addEventListener(SITE_NAME_SAVED, onSaved);
    return () => window.removeEventListener(SITE_NAME_SAVED, onSaved);
  }, []);
  return <Context.Provider value={name}>{children}</Context.Provider>;
}

export function useSiteName() {
  return useContext(Context);
}
