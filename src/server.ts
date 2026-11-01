import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { Config } from './config.js';
import { coordinator } from './coordinator.js';
import { workspaceTool } from './tools/workspaceTool.js';
import { securityAuditTool } from './tools/securityAuditTool.js';
import { cloudSandboxTool } from './tools/sandboxTool.js';
import { toolRegistry } from './core/toolRegistry.js';
import { universalToolCatalog } from './core/universalTools.js';
import { integrationsManager } from './integrations/integrationsManager.js';
import { workflowEngine } from './workflows/workflowEngine.js';
import { localBridgeManager } from './bridge/localBridge.js';
import { memory } from './core/memory.js';
import { TaskMode } from './core/types.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static assets from public/ if present
const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: Config.appTitle,
    uptime_seconds: Math.floor(process.uptime()),
    model: Config.defaultModel,
    timestamp: new Date().toISOString()
  });
});

// App configuration and capabilities metadata
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    appTitle: Config.appTitle,
    defaultModel: Config.defaultModel,
    visionModel: Config.visionModel,
    codingModel: Config.codingModel,
    enableReasoning: Config.enableReasoning,
    reasoningEffort: Config.reasoningEffort,
    hasApiKey: Boolean(Config.openRouterApiKey),
    browserWorkerConfigured: Boolean(Config.browserWorkerUrl),
    port: Config.port,
    modes: [
      { id: 'orchestrated', name: '⚡ Orquestación Multiagente (Nemotron 3 Ultra)', description: 'Planificación profunda con thinking tokens, desglose y coordinación multi-especialista.' },
      { id: 'research', name: '🔍 Investigación Web Profunda', description: 'Búsquedas exhaustivas, extracción de datos y citas de fuentes.' },
      { id: 'coding', name: '💻 Programación en Workspace', description: 'Inspección, creación y modificación de archivos con control de diffs y rollback.' },
      { id: 'vision', name: '👁️ Análisis Visual Multimodal', description: 'Reconocimiento y análisis de imágenes, diagramas y capturas.' },
      { id: 'browser', name: '🌐 Navegador Web', description: 'Inspección remota de páginas HTTPS públicas, enlaces y formularios.' },
      { id: 'qa_security', name: '🛡️ Auditoría de Seguridad & QA', description: 'Análisis de vulnerabilidades, secretos expuestos y validación de calidad.' },
      { id: 'general', name: '💬 Asistente General', description: 'Respuestas directas y análisis conversacional estructurado.' }
    ]
  });
});

// Universal Tool Catalog endpoint
app.get('/api/catalog/tools', (_req: Request, res: Response) => {
  const tools = universalToolCatalog.listAll();
  res.json({
    total: tools.length,
    tools: tools.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      autonomyLevel: t.autonomyLevel,
      permission: t.permission,
      provider: t.provider,
      allowedAgents: t.allowedAgents,
      timeoutMs: t.timeoutMs,
      requiresExplicitApproval: t.requiresExplicitApproval,
      status: t.status
    }))
  });
});

// Tool Registry metadata (Active Tools)
app.get('/api/tools', (_req: Request, res: Response) => {
  const tools = toolRegistry.listTools().map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    permission: t.permission,
    allowedAgents: t.allowedAgents,
    timeoutMs: t.timeoutMs,
    isAvailable: t.isAvailable
  }));
  res.json({ tools, count: tools.length, auditLog: toolRegistry.getAuditHistory(20) });
});

// Integrations Catalog
app.get('/api/integrations', (_req: Request, res: Response) => {
  res.json({ services: integrationsManager.listAll() });
});

app.post('/api/integrations/:id/toggle', (req: Request, res: Response) => {
  const serviceId = String(req.params.id);
  const svc = integrationsManager.get(serviceId);
  if (!svc) {
    res.status(404).json({ error: 'Servicio de integración no encontrado.' });
    return;
  }
  const nextStatus = svc.status === 'configured' ? 'disabled' : 'configured';
  integrationsManager.updateStatus(serviceId, nextStatus);
  res.json({ success: true, service: integrationsManager.get(serviceId) });
});

// Workflows API
app.get('/api/workflows', (_req: Request, res: Response) => {
  res.json({ workflows: workflowEngine.listWorkflows() });
});

