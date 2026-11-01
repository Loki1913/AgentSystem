# Matriz Comparativa de Métodos de Conexión — AgentSystem

Este documento evalúa las vías de integración para conectar AgentSystem con herramientas, servicios externos y recursos locales.

---

## Tabla Comparativa Multidimensional

| Método de Conexión | Seguridad | Velocidad / Latencia | Fiabilidad | Complejidad de Implementación | Coste / Overhead | Caso de Uso Principal en AgentSystem |
|---|---|---|---|---|---|---|
| **REST APIs (HTTP/JSON)** | Alta (TLS + Bearer) | Muy Alta (50-200ms) | Excelente | Baja | Mínimo | Integración con OpenRouter, DuckDuckGo, GitHub API y servicios web estándar. |
| **GraphQL** | Alta (TLS + Scopes) | Alta | Alta | Media | Medio | Consultas complejas en APIs con grafos de relaciones extensos (ej. Shopify, GitHub v4). |
| **SDKs Oficiales (npm)** | Alta | Máxima (In-process) | Máxima | Baja | Mínimo | Librerías de utilidades, parsers Cheerio, AST validators y clientes de IA. |
| **OAuth 2.0 / OIDC** | Máxima (Consentimiento granular) | Alta (con token refrescado) | Alta | Media-Alta | Mínimo | Google Workspace (Gmail, Drive, Sheets, Calendar) y Microsoft 365. |
| **API Keys & Secrets** | Alta (en variables .env en servidor) | Inmediata | Máxima | Mínima | Nulo | Claves maestras de modelos (OpenRouter) y webhooks privados. |
| **Webhooks (Entrantes/Salientes)** | Alta (Verificación HMAC SHA256) | En tiempo real | Alta | Media | Bajo | Alertas de eventos, notificaciones a Slack/Discord y disparadores de workflows. |
| **MCP (Model Context Protocol)** | Muy Alta (Aislamiento stdio/SSE) | Alta | Alta | Media | Medio | Conexión con servidores locales o remotos de herramientas agénticas estandarizadas. |
| **Navegador (Playwright / Computer Use)** | Media (Aislamiento de sandbox) | Media (1-3 seg por página) | Media-Alta | Alta | Medio (CPU/RAM de browser) | Inspección de sitios que no ofrecen API pública o extracción de interfaces dinámicas. |
| **Bases de Datos (Pool TLS/Sockets)** | Máxima | Ultra rápida (<10ms) | Máxima | Media | Bajo | Persistencia relacional en PostgreSQL / Cloud SQL o SQLite local. |
| **Colas de Mensajes (Redis/Bull)** | Alta | Sub-milisegundo | Máxima | Media | Bajo | Tareas asíncronas en segundo plano, reintentos y distribución de carga. |
| **Local Bridge (Windows Outbound)** | Máxima (Outbound TLS, token pairing) | Alta (100-300ms) | Alta (depende de PC encendida) | Media | Nulo | Acceso seguro a carpetas de la computadora Windows sin abrir puertos domésticos. |
| **Conectores Personalizados** | Alta | Alta | Alta | Variable | Bajo | Plugins propios adaptados a requerimientos específicos del usuario. |

---

## Selección de la Estritectura Óptima para AgentSystem

1. **Inferencia de Modelos**: REST API estandarizada con OpenRouter (`/chat/completions`) soportando streaming y thinking tokens.
2. **Productividad Personal (Nivel 1)**: OAuth 2.0 para servicios de Google y Microsoft, garantizando revocación instantánea y consentimiento por scope.
3. **Automatización de Navegador (Nivel 1/2)**: Playwright worker desacoplado en modo de solo lectura con inspección de DOM y captura de imágenes.
4. **Acceso a PC Local (Nivel 3)**: Local Bridge con socket/HTTP saliente, token secreto y lista blanca estricta de carpetas locales.
5. **Eventos y Workflows**: Arquitectura orientada a eventos con disparadores de webhook y tareas programadas en el Workflow Engine.
