import { Planificador } from '@/components/Planificador';

export default async function MiAventura({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
      <section className="flex flex-wrap items-end gap-10 pb-10 pt-14">
        <h1 className="m-0 flex-[1_1_460px] font-display text-[44px] font-normal leading-[0.98] sm:text-[76px]">
          Planea tu viaje sin adivinar
        </h1>
        <p className="m-0 max-w-[46ch] flex-[1_1_340px] text-[19px] leading-[30px] text-ink-muted">
          Las rutas salen de un proveedor de mapas y cada tarifa trae su fecha. Cuando algo no está confirmado, el plan te lo dice.
        </p>
      </section>
      <Planificador locale={locale} />
    </main>
  );
}
