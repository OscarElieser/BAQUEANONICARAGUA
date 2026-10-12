'use client'; // Carga los datos con la sesión del navegador

import { use } from 'react'; // Para leer los parámetros de la ruta
import { useOpsData } from '@/ops/useOps'; // Carga con estados de carga y error
import { PanelMetricas, type Metricas } from '@/ops/PanelMetricas'; // Diseño del panel

export default function Panel({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params); // Idioma de la ruta
  const { data, error, loading } = useOpsData<Metricas>('/dashboard'); // Métricas reales de la base
  return (
    <>
      {error && <p role="alert" className="text-status-alert">{error}</p>} {/* Error claro (por ejemplo, sin permiso) */}
      {loading && !data && <p className="text-ink-muted">Cargando métricas…</p>} {/* Mientras llegan */}
      {data && <PanelMetricas locale={locale} data={data} />} {/* El panel con sus cifras */}
    </>
  );
}
