# Catálogo Global de Herramientas — AgentSystem (32 Categorías)

Este documento detalla el inventario estructurado de herramientas evaluadas e integradas en la arquitectura universal de AgentSystem.

---

## Estructura de Especificación por Herramienta

Cada herramienta implementa el contrato universal:
- **Identificador y Nombre**: Slug único y etiqueta descriptiva.
- **Categoría**: Una de las 32 áreas funcionales.
- **Nivel de Autonomía**: 1 (Lectura), 2 (Preparación), 3 (Modificación), 4 (Acción Externa), 5 (Crítica/Financiera).
- **Esquema de Entrada y Salida**: JSON Schema fuertemente tipado.
- **Tipo de Autenticación**: Ninguna, API Key, OAuth2, Webhook o Local Bridge.
- **Riesgos y Mitigación**: Reglas de confinamiento y sanitización.

---

## 1. Investigación y Búsqueda Web
- **`web_search`**: Búsqueda en DuckDuckGo HTML / Bing API / Google Search Grounding. Plan gratuito / abierto. Confinamiento anti-SSRF y validación de IPs privadas. Nivel 1.
- **`academic_search`**: Búsqueda en Semantic Scholar y arXiv. Gratuita con rate limits. Nivel 1.
- **`news_search`**: Monitoreo de feeds RSS y NewsAPI. Freemium. Nivel 1.

## 2. Navegación y Automatización de Navegador
- **`browser_inspect`**: Extracción DOM e interactividad de páginas HTTPS públicas vía Playwright worker. Open source / local. Confinamiento de esquemas solo HTTPS. Nivel 1.
- **`form_interact`**: Relleno de formularios web con previa validación de campos. Requiere aprobación si altera cuentas. Nivel 3.
- **`screenshot_capture`**: Captura visual de pantalla sin almacenamiento de cookies de sesión autenticadas. Nivel 1.

## 3. Gestión de Archivos
- **`workspace_list`**: Exploración del árbol de archivos en sandbox `workspace/`. Gratuita / in-process. Nivel 1.
- **`workspace_read`**: Lectura segura hasta 250 KB con bloqueo de path traversal (`..`). Nivel 1.
- **`workspace_write`**: Modificación atómica con diff y backup automático para rollback. Nivel 3.
- **`workspace_rollback`**: Restauración instantánea de versiones anteriores. Nivel 3.

## 4. Análisis de Documentos
- **`pdf_extractor`**: Extracción textual y de metadatos de archivos PDF estructurados. Open source (pdf-parse). Nivel 1.
- **`table_extractor`**: Detección de tablas y conversión a JSON/CSV. Nivel 1.

## 5. Visión Artificial y OCR
- **`vision_analyzer`**: Inferencia multimodal con `OPENROUTER_VISION_MODEL` (`llama-3.2-11b-vision-instruct:free`). Sin coste en tiers gratuitos. Nivel 1.
- **`ocr_reader`**: Extracción de texto de capturas de pantalla o facturas escaneadas. Nivel 1.

## 6. Programación y Desarrollo
- **`code_editor`**: Creación y refactorización modular de scripts (TypeScript, JS, Python, HTML, CSS). Nivel 3.
- **`git_manager`**: Creación de ramas, commits y lectura de diferencias. Nivel 3.
- **`repo_analyzer`**: Mapeo de dependencias de `package.json`, `composer.json` o `requirements.txt`. Nivel 1.

## 7. Ejecución de Código y Sandboxing
- **`sandbox_validate`**: Análisis estático de sintaxis y evaluación controlada sin privilegios de root. Nivel 2.
- **`test_runner`**: Ejecución de suites de prueba (`npm test`, PHPUnit, pytest) con timeouts estrictos. Nivel 2.

## 8. Bases de Datos
- **`database_query`**: Consultas DQL preparadas (SELECT) sobre PostgreSQL o SQLite de desarrollo. Nivel 1.
- **`schema_inspector`**: Extracción de DDL y diagramas relacionales. Nivel 1.

## 9. Almacenamiento Cloud
- **`cloud_storage_manager`**: Sincronización con Google Cloud Storage o S3 compatible. API Key / IAM. Nivel 3.

## 10. Gestión de Proyectos
- **`task_scheduler`**: Planificación de subtareas y dependencias en la memoria del proyecto. Nivel 2.
- **`notion_sync`**: Lectura y creación de bloques en Notion API. API Key. Nivel 2.

