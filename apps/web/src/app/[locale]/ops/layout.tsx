import type { ReactNode } from 'react';
import { OpsShell } from '@/ops/OpsShell';

export const metadata = { robots: { index: false, follow: false }, title: 'Ops Center' };

export default async function OpsLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <OpsShell locale={locale}>{children}</OpsShell>;
}
