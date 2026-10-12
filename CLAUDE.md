# Reglas del proyecto (para cualquier persona o agente que escriba código aquí)

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

- Cambios en una rama; se unen a `main` solo con CI en verde (los 5 controles).
- Toda tabla nueva lleva RLS y pruebas en `supabase/tests/rls_smoke.sql`.
- Los colores salen del sistema de diseño (`design/sistema/tokens.json`); `scripts/check_tokens.py` lo verifica.
- Los recursos del Ops Center se declaran en `apps/web/src/ops/resources.ts` y en `app.admin_resources`; `scripts/ops-resources.test.ts` verifica que coincidan.
- Estado real de cada módulo: `docs/ROADMAP.md`.
