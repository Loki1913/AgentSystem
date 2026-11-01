# Arquitectura del Motor de Workflows — AgentSystem

El motor de workflows (`src/workflows/workflowEngine.ts`) permite definir, programar y supervisar procesos de múltiples pasos con agentes especializados, disparadores periódicos y validaciones intermedias.

---

## Modelo de Datos de Workflows

```typescript
interface WorkflowDefinition {
  id: string;
  title: string;
  description: string;
  category: 'business' | 'devops' | 'research' | 'marketing' | 'monitoring' | 'personal';
  trigger: {
    type: 'manual' | 'cron' | 'webhook' | 'event';
    cronExpression?: string;
    webhookPath?: string;
  };
  variables?: Record<string, unknown>;
  steps: WorkflowStep[];
}
```

---

## Componentes del Ciclo de Vida

1. **Disparadores (Triggers)**:
   - **Manual**: Invocación directa desde la interfaz web o mediante `POST /api/workflows/:id/run`.
   - **Cron**: Ejecución programada con expresiones estándar (ej. `*/15 * * * *` para monitoreo de APIs o `0 9 * * 1` para informes semanales).
   - **Webhook**: Invocación externa a través de endpoint `/api/webhooks/:workflowId` con verificación de firma HMAC.
2. **Grafo de Pasos y Dependencias (DAG)**:
   - Los pasos se ejecutan de forma ordenada propagando el contexto y las variables acumuladas en el objeto `stepResults`.
   - Soporte para saltos condicionales (`condition`) basados en el resultado de pasos anteriores.
3. **Compuerta de Aprobación Humana (Human-in-the-Loop)**:
   - Cuando un paso tiene configurado `requireApproval: true` (por ejemplo, acciones de Nivel 4 o Nivel 5), el workflow entra en estado `waiting_approval`.
   - La ejecución se suspende de forma segura hasta que el usuario confirme o descarte la acción desde el panel web.
4. **Persistencia y Trazabilidad**:
   - Cada ejecución genera un registro inmutable con `startedAt`, `completedAt`, bitácora detallada de cada agente y salidas estructuradas en memoria persistente.

---

## Workflows Preconfigurados en el Sistema

- **`wf_market_launch`**: Investigación de tendencias de mercado -> Creación de catálogo en workspace -> Auditoría de seguridad OWASP -> Validación de entregables por QA Agent.
- **`wf_api_monitor`**: Sondeo de latencia y estado de endpoints públicos -> Generación automática de reporte de observabilidad ante caídas.
- **`wf_lead_enrichment`**: Rastreo de sitios corporativos en internet -> Extracción de tecnologías y contactos -> Generación de propuesta comercial en borrador (Nivel 2).
