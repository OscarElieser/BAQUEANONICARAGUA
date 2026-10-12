'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import 'maplibre-gl/dist/maplibre-gl.css';

type Point = {
  kind: 'destination' | 'business';
  id: string; slug: string; name: string;
  lat: number; lng: number;
  location_precision: 'exact' | 'approximate' | 'restricted';
};

const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL; // proveedor de teselas con licencia (ADR-005)

/**
 * Explorador MapLibre. Sin proveedor configurado NO carga teselas públicas gratuitas:
 * lo dice y la lista de resultados sigue funcionando.
 */
export function MapaExplorer({ locale }: { locale: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error' | 'no-provider'>(styleUrl ? 'idle' : 'no-provider');
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!styleUrl || !container.current) return;
    let map: import('maplibre-gl').Map | undefined;
    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        const mod = await import('maplibre-gl'); // Carga MapLibre solo al abrir el mapa
        const maplibre = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod; // Funciona con la exportación por defecto (v4) y con exportaciones con nombre (v5 en adelante)
        const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
        const { data, error } = await db.rpc('map_points');
        if (error) throw error;
        if (cancelled || !container.current) return;
        const points = (data ?? []) as Point[];
        setCount(points.length);

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        map = new maplibre.Map({
          container: container.current,
          style: styleUrl,
          center: [-85.2, 12.8],
          zoom: 6.3,
          attributionControl: { compact: true },
          fadeDuration: reduced ? 0 : 300,
        });
        map.addControl(new maplibre.NavigationControl({ visualizePitch: true }), 'top-right');
        map.addControl(new maplibre.GeolocateControl({ trackUserLocation: false }), 'top-right');

        map.on('load', () => {
          map!.addSource('catalogo', {
            type: 'geojson',
            cluster: true,
            clusterRadius: 44,
            data: {
              type: 'FeatureCollection' as const,
              features: points.map((p) => ({
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
                properties: { name: p.name, href: `/${locale}/${p.kind === 'business' ? 'negocios' : 'destinos'}/${p.slug}`, approx: p.location_precision !== 'exact' },
              })),
            },
          });
          map!.addLayer({ id: 'grupos', type: 'circle', source: 'catalogo', filter: ['has', 'point_count'],
            paint: { 'circle-color': '#0D5448', 'circle-stroke-color': '#E4B063', 'circle-stroke-width': 2, 'circle-radius': 18 } });
          map!.addLayer({ id: 'grupos-n', type: 'symbol', source: 'catalogo', filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 }, paint: { 'text-color': '#F2EFE5' } });
          map!.addLayer({ id: 'puntos', type: 'circle', source: 'catalogo', filter: ['!', ['has', 'point_count']],
            paint: { 'circle-color': '#E4B063', 'circle-radius': 7, 'circle-stroke-color': '#071C1B', 'circle-stroke-width': 1.5 } });

          // Al tocar un marcador se abre una ficha útil, nunca una ventana vacía
          map!.on('click', 'puntos', (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const { name, href, approx } = f.properties as unknown as { name: string; href: string; approx: boolean };
            const el = document.createElement('div');
            const a = document.createElement('a');
            a.href = href; a.textContent = name; a.style.fontWeight = '700';
            el.appendChild(a);
            if (approx) {
              const note = document.createElement('p');
              note.textContent = 'Ubicación aproximada';
              note.style.margin = '4px 0 0';
              el.appendChild(note);
            }
            new maplibre.Popup({ closeButton: true }).setLngLat(e.lngLat).setDOMContent(el).addTo(map!);
          });
          setStatus('ready');
        });
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => { cancelled = true; map?.remove(); };
  }, [locale]);

  if (status === 'no-provider') {
    return (
      <div className="rounded-m bg-ground-raised p-6">
        <p className="m-0 font-bold">El mapa interactivo se activa al conectar el proveedor de mapas.</p>
        <p className="m-0 mt-2 text-ink-muted">Mientras tanto, usa la búsqueda: los resultados son los mismos.</p>
      </div>
    );
  }
  return (
    <div>
      <div ref={container} className="h-[520px] w-full overflow-hidden rounded-m bg-ground-deep" aria-label="Mapa de destinos y negocios" role="region" />
      <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
        {status === 'loading' && 'Cargando el mapa…'}
        {status === 'ready' && `${count} lugares publicados en el mapa. Las ubicaciones protegidas se muestran aproximadas o no se muestran.`}
        {status === 'error' && 'No se pudo cargar el mapa. La búsqueda sigue disponible.'}
      </p>
    </div>
  );
}
