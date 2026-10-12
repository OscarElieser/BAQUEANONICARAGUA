import { Planificador } from '@/components/Planificador'; // Intérprete del viaje
import { t } from '@/i18n/t'; // Textos traducidos

export default async function MiAventura({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
      <section className="flex flex-wrap items-end gap-10 pb-10 pt-14">
        <h1 className="m-0 flex-[1_1_460px] font-display text-[44px] font-normal leading-[0.98] sm:text-[76px]">
          {t(locale, 'adventure.title')} {/* Título */}
        </h1>
        <p className="m-0 max-w-[46ch] flex-[1_1_340px] text-[19px] leading-[30px] text-ink-muted">
          {t(locale, 'adventure.intro')} {/* Presentación */}
        </p>
      </section>
      <Planificador locale={locale} />
    </main>
  );
}
