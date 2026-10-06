import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Bestillingsbekreftelse', robots: { index: false } };

export default function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
