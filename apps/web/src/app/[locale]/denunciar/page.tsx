import { DenunciaForm } from '@/components/DenunciaForm';

export const metadata = { robots: { index: false, follow: false } };

export default function Denunciar() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02]">Reportar un problema</h1>
      <p className="mt-4 text-[19px] leading-[30px] text-ink-muted">
        Contaminación, daño a la fauna, riesgos en senderos, acoso o información engañosa.
      </p>

      {/* Información de seguridad: siempre visible, sin necesidad de iniciar sesión */}
      <section aria-labelledby="emergencia" className="my-8 rounded-m border-2 border-status-alert p-5">
        <h2 id="emergencia" className="m-0 text-[20px] font-bold">¿Hay una emergencia ahora?</h2>
        <p className="mb-3 mt-2">Esta plataforma no avisa a las autoridades por ti. Llama de inmediato:</p>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          <li><a href="tel:118" className="flex h-[52px] items-center rounded-pill bg-ink px-6 font-bold text-ground no-underline">Policía 118</a></li>
          <li><a href="tel:115" className="flex h-[52px] items-center rounded-pill bg-ink px-6 font-bold text-ground no-underline">Bomberos 115</a></li>
          <li><a href="tel:128" className="flex h-[52px] items-center rounded-pill bg-ink px-6 font-bold text-ground no-underline">Emergencias médicas 128</a></li>
        </ul>
      </section>

      <DenunciaForm />
    </main>
  );
}
