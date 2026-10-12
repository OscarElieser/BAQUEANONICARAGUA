# EstadoVerificacion

Bloque “Qué está comprobado” que toda ficha de destino o negocio muestra antes que su descripción.

- Panel `ground-raised`, `radius-m`, filas separadas por `line`.
- Cada fila: el dato (Ubicación, Horarios, Tarifas, Contacto, Fuente) a la izquierda y su estado a la derecha.
- Estados y color: **Comprobado el [fecha]** en `status-verified`; **Aproximado** / **Pendiente** en `oro-text`; **Sin confirmar** / **Consulta al prestador** en `ink-muted`; **Restringido** en `status-alert`. El color acompaña siempre al texto, nunca lo sustituye.
- La fila Fuente enlaza al registro de `data_sources` (organismo, fecha de consulta, licencia).
- Datos: `verification`, `verified_at`, `location_precision`, `opening_hours.verified_at`, `price_observations.observed_at` del esquema Supabase.
