# Reglas del proyecto (para cualquier persona o agente que escriba código aquí)

**Antes de empezar, lee `docs/MEMORIA.md`**: es la memoria de todo lo conversado y decidido con el dueño (reglas, historia, pendientes y próximos pasos). Actualízala al terminar cada etapa.

## 1. Cada línea de código lleva un comentario en español

Pedido del dueño del proyecto: debe poder leer cualquier archivo y saber qué hace cada línea.

- Toda instrucción, declaración, condición, consulta SQL o etiqueta con lógica lleva un comentario en español que explique **qué hace y para qué**, en lenguaje sencillo.
- El comentario va al final de la línea o justo encima si no cabe.
- No llevan comentario: líneas vacías y cierres de bloque (`}`, `);`, `</div>`, `end;`).
- Sintaxis según el lenguaje: `//` en TypeScript/Dart, `--` en SQL, `#` en YAML/Python, `{/* */}` dentro de JSX.
- Los comentarios explican la intención, no repiten el código: "Si no hay sesión, mandamos al usuario a iniciar sesión" en vez de "if user is null".

Ejemplo:

```ts
const user = auth.currentUser; // Usuario que tiene la sesión abierta (o null si nadie)
if (!user) return null; // Sin sesión no hay nada que mostrar
```

## 2. Principios del producto (resumen del prompt maestro)

- No inventar precios, horarios, rutas, negocios, coordenadas ni estadísticas. Lo que falta se muestra como "por cotizar", "sin confirmar" o `[marcador]`.
- Cada botón ejecuta algo real o dice "No disponible todavía".
- Toda acción sensible pasa por una función de base de datos que comprueba permisos y escribe en `audit.logs`.
- Ninguna clave secreta en la web ni en la app Android.

## 3. Cómo se trabaja en el repositorio

- Todo cambio va primero a la rama única `desarrollo`; cuando CI (6 trabajos) y CodeQL están en verde, `main` avanza a ese mismo commit (avance rápido, sin fusiones ni ramas nuevas).
- No se crean más ramas. Las únicas ramas permanentes son `main` y `desarrollo` (más la propuesta agrupada de Dependabot, si la hay).
- Toda tabla nueva lleva RLS y pruebas en `supabase/tests/rls_smoke.sql`.
- Los colores salen del sistema de diseño (`design/sistema/tokens.json`); `scripts/check_tokens.py` lo verifica.
- Los recursos del Ops Center se declaran en `apps/web/src/ops/resources.ts` y en `app.admin_resources`; `scripts/ops-resources.test.ts` verifica que coincidan.
- Los textos de la interfaz se escriben primero en `content/i18n/es.json` y luego en los otros 9 idiomas; `python3 scripts/sync_i18n.py` los valida y los copia a web y Android. Nada de textos de interfaz fijos en el código de pantallas nuevas.
- Las traducciones hechas sin revisión nativa llevan `status: needs_review` y la web y la app lo dicen.
- Los textos legales se editan solo en `content/legal/`; `python3 scripts/sync_legal.py` los copia a web y Android.
- Ningún dato legal o de contacto se inventa: lo que falta va como `[marcador: …]`.
- La medición de navegación solo corre con consentimiento y nunca guarda datos personales ni rutas privadas.
- Las páginas nuevas deben pasar la revisión de accesibilidad de CI (axe, WCAG 2.2 AA, tema claro y oscuro).
- Seguridad y privacidad: `docs/SEGURIDAD.md`.
- Estado real de cada módulo: `docs/ROADMAP.md`.
