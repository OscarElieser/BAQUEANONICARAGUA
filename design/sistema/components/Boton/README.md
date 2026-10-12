# Boton

Botón en forma de píldora con dos variantes: principal (oro) y secundaria (contorno).

- **Principal**: fondo `oro`, texto `on-oro`, estilo `label`, alto `control-height` (52px). Máximo uno por pantalla: la acción que la persona vino a hacer (“Explorar el mapa”, “Registrar mi negocio”, “Armar mi plan”).
- **Secundaria**: fondo transparente, borde 1.5px `control-border`, texto `ink`.
- **Solo icono**: círculo de 44px sobre `ground-raised`, con `aria-label`.
- Deshabilitado: opacidad 0.45 y texto que explique por qué cerca del botón; si una función aún no existe, el botón dice “No disponible todavía”.
- El texto describe la acción con verbo: “Guardar cambios”, no “Enviar”. Sin flechas añadidas.

Web: `<button>` o `<a>` según navegue o actúe. Android: `FilledButton` / `OutlinedButton` con `StadiumBorder`.
