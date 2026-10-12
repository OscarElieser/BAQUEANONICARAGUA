# Ecosistema Turístico de Nicaragua

PWA + Android + API + Ops Center sobre Firebase Auth y Supabase. Proyecto desde cero.

> Estado: **Fase 0 / inicio de Fase 2**. Ver el estado real de cada módulo en [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Estructura

```
apps/
  web/        Next.js + TypeScript (PWA, páginas públicas, paneles, Ops Center)
  api/        NestJS + TypeScript (lógica compartida, permisos, IA, integraciones)
  mobile/     Flutter + Riverpod (Android)
packages/
  contracts/  OpenAPI: contrato fuente para clientes TS y Dart
supabase/
  migrations/ SQL versionado (identidad, territorio, turismo, auditoría)
  tests/      Pruebas de RLS
  seed.sql    17 territorios + categorías base (en borrador)
docs/
  ARCHITECTURE.md   Arquitectura, flujo de identidad, ADRs, riesgos
  ROADMAP.md        Fases, criterios de salida, estado de módulos
.github/workflows/  CI
```

## Puesta en marcha local

Requisitos: Node 20+, pnpm 9, Supabase CLI, Flutter estable, un proyecto Firebase de desarrollo.

```bash
cp .env.example .env            # completar valores de desarrollo
pnpm install
supabase start                  # aplica migraciones y seed
pnpm db:test                    # pruebas RLS (deben salir todas PASS)
pnpm dev                        # web :3000, api :4000 (docs OpenAPI en /docs)
```

Firebase: asignar el claim `role: "authenticated"` a los usuarios (ver `docs/ARCHITECTURE.md §2`), si no Supabase los trata como anónimos.

Android:
```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_PUBLISHABLE_KEY=... --dart-define=API_URL=...
```

## Reglas del repositorio

- Ninguna clave secreta (`SUPABASE_SECRET_KEY`, cuenta de servicio Firebase) en `apps/web` ni en `apps/mobile`.
- Toda tabla nueva en `public` lleva RLS y una prueba en `supabase/tests`.
- No se siembran datos turísticos sin fuente (`data_sources`). Nada de precios, horarios o coordenadas inventados.
- Producción solo con aprobación manual en GitHub Environments.
