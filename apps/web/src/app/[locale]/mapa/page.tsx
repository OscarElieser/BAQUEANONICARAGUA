import { ProximamentePage } from '@/components/ProximamentePage';

export default async function Mapa({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  return (
    <ProximamentePage
      locale={locale}
      title={q ? `Buscar “${q.slice(0, 60)}”` : 'Mapa'}
      description="El explorador geográfico mostrará destinos, negocios y comunidades sobre un mapa con relieve, respetando las ubicaciones protegidas."
      phase="Fase 3"
    />
  );
}
