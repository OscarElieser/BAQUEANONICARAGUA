import { Bandeja } from '@/components/Bandeja'; // Bandeja de mensajes
import { t } from '@/i18n/t'; // Textos traducidos

export const metadata = { robots: { index: false, follow: false } };

export default async function Mensajes({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { locale } = await params;
  const { c } = await searchParams;
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-12">
      <h1 className="mb-6 mt-0 font-display text-[40px] font-normal">{t(locale, 'messages.title')}</h1>
      <Bandeja locale={locale} initial={c && /^[0-9a-f-]{36}$/.test(c) ? c : undefined} />
    </main>
  );
}
