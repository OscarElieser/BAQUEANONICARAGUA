import { FranjaTejida } from '@/components/FranjaTejida';
import { ProximamentePage } from '@/components/ProximamentePage';

export default async function Comunidad({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <FranjaTejida height={22} />
      <ProximamentePage
        locale={locale}
        title="Detrás de cada viaje hay alguien con nombre"
        description="La Vitrina de Nuestra Gente dará visibilidad gratuita a comedores, guías, artesanos y fincas, con contacto directo y sin comisiones."
        phase="Fase 4"
      />
    </>
  );
}
