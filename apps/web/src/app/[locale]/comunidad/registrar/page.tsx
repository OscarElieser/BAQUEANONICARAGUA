import { FranjaTejida } from '@/components/FranjaTejida';
import { RegistrarNegocioForm } from '@/components/RegistrarNegocioForm';
import { listTerritories } from '@/lib/territories';

export default async function RegistrarNegocio({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { data: territories } = await listTerritories();
  return (
    <main>
      <FranjaTejida height={22} />
      <div className="mx-auto max-w-[720px] px-4 py-12">
        <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02]">Publica tu negocio gratis</h1>
        <p className="mt-4 text-[19px] leading-[30px] text-ink-muted">
          Tu negocio aparece en el mapa cuando el equipo revise los datos. No cobramos comisiones ni por aparecer.
        </p>
        <RegistrarNegocioForm locale={locale} territories={territories} />
      </div>
    </main>
  );
}
