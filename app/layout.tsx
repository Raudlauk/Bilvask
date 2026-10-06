import type { Metadata } from 'next';
import './globals.css';
import './site-design.css';
import { LanguageProvider } from '@/components/language';

export const metadata: Metadata = {
  title: { default: 'Steam - Bestill bilvask', template: '%s - Steam' },
  referrer: 'same-origin',
  description:
    'Bestill innvendig vask, utvendig vask eller begge deler. Åpent 08:00-15:00. Siste starttid er kl. 14:00.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <head>
        <meta charSet="utf-8" />
        <link rel="preload" href="/fonts/supreme/Supreme-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/supreme/Supreme-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
