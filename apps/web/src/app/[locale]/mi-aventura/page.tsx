import { ProximamentePage } from '@/components/ProximamentePage';

export default async function MiAventura({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <ProximamentePage
      locale={locale}
      title="Mi aventura"
      description="Aquí armarás tu viaje con el asistente: días, rutas calculadas por un proveedor de mapas y costos con fecha y fuente."
      phase="Fase 5"
    />
  );
}
