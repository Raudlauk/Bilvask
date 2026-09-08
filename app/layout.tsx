import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/components/language';

export const metadata: Metadata = {
  title: 'Steam — Bestill bilvask',
  referrer: 'same-origin',
  description:
    'Bestill innvendig vask, utvendig vask eller begge deler. Åpent 08:00–15:00. Siste starttid er kl. 14:00.',
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
      </head>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
