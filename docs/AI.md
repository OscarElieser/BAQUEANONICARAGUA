# Asistente de IA

## Qué existe y está probado (`packages/ai-core`, 32 pruebas, `node --test`)

| Módulo | Qué hace | Reglas que garantiza |
|---|---|---|
| `intent.ts` | Interpreta la solicitud (viajeros, días, presupuesto, moneda, alcance, intereses, movilidad, accesibilidad) en español e inglés. | No rellena datos ausentes; lista lo que falta preguntar. |
| `itinerary.ts` | Totales por moneda separando confirmado / estimado / por cotizar; viabilidad; recálculo con resumen de cambios. | No mezcla monedas sin tipo de cambio con fuente; un tiempo de traslado sin origen bloquea; estimación sin método bloquea. |
| `tools.ts` | 14 herramientas en tres niveles: leer, proponer, actuar. Validación de entradas. | Actuar exige sesión y confirmación de esa llamada; no existen herramientas para publicar, aprobar, borrar, SQL o políticas. |
| `guard.ts` | Contenido externo delimitado con nonce y detección de inyección; verificación de cifras; ocultación de datos personales en registros. | Ningún precio sin fuente o sin marca de estimación llega al usuario. |

## Prompt y evaluación

- `prompts/assistant.system.v1.md`: versión 1. Al activar una versión se registra en `ai_prompt_versions`.
- `evals/cases.json`: suites `intent`, `hallucination`, `prompt_injection`, `actions`, `itinerary_budget`. Las partes deterministas corren en CI; las que necesitan el modelo se ejecutan al conectar el proveedor y sus resultados van a `ai_evaluations`.

## Memoria (esquema en migración 0007)

- Conversacional: `ai_messages` (con `cited_refs` por respuesta).
- Del viaje: `ai_conversations.trip_id`.
- Persistente consentida: `ai_memories` (exige `consented_at`; el usuario la ve y la borra).
- De conocimiento: `ai_knowledge_chunks` solo con contenido publicado; sin acceso directo desde clientes.

## Aprendizaje supervisado

La IA solo puede `propose_correction` → `ai_correction_proposals` (estado `pending`). Aprobar exige revisor humano (restricción en BD probada). Lo aprobado entra como revisión en `content_revisions` con origen `ai_proposal_approved`.

## Pendiente (requiere proveedor de IA)

- Orquestación del modelo en `POST /v1/assistant/chat` (hoy responde 503 explicando por qué).
- Embeddings e indexado RAG.
- Ejecución de las suites de evaluación con el modelo.

La página "Mi aventura" ya funciona sin proveedor: interpreta el viaje en el navegador y pregunta lo que falta. La API expondrá la misma lógica cuando `@nica/ai-core` tenga paso de compilación para Node CommonJS.
