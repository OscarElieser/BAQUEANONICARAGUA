# Territorios vivos

Sistema de diseño del ecosistema turístico de Nicaragua: PWA (Next.js) y Android (Flutter) comparten estos tokens, tipografías y reglas. Nace de dos materiales del país: el relieve volcánico, dibujado como curvas de nivel, y las hamacas tejidas de Masaya, convertidas en una franja de color que marca a la gente.

Es una síntesis de las tres direcciones de la Fase 1: la base y la paleta vienen de *Curvas de nivel*, la franja tejida de *Hamaca y añil* y la tipografía de lectura de *Cocibolca*.

## Principios

1. **El territorio es la interfaz.** Se descubre por relieve, no por catálogo. Las curvas de nivel aparecen donde hay geografía real: portada, territorio, destino, mapa.
2. **La gente tiene sello propio.** La franja tejida identifica emprendedores, guías y artistas. Solo vive en la Vitrina y en Comunidad; usarla como adorno en otra parte le quita significado.
3. **La verdad se ve.** Cada ficha muestra qué está comprobado, qué es aproximado y qué hay que consultar. Un dato sin confirmar nunca se disfraza de confirmado.
4. **Se lee en cualquier teléfono.** Atkinson Hyperlegible para todo lo funcional, 16px mínimo en campos, contraste AA en ambos temas y una versión sin animación.
5. **Una sola osadía por pantalla.** El titular en Young Serif o las curvas de nivel: lo demás calla.

## Voz y contenido

- Tutea, en frases cortas y verbos simples: “Explorar el mapa”, “Registrar mi negocio”, “Guardar en favoritos”.
- Mayúscula solo inicial. Nunca etiquetas en mayúsculas sostenidas, ni flechas añadidas al texto de botones.
- Una acción conserva su nombre en todo el flujo: el botón “Publicar” produce el aviso “Publicado”.
- Los vacíos invitan a actuar: “Aún no hay emprendimientos registrados aquí. Si tienes un negocio en la zona, publícalo gratis.”
- Los errores dicen qué pasó y cómo resolverlo, sin disculpas: “No se pudo cargar el catálogo territorial. Reintentar.”
- Expresiones nicaragüenses solo en la voz del asistente y cuando la persona las usa primero.
- Datos ausentes en diseños y maquetas: siempre entre corchetes, `[Tarifa]`, `[fecha]`, `[Nombre del comedor]`. Nunca precios, horarios, calificaciones o negocios inventados.

## Color

| Rol | Token | Regla |
|---|---|---|
| Fondo | `ground` | Verde territorial en oscuro; bruma verde `#E6EEE9` en claro. Nunca crema. |
| Superficie | `ground-raised` | Paneles, campos, barra inferior. |
| Texto | `ink`, `ink-muted` | El marfil `#F2EFE5` es solo texto sobre verde. |
| Acción principal | `oro` + `on-oro` | Un botón dorado por pantalla. |
| Enlaces | `accent` | Oro claro en oscuro, verde territorial en claro. |
| Verificación | `status-verified`, `oro-text`, `ink-muted` | Comprobado, aproximado/pendiente, sin datos. Siempre con texto. |
| Alerta | `status-alert`, `terracota` | Seguridad, restricciones, errores. Nunca decorativo. |
| Franja tejida | `band-*` | Solo Vitrina y Comunidad. |

El tema por defecto sigue al sistema (automático), con selector manual claro/oscuro. Contrastes comprobados: texto ≥ 4.97:1 en todos los pares; bordes de control ≥ 3:1.

## Tipografía

- **Young Serif** (display, 400): titulares, nombres de territorios y destinos, marca. Una o dos líneas, interlineado 0.98–1.15.
- **Atkinson Hyperlegible** (texto, 400 y 700): todo lo demás. Diseñada para baja visión: distingue `Il1` y `0O`, clave en teléfonos sencillos y con sol directo.
- Escala: 76 / 48 / 34 / 26 en display; 20 / 19 / 16 / 15 / 14 / 12 en texto. En Android el display-xl baja a 44px.
- Idiomas con otra escritura (chino, japonés, coreano, ruso) sustituyen Young Serif por la serif del sistema de su escritura y Atkinson por Noto Sans de esa escritura, manteniendo tamaños y pesos.

## Forma y espacio

- Escala de 4px: 4, 8, 12, 16, 24, 32, 48, 64.
- Todo lo que se toca es píldora (`radius-pill`); los paneles usan `radius-m` (18px). Nada de sombras: la profundidad la dan `ground-raised` y `ground-deep`.
- Objetivo táctil mínimo 44px; botones principales de 52px.
- Texto corrido hasta 60 caracteres por línea; alineado a la izquierda.

## Firmas

- **Curvas de nivel**: elipses concéntricas en `oro`, opacidad creciente hacia la cima (0.15 → 0.95). Un punto `terracota` marca la cima activa. En el mapa real se sustituyen por curvas de un modelo de elevación con licencia.
- **Franja tejida**: bandas horizontales en `band-anil`, `band-maiz`, `band-achiote`, `band-verde` con separadores `band-marfil`. Alturas 8–22px. Marca perfiles de personas, nunca secciones genéricas. Cada nivel de perfil tiene su patrón: punteado maíz (información comunitaria), segmentos achiote (perfil reclamado), banda añil continua (verificado).

## Iconografía

Trazo de 2px con extremos redondeados en cuadrícula de 24px, sin relleno, en `currentColor`. Los iconos solos llevan `aria-label`. Sin emoji.

## Movimiento

Un único momento orquestado: al entrar al atlas, las curvas de nivel se dibujan de la base a la cima (≤ 900 ms). El resto del movimiento responde a la persona: abrir una ficha, confirmar un guardado. Con `prefers-reduced-motion` o modo de datos reducidos no hay animación ni 3D.

## Accesibilidad

WCAG 2.2 AA en ambos temas, foco visible (`focus`, 2px, 3px de separación), formularios con `<label>` real, estados nunca comunicados solo por color.
