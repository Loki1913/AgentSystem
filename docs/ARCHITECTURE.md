# Arquitectura y Límites de Seguridad de AgentSystem

## Flujo de Orquestación Multiagente

```text
Cliente Web (UI) / REST API
  -> Servidor Express (Entrada segura, validación de tipos y sanitización)
    -> Coordinator (Motor Central de Orquestación)
      -> Generador de Planes (Orchestrator Agent - DAG de subtareas)
        -> Especialistas Asignados:
             ├── Research Agent (DuckDuckGo, Scraping Seguro, Anti-SSRF)
             ├── Coding Agent (Workspace Aislado, Control de Diffs & Rollback)
             ├── Browser Agent (Playwright Worker / Inspección DOM integrada)
             ├── Vision Agent (Entrada Multimodal, Análisis Visual)
             ├── QA Agent (Verificación de Requisitos, Comprobación de Calidad)
             └── Security Agent (Auditoría OWASP, Detección de Secretos)
        -> ModelGateway (OpenRouter / Modelos Gratuitos / Motor de Razonamiento Autónomo)
      -> MemoryStore (Task Logs en tasks.jsonl, Memoria de Proyecto, Base de Conocimiento)
  <- Resultado Estructurado (Plan, Pasos, Logs de Actividad, Fuentes, Diffs)
```

## Especialización de Agentes

1. **Orchestrator / Manager**: Analiza el objetivo global, genera el plan descompuesto en subtareas estructuradas y supervisa el progreso.
2. **Research Agent**: Realiza búsquedas públicas en la web, extrae texto limpio de URLs HTTPS, valida orígenes y cita fuentes verificadas.
3. **Coding Agent**: Trabaja dentro del sandbox `workspace/`, lee archivos, produce modificaciones atómicas con cálculo de diffs y permite reversión (rollback).
4. **Vision Agent**: Analiza imágenes y diagramas multimodales sin degradación destructiva.
5. **Browser Agent**: Inspecciona páginas web autorizadas, formularios interactivos y enlaces.
6. **QA Agent**: Evalúa cumplimiento de objetivos y revisa la integridad de los entregables.
7. **Security Agent**: Audita código en busca de vulnerabilidades (inyección de comandos, eval inseguro, rutas ascendentes y credenciales expuestas).

## Niveles de Memoria

- **Memoria de Tarea**: Contexto de ejecución volátil, acumulación de salidas de pasos y mensajes de herramientas.
- **Memoria de Proyecto**: Decisiones arquitectónicas y notas almacenadas en `storage/project_memory.json`.
- **Memoria de Conocimiento**: Investigaciones, resúmenes y citas en `storage/knowledge_base.json`.
- **Registro Histórico de Auditoría**: Metadatos de tareas (duración, modo, modelo, herramientas ejecutadas) en `storage/tasks.jsonl`.

## Modelo de Confianza y Políticas de Seguridad

- Todo contenido recuperado de Internet o del workspace es considerado dato no confiable (protección contra Prompt Injection).
- El acceso a archivos está estrictamente confinado dentro de `workspace/`.
- Protección anti-SSRF mediante resolución DNS y validación de rangos de direcciones IP privadas.
- Las modificaciones de código generan copias de seguridad inmediatas para permitir rollback instantáneo.
- Las credenciales nunca se persisten en logs ni se exponen a la interfaz cliente.