## 11. Correo Electrónico
- **`email_summarizer`**: Resumen y priorización de hilos entrantes vía Gmail / Outlook. OAuth2. Nivel 1.
- **`email_draft_creator`**: Generación de borradores sin envío. Nivel 2.
- **`email_sender`**: Envío efectivo de correos. Requiere confirmación humana explícita. Nivel 4.

## 12. Mensajería
- **`slack_notifier`**: Publicación en canales designados mediante Incoming Webhooks. Nivel 4.
- **`discord_webhook`**: Notificaciones de entrega de tareas y alertas. Nivel 4.
- **`whatsapp_business_msg`**: Notificaciones de pedidos con plantillas aprobadas por Meta. Nivel 4.

## 13. Calendarios
- **`calendar_scheduler`**: Propuesta y agenda de reuniones en Google Calendar / Outlook. OAuth2. Nivel 3.

## 14. Redes Sociales
- **`social_trend_tracker`**: Detección de hashtags y tendencias públicas. Nivel 1.
- **`post_publisher`**: Publicación programada con revisión humana previa. Nivel 4.

## 15. Generación de Imágenes
- **`image_synthesizer`**: Generación de activos visuales vía modelos multimodales (Gemini Imagen o Stable Diffusion). Nivel 2.

## 16. Generación y Procesamiento de Video
- **`ffmpeg_processor`**: Compresión, cambio de formato y recorte de clips mediante FFmpeg. Nivel 3.

## 17. Audio y Voz
- **`text_to_speech`**: Generación de locuciones sintéticas para resúmenes o accesibilidad. Nivel 2.

## 18. Transcripción
- **`audio_transcriber`**: Conversión de notas de voz a texto estructurado con Whisper API / Gemini audio. Nivel 1.

## 19. Automatización de Workflows
- **`workflow_runner`**: Motor de ejecución de flujos DAG con compuertas condicionales. Nivel 2/3.

## 20. CRM y Ventas
- **`lead_enricher`**: Extracción de datos públicos de empresas e identificación de responsables. Nivel 1.
- **`hubspot_deal_updater`**: Creación de registros en CRM. API Key. Nivel 3.

## 21. Atención al Cliente
- **`ticket_classifier`**: Clasificación por urgencia y sentimiento de tickets de soporte. Nivel 1.

## 22. Comercio Electrónico
- **`product_catalog_manager`**: Creación de esquemas JSON de productos y variantes. Nivel 3.
- **`price_comparator`**: Rastreo de precios en sitios de competidores. Nivel 1.

## 23. Pagos y Facturación
- **`invoice_data_parser`**: Lectura y conciliación de facturas. Nivel 1.
- **`payment_executor`**: Transferencias bancarias o cobros Stripe. Clasificación Nivel 5: Bloqueado por defecto; exige aprobación humana expresa en cada transacción.

## 24. Finanzas y Contabilidad
- **`expense_categorizer`**: Clasificación automática de partidas de gasto. Nivel 2.

## 25. Marketing y Analítica
- **`market_trend_analyzer`**: Elaboración de informes de mercado y palabras clave. Nivel 1.

## 26. Posicionamiento en Buscadores (SEO)
- **`seo_audit_analyzer`**: Análisis de etiquetas title, meta description, jerarquía H1-H6 y schema.org. Nivel 1.

## 27. Recursos Humanos
- **`cv_parser_ranker`**: Extracción objetiva de habilidades y experiencia en CVs. Nivel 1.

## 28. Mapas y Viajes
- **`travel_itinerary_planner`**: Comparación de itinerarios y rutas óptimas de viaje. Nivel 1.

## 29. Monitorización y Observabilidad
- **`uptime_api_monitor`**: Sondeo HTTP recurrente de endpoints con alertas de latencia. Nivel 1.

## 30. Ciberseguridad Defensiva
- **`security_audit_code`**: Análisis estático OWASP para prevenir inyecciones y fugas de tokens. Nivel 1.

## 31. APIs Empresariales
- **`openapi_connector`**: Consumo dinámico de especificaciones Swagger / OpenAPI v3. Nivel 1/3.

## 32. Conectores Personalizados & Local Bridge
- **`local_bridge_sync`**: Enlace saliente cifrado con la computadora Windows del usuario sin puertos abiertos. Nivel 3.
