'use client';
import { useLanguage } from '@/components/language';
import { SiteHeader } from '@/components/site-header';
import { useSiteName } from '@/components/site-name';

export default function NotFound() {
  const { t } = useLanguage();
  const siteName = useSiteName();
  return <><title>{`Fant ikke siden - ${siteName}`}</title><SiteHeader/><main><section className="panel login"><h1>{t('Fant ikke siden')}</h1><p className="muted">{t('Siden finnes ikke, eller den er flyttet.')}</p><div className="admin-actions"><a href="/" className="primary">{t('Tilbake til bestilling')}</a></div></section></main></>;
}
