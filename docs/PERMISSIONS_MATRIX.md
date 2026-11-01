# Matriz de Permisos y Niveles de Autonomía — AgentSystem

AgentSystem clasifica todas las acciones operativas en cinco niveles estrictos para balancear autonomía, productividad y seguridad.

---

## Los 5 Niveles de Autonomía

```text
[Nivel 1: Lectura]  -->  [Nivel 2: Preparación]  -->  [Nivel 3: Modificación]  -->  [Nivel 4: Acciones Externas]  -->  [Nivel 5: Críticas]
      │                         │                              │                                  │                           │
  Automática                Automática              Workspace Autorizado              Aprobación de Política        Confirmación Obligatoria
(Cero riesgo)         (Borradores y planes)        (Diffs y Rollback)              (Emails, Webhooks, Posts)         (Pagos, Eliminación)
```

### Nivel 1 — Lectura (Read-Only)
- **Definición**: Consultas de información pública, lectura de archivos autorizados, inspección del DOM y recuperación de metadatos.
- **Riesgo**: Ninguno sobre los sistemas del usuario.
- **Política de Aprobación**: Totalmente automática.
- **Ejemplos de Herramientas**: `web_search`, `workspace_list`, `workspace_read`, `browser_inspect`, `security_audit_code`, `uptime_api_monitor`.

### Nivel 2 — Preparación (Staging & Drafting)
- **Definición**: Generación de planes, redacción de borradores de correo, análisis sintáctico en sandbox y propuestas estructuradas.
- **Riesgo**: Nulo (no impacta sistemas en producción ni publica datos externamente).
- **Política de Aprobación**: Automática; los artefactos se marcan como *drafts*.
- **Ejemplos de Herramientas**: `email_draft_creator`, `sandbox_validate`, `market_trend_analyzer`, `lead_enricher`, `invoice_data_parser`.

### Nivel 3 — Modificación (Controlled Modification)
- **Definición**: Escritura, actualización y reorganización de archivos dentro del workspace aislado (`workspace/`) o carpetas autorizadas de Windows vía Local Bridge.
- **Riesgo**: Bajo-Medio (potencial sobreescritura mitigada por copias de seguridad inmediatas).
- **Política de Aprobación**: Requiere casilla de verificación activada en la interfaz ("Permitir escritura en workspace"). Cada cambio genera diffs y permite reversión instantánea (*rollback*).
- **Ejemplos de Herramientas**: `workspace_write`, `workspace_rollback`, `code_editor`, `local_bridge_sync`.

### Nivel 4 — Acciones Externas (External Interactions)
- **Definición**: Envío efectivo de correos electrónicos, publicación en redes sociales, actualización de registros en CRM o envío de mensajes a plataformas de mensajería (Slack, Discord, WhatsApp).
- **Riesgo**: Alto (impacto directo en terceros y reputación de la organización).
- **Política de Aprobación**: Requiere confirmación por el usuario o configuración de una política de automatización aprobada en el Workflow Engine.
- **Ejemplos de Herramientas**: `email_sender`, `slack_notifier`, `discord_webhook`, `whatsapp_business_msg`, `post_publisher`.

### Nivel 5 — Acciones Críticas & Financieras (Critical & High-Stakes)
- **Definición**: Pagos, transferencias monetarias, eliminación masiva o irreversible de datos, modificación de permisos de acceso o cambios de credenciales de seguridad.
- **Riesgo**: Crítico (irreversible, financiero o de integridad de infraestructura).
- **Política de Aprobación**: **Confirmación Humana Explícita Obligatoria (*Human-in-the-Loop*)**. Bloqueado por defecto para cualquier ejecución autónoma no atendida.
- **Ejemplos de Herramientas**: `payment_executor`, `permanent_data_purge`, `credential_rotation`.

---

## Barreras de Seguridad Transversales

1. **Aislamiento de Rutas**: Todo acceso local se valida canónicamente con `realpath` impidiendo escapes ascendentes (`..` o paths absolutos no permitidos).
2. **Protección Anti-SSRF**: Toda llamada de red originada por el Research Agent o Browser Agent resuelve DNS y descarta rangos de IP privadas (RFC 1918, RFC 4193, loopback).
3. **No-Autorrevocación de Permisos**: Ningún agente cuenta con herramientas que puedan modificar su propia matriz de permisos ni desactivar compuertas de seguridad.
