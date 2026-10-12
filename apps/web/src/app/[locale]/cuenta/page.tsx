import { CuentaForm } from '@/components/CuentaForm'; // Formulario de acceso y cuenta

export const metadata = { robots: { index: false, follow: false } }; // Los buscadores no indexan esta página

export default function Cuenta() {
  return (
    <main className="mx-auto max-w-[560px] px-4 py-12">
      <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02]">Tu cuenta</h1> {/* Título de la página */}
      <p className="mb-8 mt-3 text-[19px] leading-[30px] text-ink-muted">
        Entra para guardar favoritos e itinerarios, escribir a los negocios y publicar tus relatos. {/* Para qué sirve la cuenta */}
      </p>
      <CuentaForm /> {/* Entrar, crear cuenta, recuperar o cerrar sesión */}
    </main>
  );
}
