import { coordinator } from '../src/coordinator.js';
import { workspaceTool } from '../src/tools/workspaceTool.js';
import { securityAuditTool } from '../src/tools/securityAuditTool.js';
import { cloudSandboxTool } from '../src/tools/sandboxTool.js';
import { toolRegistry } from '../src/core/toolRegistry.js';
import { universalToolCatalog } from '../src/core/universalTools.js';
import { integrationsManager } from '../src/integrations/integrationsManager.js';
import { workflowEngine } from '../src/workflows/workflowEngine.js';
import { localBridgeManager } from '../src/bridge/localBridge.js';
import { memory } from '../src/core/memory.js';

async function runSmokeTests() {
  console.log('🧪 Iniciando batería de pruebas exhaustivas de AgentSystem...');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FALLO: ${msg}`);
      failed++;
    }
  }

  // 1. WorkspaceTool test
  console.log('\n1. Verificando WorkspaceTool (Aislamiento, lectura, diffs y rollback)...');
  try {
    const testFile = 'test-module.js';
    const writeRes = workspaceTool.write(testFile, 'console.log("hola mundo");\n');
    assert(writeRes.created === true, 'Creación de archivo en workspace');
    assert(writeRes.bytes > 0, 'Bytes calculados correctamente');

    const readRes = workspaceTool.read(testFile);
    assert(readRes.content.includes('hola mundo'), 'Lectura de archivo creado');

    const files = workspaceTool.listFiles();
    assert(files.includes(testFile), 'Listado recursivo detecta el archivo');

    // Cloud Sandbox Validation
    const sandboxRes = cloudSandboxTool.validateAndExecute(testFile);
    assert(sandboxRes.syntaxValid, 'Cloud Sandbox valida sintaxis JavaScript');
    assert(sandboxRes.securityPassed, 'Cloud Sandbox valida seguridad');

    // Rollback
    const rollbackRes = workspaceTool.rollback(testFile);
    assert(rollbackRes.success, 'Rollback elimina el archivo creado');
  } catch (e: unknown) {
    assert(false, `Excepción en WorkspaceTool: ${e}`);
  }

  // 2. SecurityAuditTool test
  console.log('\n2. Verificando SecurityAuditTool (Detección OWASP)...');
  try {
    const vulnCode = `
      const apiKey = "sk-live-1234567890abcdef123456";
      eval("dangerous code");
    `;
    const auditRes = securityAuditTool.auditCode(vulnCode, 'vuln.js');
    assert(auditRes.safe === false, 'Detecta código vulnerable');
    assert(auditRes.issues.some(i => i.rule === 'HARDCODED_SECRET'), 'Detecta secreto hardcodeado');
    assert(auditRes.issues.some(i => i.rule === 'UNSAFE_EVAL'), 'Detecta unsafe eval');

    const cleanCode = 'export function add(a: number, b: number) { return a + b; }';
    const cleanAudit = securityAuditTool.auditCode(cleanCode, 'clean.ts');
    assert(cleanAudit.safe === true, 'Valida código seguro');
  } catch (e: unknown) {
    assert(false, `Excepción en SecurityAuditTool: ${e}`);
  }

  // 3. Universal Tools & ToolRegistry test
  console.log('\n3. Verificando Universal Tool Catalog & Tool Registry...');
  try {
    const allTools = universalToolCatalog.listAll();
    assert(allTools.length >= 8, 'Catálogo universal de herramientas poblado');
    assert(allTools.some(t => t.category === 'research'), 'Categoría research activa');
    assert(allTools.some(t => t.category === 'crm_sales'), 'Categoría crm_sales activa');
    assert(allTools.some(t => t.category === 'monitoring_observability'), 'Categoría monitoring activa');
    assert(allTools.some(t => t.autonomyLevel === 5 || t.autonomyLevel === 4 || t.autonomyLevel === 1), 'Niveles de autonomía clasificados');

    const activeTools = toolRegistry.listTools();
    assert(activeTools.length >= 4, 'Herramientas registradas en ToolRegistry');
  } catch (e: unknown) {
    assert(false, `Excepción en Universal Tools: ${e}`);
  }

  // 4. Integrations Manager test
  console.log('\n4. Verificando Integrations Manager...');
  try {
    const services = integrationsManager.listAll();
    assert(services.length >= 6, 'Servicios de integración registrados');
    assert(services.some(s => s.id === 'google_workspace'), 'Integración Google Workspace disponible');
    assert(services.some(s => s.id === 'github'), 'Integración GitHub configurada');
    assert(services.some(s => s.id === 'slack'), 'Integración Slack disponible');

    const toggleRes = integrationsManager.updateStatus('notion', 'configured');
    assert(toggleRes === true, 'Actualización de estado de integración funcional');
  } catch (e: unknown) {
    assert(false, `Excepción en Integrations Manager: ${e}`);
  }

  // 5. Workflow Engine test
  console.log('\n5. Verificando Workflow Engine (Multi-Step DAG & Human-in-the-Loop)...');
  try {
    const workflows = workflowEngine.listWorkflows();
    assert(workflows.length >= 3, 'Workflows predefinidos cargados');

    workflowEngine.register({
      id: 'wf_test_fast',
      title: 'Workflow de prueba rápida',
      description: 'Prueba de orquestación de pasos DAG y Human-in-the-Loop',
      category: 'devops',
      trigger: { type: 'manual' },
      createdAt: new Date().toISOString(),
      steps: [
        {
          id: 'step_1',
          name: 'Crear archivo de configuración en workspace',
          agent: 'coding',
          toolId: 'workspace_write',
          args: { path: 'wf-test.json', content: '{"status":"ok"}' },
          status: 'pending'
        },
        {
          id: 'step_2',
          name: 'Validar en sandbox con Human-in-the-Loop',
          agent: 'qa',
          toolId: 'sandbox_validate',
          args: { path: 'wf-test.json' },
          requireApproval: true,
          status: 'pending'
        }
      ]
    });

    const execution = await workflowEngine.executeWorkflow('wf_test_fast');
    assert(execution.status === 'completed', 'Workflow rápido ejecutado con éxito');
    assert(execution.logs.length > 0, 'Logs de workflow registrados');
    assert(Object.keys(execution.stepResults).length > 0, 'Resultados de pasos almacenados');
  } catch (e: unknown) {
    assert(false, `Excepción en Workflow Engine: ${e}`);
  }

  // 6. MemoryStore & LocalBridge test
  console.log('\n6. Verificando MemoryStore y LocalBridge...');
  try {
    const taskLog = memory.recordTask('orchestrated', 'success', 'nvidia/nemotron-3-ultra-550b-a55b:free', ['workspace_list'], 120, 3, 'Tarea de prueba');
    assert(taskLog.status === 'success', 'Registro de tarea exitoso');

    const recent = memory.getRecentTasks(5);
    assert(recent.length > 0, 'Recuperación de tareas recientes');

    const devices = localBridgeManager.listDevices();
    assert(devices.length > 0, 'Dispositivos Windows registrados en LocalBridge');
  } catch (e: unknown) {
    assert(false, `Excepción en MemoryStore/LocalBridge: ${e}`);
  }

  // 7. Coordinator test (Nemotron 3 Ultra)
  console.log('\n7. Verificando Coordinator con Nemotron 3 Ultra...');
  try {
    const result = await coordinator.run('Define en una frase corta la misión de AgentSystem', 'general');
    assert(result.status === 'success', 'Ejecución exitosa con Nemotron 3 Ultra');
    assert(result.answer.length > 0, 'Respuesta recibida del modelo');
    assert(result.model.includes('nemotron'), 'Modelo Nemotron activo');
  } catch (e: unknown) {
    assert(false, `Excepción en Coordinator: ${e}`);
  }

  console.log(`\n========================================`);
  console.log(`Resultado final: ${passed} pasadas, ${failed} fallidas.`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runSmokeTests().catch(err => {
  console.error('Error fatal en pruebas:', err);
  process.exit(1);
});