app.post('/api/workflows/:id/run', async (req: Request, res: Response) => {
  try {
    const workflowId = String(req.params.id);
    const execution = await workflowEngine.executeWorkflow(workflowId, req.body?.variables || {});
    res.json(execution);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

app.get('/api/workflows/executions', (_req: Request, res: Response) => {
  res.json({ executions: workflowEngine.listRecentExecutions(20) });
});

// Local Bridge endpoints for Windows workstation
app.get('/api/bridge/devices', (_req: Request, res: Response) => {
  res.json({ devices: localBridgeManager.listDevices(), history: localBridgeManager.getHistory(20) });
});

app.post('/api/bridge/heartbeat', (req: Request, res: Response) => {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!localBridgeManager.authenticate(auth || '')) {
    res.status(401).json({ error: 'Token de Local Bridge no válido.' });
    return;
  }
  const { hostname, platform, release, allowedDirectories } = req.body || {};
  let dev = localBridgeManager.listDevices().find(d => d.hostname === hostname);
  if (!dev) {
    dev = localBridgeManager.registerDevice('Windows Workstation', String(hostname || 'PC'), `${platform} ${release}`, Array.isArray(allowedDirectories) ? allowedDirectories : []);
  } else {
    localBridgeManager.updateHeartbeat(dev.id);
  }
  res.json({ success: true, device: dev });
});

// Unified API Router for both /api/* and /?api=*
async function handleApiRun(req: Request, res: Response): Promise<void> {
  try {
    const { message, mode, image, allow_workspace_writes, model } = req.body || {};
    const taskText = typeof message === 'string' ? message : '';
    const taskMode = (mode || 'orchestrated') as TaskMode;
    const imageDataUrl = typeof image === 'string' && image ? image : null;
    const allowWrites = allow_workspace_writes === true;
    const selectedModel = typeof model === 'string' && model ? model : null;

    const result = await coordinator.run(taskText, taskMode, imageDataUrl, allowWrites, selectedModel);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
}

async function handleApiTasks(req: Request, res: Response): Promise<void> {
  try {
    const limit = typeof req.body?.limit === 'number' ? req.body.limit : 50;
    const tasks = coordinator.getRecentTasks(limit);
    res.json({ tasks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
}

async function handleApiWorkspace(req: Request, res: Response): Promise<void> {
  try {
    const action = String(req.body?.action || 'list');
    const filePath = req.body?.path ? String(req.body.path) : '';
    const content = req.body?.content !== undefined ? String(req.body.content) : '';

    if (action === 'list') {
      const files = workspaceTool.listFiles();
      res.json({ files, count: files.length });
      return;
    }

    if (action === 'read') {
      if (!filePath) {
        res.status(400).json({ error: 'Falta parámetro "path".' });
        return;
      }
      const data = workspaceTool.read(filePath);
      res.json(data);
      return;
    }

    if (action === 'write') {
      if (!filePath) {
        res.status(400).json({ error: 'Falta parámetro "path".' });
        return;
      }
      const diff = workspaceTool.write(filePath, content);
      res.json(diff);
      return;
    }

    if (action === 'rollback') {
      if (!filePath) {
        res.status(400).json({ error: 'Falta parámetro "path".' });
        return;
      }
      const rollbackRes = workspaceTool.rollback(filePath);
      res.json(rollbackRes);
      return;
    }

    if (action === 'diff') {
      if (!filePath) {
        res.status(400).json({ error: 'Falta parámetro "path".' });
        return;
      }
      const diff = workspaceTool.getDiff(filePath);
      res.json({ diff });
      return;
    }

    res.status(400).json({ error: `Acción de workspace no reconocida: ${action}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
}

// REST route definitions
app.post('/api/run', handleApiRun);
app.post('/api/tasks', handleApiTasks);
app.post('/api/workspace', handleApiWorkspace);

// Code security audit and Cloud Sandbox endpoints
app.post('/api/security/audit', (req: Request, res: Response) => {
  try {
    const code = String(req.body?.content || '');
    const filename = String(req.body?.filename || 'snippet.ts');
    const report = securityAuditTool.auditCode(code, filename);
    res.json(report);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

app.post('/api/sandbox/validate', (req: Request, res: Response) => {
  try {
    const filePath = String(req.body?.path || '');
    if (!filePath) {
      res.status(400).json({ error: 'Falta parámetro "path".' });
      return;
    }
    const result = cloudSandboxTool.validateAndExecute(filePath);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

// Project memory notes
app.get('/api/memory/notes', (_req: Request, res: Response) => {
  res.json({ notes: memory.getProjectNotes() });
});

app.post('/api/memory/notes', (req: Request, res: Response) => {
  try {
    const title = String(req.body?.title || 'Nota');
    const content = String(req.body?.content || '');
    const note = memory.saveProjectNote(title, content);
    res.json({ success: true, note });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

// Legacy parameter compatibility handler: POST /?api=run, /?api=tasks, /?api=workspace
app.post('/', (req: Request, res: Response) => {
  const apiRoute = String(req.query.api || '');
  if (apiRoute === 'run') return handleApiRun(req, res);
  if (apiRoute === 'tasks') return handleApiTasks(req, res);
  if (apiRoute === 'workspace') return handleApiWorkspace(req, res);
  res.status(404).json({ error: 'Ruta API no encontrada.' });
});

// HTML entry point fallback (serves public/index.html)
app.get('*', (_req: Request, res: Response) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`<!doctype html><html><head><title>${Config.appTitle}</title></head><body><h1>${Config.appTitle}</h1><p>Espacio personal de agentes listo.</p></body></html>`);
  }
});

// Start listening on 0.0.0.0:3000
const PORT = 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`AgentSystem platform listening on http://${HOST}:${PORT}`);
});
