# Batería de Pruebas Automatizadas de AgentSystem

Este directorio contiene las pruebas de validación automatizada para la plataforma de agentes:

- `smoke.test.ts`: Pruebas integrales de:
  1. **WorkspaceTool**: Aislamiento, lectura, escritura de archivos, cálculo de diffs y rollback.
  2. **SecurityAuditTool**: Detección de vulnerabilidades OWASP (eval, concatenación de comandos, secretos expuestos, evasión de rutas).
  3. **MemoryStore**: Registro estructurado en `storage/tasks.jsonl` y notas persistentes de proyecto.
  4. **Coordinator**: Generación de planes multi-agente, orquestación, bitácora de actividad y consolidación de respuestas.

## Ejecución

```bash
npm test
```
