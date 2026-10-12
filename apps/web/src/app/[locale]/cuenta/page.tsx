import { ProximamentePage } from '@/components/ProximamentePage';

export default async function Cuenta({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <ProximamentePage
      locale={locale}
      title="Iniciar sesión"
      description="Podrás entrar con tu correo o con Google. Se activa cuando se conecte el proyecto de Firebase."
      phase="Fase 2"
    />
  );
}
