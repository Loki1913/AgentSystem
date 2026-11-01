# Plan Priorizado de Integración — AgentSystem

Este documento establece la hoja de ruta técnica ordenada por prioridades de impacto y dependencias arquitectónicas.

---

## Fases de Implementación

```text
[Fase A: Núcleo] --> [Fase B: Esenciales] --> [Fase C: Productividad] --> [Fase D: Negocios] --> [Fase E: Multimedia] --> [Fase F: Operaciones]
```

### Prioridad A — Núcleo (Completada ✔)
- Orquestación multiagente estructurada (`OrchestratorAgent`, `Coordinator`).
- Motor de modelos con OpenRouter y `nvidia/nemotron-3-ultra-550b-a55b:free` con *Thinking Process*.
- Tool Registry centralizado con 5 niveles de autonomía y control de permisos.
- Memoria multinivel (Tarea, Proyecto, Base de Conocimiento, Auditoría `storage/tasks.jsonl`).
- Motor de Workflows con soporte de Human-in-the-Loop.
- Interfaz web interactiva con monitoreo en tiempo real.

### Prioridad B — Herramientas Esenciales (Completada ✔)
- Investigación web profunda con protección anti-SSRF y Cheerio.
- Navegación e inspección DOM vía Playwright worker y fallback integrado.
- Gestión aislada del workspace con diffs y rollback automático.
- Cloud Sandbox para validación sintáctica y linter.
- Auditoría defensiva de ciberseguridad con reglas OWASP.
- Local Bridge para conexión saliente segura con Windows Workstation (`bridge/windows-bridge.mjs`).

### Prioridad C — Productividad Personal (En catálogo / Conectores activos)
- Conectores para Google Workspace (Gmail, Calendar, Drive, Docs, Sheets) mediante OAuth 2.0.
- Integración con Microsoft 365 (Outlook, OneDrive, Excel) vía Microsoft Graph.
- Conector de documentación con Notion API.
- Mensajería operativa mediante webhooks de Slack y Discord.

### Prioridad D — Negocios y Ventas (En catálogo / Herramientas activas)
- Rastreador y analizador de tendencias de mercado (`market_trend_analyzer`).
- Calificador de prospectos comerciales y enriquecimiento de empresas (`lead_enricher`).
- Preparador de propuestas y borradores de correo (Nivel 2 con aprobación humana).
- Conectores para HubSpot CRM y WhatsApp Business Cloud API.

### Prioridad E — Producción Multimedia (En catálogo)
- Pipeline de procesamiento y ensamblaje de video con FFmpeg.
- Generación de activos visuales mediante modelos multimodales.
- Transcripción de audio y conversión de notas a texto estructurado.

### Prioridad F — Operaciones Avanzadas y Finanzas
- Monitoreo continuo de uptime y latencia de APIs (`uptime_api_monitor`).
- Procesamiento y extracción OCR de facturas (`invoice_data_parser`).
- Protocolo estricto de Nivel 5: Toda operación financiera o de cobro requiere confirmación humana explícita.
