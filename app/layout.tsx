import type { Metadata } from 'next';
import './globals.css';
import './site-design.css';
import { LanguageProvider } from '@/components/language';
import { SiteNameProvider } from '@/components/site-name';
import { getSiteName } from '@/lib/site-name';

// The site name is configurable in admin, so pages must not be prerendered with a stale name.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const name = await getSiteName();
  return {
    title: { default: `${name} - Bestill bilvask`, template: `%s - ${name}` },
    referrer: 'same-origin',
    description:
      'Bestill innvendig vask, utvendig vask eller begge deler. Åpent 08:00-15:00. Siste starttid er kl. 14:00.',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteName = await getSiteName();
  return (
    <html lang="nb">
      <head>
        <meta charSet="utf-8" />
        <link rel="preload" href="/fonts/supreme/Supreme-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/supreme/Supreme-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <LanguageProvider><SiteNameProvider initial={siteName}>{children}</SiteNameProvider></LanguageProvider>
      </body>
    </html>
  );
}
