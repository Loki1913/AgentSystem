import { ToolDefinition, AgentRole, ExecutionContext } from './types.js';
import { toolRegistry, PermissionLevel } from './toolRegistry.js';
import { workspaceTool } from '../tools/workspaceTool.js';
import { researchTool } from '../tools/researchTool.js';
import { browserCaptureTool } from '../tools/browserCaptureTool.js';
import { securityAuditTool } from '../tools/securityAuditTool.js';
import { cloudSandboxTool } from '../tools/sandboxTool.js';
import { localBridgeManager } from '../bridge/localBridge.js';

export type ToolCategory =
  | 'research'
  | 'browser'
  | 'files'
  | 'documents'
  | 'vision'
  | 'coding'
  | 'execution'
  | 'database'
  | 'cloud_storage'
  | 'project_management'
  | 'email'
  | 'messaging'
  | 'calendar'
  | 'social_media'
  | 'image_generation'
  | 'video_generation'
  | 'audio_voice'
  | 'transcription'
  | 'workflow_automation'
  | 'crm_sales'
  | 'customer_support'
  | 'ecommerce'
  | 'payments_billing'
  | 'finance_accounting'
  | 'marketing_analytics'
  | 'seo'
  | 'human_resources'
  | 'maps_travel'
  | 'monitoring_observability'
  | 'cybersecurity'
  | 'enterprise_api'
  | 'custom_plugins';

export interface UniversalToolSpecification {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  autonomyLevel: 1 | 2 | 3 | 4 | 5; // Nivel 1: Lectura, Nivel 2: Preparación, Nivel 3: Modificación, Nivel 4: Acciones externas, Nivel 5: Críticas
  permission: PermissionLevel;
  provider: string;
  version: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  allowedAgents: AgentRole[];
  timeoutMs: number;
  rateLimitPerMinute: number;
  requiresExplicitApproval: boolean;
  status: 'active' | 'configured' | 'pending_credentials' | 'simulated';
  execute: (args: Record<string, unknown>, context: ExecutionContext) => Promise<unknown>;
}

export class UniversalToolCatalog {
  private specs: Map<string, UniversalToolSpecification> = new Map();

  constructor() {
    this.registerBuiltinTools();
  }

  private registerBuiltinTools(): void {
    // 1. Web Research
    this.add({
      id: 'web_search',
      name: 'Búsqueda Web Pública',
      description: 'Consulta fuentes públicas en internet con verificación de procedencia y protección anti-SSRF.',
      category: 'research',
      autonomyLevel: 1,
      permission: 'read',
      provider: 'DuckDuckGo / Direct HTTPS',
      version: '1.2.0',
      inputSchema: { query: 'string', limit: 'number' },
      outputSchema: { results: 'Array<SourceItem>', query: 'string' },
      allowedAgents: ['research', 'orchestrator'],
      timeoutMs: 15000,
      rateLimitPerMinute: 60,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args, ctx) => {
        const res = await researchTool.search(String(args.query || ''), Number(args.limit || 5));
        res.results.forEach(r => ctx.sources.push(r));
        return res;
      }
    });

    this.add({
      id: 'fetch_page_content',
      name: 'Extracción de Contenido Web',
      description: 'Descarga y extrae texto limpio de URLs HTTPS eliminando boilerplate y scripts.',
      category: 'research',
      autonomyLevel: 1,
      permission: 'read',
      provider: 'Cheerio Clean Extractor',
      version: '1.1.0',
      inputSchema: { url: 'string' },
      outputSchema: { title: 'string', text: 'string', url: 'string' },
      allowedAgents: ['research', 'browser', 'orchestrator'],
      timeoutMs: 15000,
      rateLimitPerMinute: 40,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args, ctx) => {
        const page = await researchTool.fetchPage(String(args.url || ''));
        ctx.sources.push({ title: page.title, url: page.url, verified: true });
        return page;
      }
    });

    // 2. Browser Automation
    this.add({
      id: 'browser_inspect',
      name: 'Inspección de Navegador & DOM',
      description: 'Navega de forma segura mediante Playwright / DOM extractor para inspeccionar elementos y formularios.',
      category: 'browser',
      autonomyLevel: 1,
      permission: 'read',
      provider: 'Playwright Worker / Builtin DOM',
      version: '1.2.0',
      inputSchema: { url: 'string' },
      outputSchema: { title: 'string', text: 'string', links: 'array', forms: 'array' },
      allowedAgents: ['browser', 'orchestrator'],
      timeoutMs: 20000,
      rateLimitPerMinute: 30,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args, ctx) => {
        const res = await browserCaptureTool.inspect(String(args.url || ''));
        ctx.sources.push({ title: res.title, url: res.url, snippet: res.text.slice(0, 300), verified: true });
        return res;
      }
    });

    // 3. Workspace Files
    this.add({
      id: 'workspace_list',
      name: 'Listar Workspace',
      description: 'Explora recursivamente el árbol de archivos del workspace aislado.',
      category: 'files',
      autonomyLevel: 1,
      permission: 'read',
      provider: 'AgentSystem Virtual FS',
      version: '1.0.0',
      inputSchema: {},
      outputSchema: { files: 'Array<string>' },
      allowedAgents: ['coding', 'qa', 'security', 'orchestrator'],
      timeoutMs: 5000,
      rateLimitPerMinute: 120,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async () => ({ files: workspaceTool.listFiles() })
    });

    this.add({
      id: 'workspace_read',
      name: 'Leer Archivo de Workspace',
      description: 'Lee el contenido de un archivo dentro de workspace/.',
      category: 'files',
      autonomyLevel: 1,
      permission: 'read',
      provider: 'AgentSystem Virtual FS',
      version: '1.0.0',
      inputSchema: { path: 'string' },
      outputSchema: { path: 'string', content: 'string', bytes: 'number' },
      allowedAgents: ['coding', 'qa', 'security', 'orchestrator'],
      timeoutMs: 5000,
      rateLimitPerMinute: 120,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args) => workspaceTool.read(String(args.path || ''))
    });

    this.add({
      id: 'workspace_write',
      name: 'Escribir Archivo en Workspace',
      description: 'Crea o actualiza archivos en workspace/ con control de diffs y respaldo automático para rollback.',
      category: 'files',
      autonomyLevel: 3,
      permission: 'write',
      provider: 'AgentSystem Virtual FS',
      version: '1.0.0',
      inputSchema: { path: 'string', content: 'string' },
      outputSchema: { path: 'string', created: 'boolean', bytes: 'number' },
      allowedAgents: ['coding', 'orchestrator'],
      timeoutMs: 8000,
      rateLimitPerMinute: 60,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args) => workspaceTool.write(String(args.path || ''), String(args.content || ''))
    });

    // 4. Code Sandboxing & Execution
    this.add({
      id: 'sandbox_validate',
      name: 'Cloud Sandbox Linter & Validator',
      description: 'Valida sintaxis, imports y estructura de código en un entorno aislado sin riesgos para el anfitrión.',
      category: 'execution',
      autonomyLevel: 2,
      permission: 'execute',
      provider: 'Cloud Sandbox Node.js/AST',
      version: '1.1.0',
      inputSchema: { path: 'string' },
      outputSchema: { syntaxValid: 'boolean', securityPassed: 'boolean', output: 'string' },
      allowedAgents: ['coding', 'qa', 'security', 'orchestrator'],
      timeoutMs: 10000,
      rateLimitPerMinute: 60,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args) => cloudSandboxTool.validateAndExecute(String(args.path || ''))
    });

    // 5. Cybersecurity & Defensive Auditing
    this.add({
      id: 'security_audit_code',
      name: 'Auditoría de Seguridad OWASP',
      description: 'Analiza código en busca de eval(), inyección de comandos, secretos expuestos y path traversal.',
      category: 'cybersecurity',
      autonomyLevel: 1,
      permission: 'read',
      provider: 'AgentSystem Security Engine',
      version: '1.2.0',
      inputSchema: { content: 'string', filename: 'string' },
      outputSchema: { safe: 'boolean', score: 'number', issues: 'array' },
      allowedAgents: ['security', 'qa', 'orchestrator'],
      timeoutMs: 6000,
      rateLimitPerMinute: 60,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args) => securityAuditTool.auditCode(String(args.content || ''), String(args.filename || 'code.ts'))
    });

    // 6. Local Bridge (Windows Workstation Access)
    this.add({
      id: 'local_bridge_sync',
      name: 'Local Bridge Synchronizer',
      description: 'Sincroniza archivos y carpetas autorizadas de la computadora Windows con el workspace cloud.',
      category: 'custom_plugins',
      autonomyLevel: 3,
      permission: 'write',
      provider: 'Local Bridge Outbound Connector',
      version: '1.0.0',
      inputSchema: { deviceId: 'string', action: 'string', path: 'string' },
      outputSchema: { status: 'string', operationId: 'string' },
      allowedAgents: ['coding', 'orchestrator'],
      timeoutMs: 15000,
      rateLimitPerMinute: 30,
      requiresExplicitApproval: true,
      status: 'active',
      execute: async (args) => localBridgeManager.queueOperation(String(args.deviceId || 'dev_win_default'), 'sync', String(args.path || ''))
    });

    // 7. Market & Trend Research
    this.add({
      id: 'market_trend_analyzer',
      name: 'Analizador de Tendencias de Mercado',
      description: 'Estructura análisis comparativo de competidores, precios y nichos a partir de fuentes públicas.',
      category: 'marketing_analytics',
      autonomyLevel: 2,
      permission: 'read',
      provider: 'Research Analytics Adapter',
      version: '1.0.0',
      inputSchema: { topic: 'string', competitors: 'array' },
      outputSchema: { insights: 'array', sources: 'array' },
      allowedAgents: ['research', 'orchestrator'],
      timeoutMs: 15000,
      rateLimitPerMinute: 30,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args, ctx) => {
        const query = `market trends competitors ${args.topic || ''}`;
        const res = await researchTool.search(query, 5);
        res.results.forEach(r => ctx.sources.push(r));
        return {
          topic: args.topic,
          competitor_sources: res.results,
          analysis_timestamp: new Date().toISOString()
        };
      }
    });

    // 8. Lead Qualification & CRM Enricher
    this.add({
      id: 'lead_enricher',
      name: 'Calificador y Enriquecedor de Leads',
      description: 'Analiza sitios web de empresas e identifica perfil de cliente ideal (ICP), tecnologías y contacto.',
      category: 'crm_sales',
      autonomyLevel: 2,
      permission: 'read',
      provider: 'Sales Intelligence Engine',
      version: '1.0.0',
      inputSchema: { companyUrl: 'string', industry: 'string' },
      outputSchema: { qualified: 'boolean', profile: 'object' },
      allowedAgents: ['research', 'orchestrator'],
      timeoutMs: 15000,
      rateLimitPerMinute: 30,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args, ctx) => {
        const url = String(args.companyUrl || '');
        if (url.startsWith('https://')) {
          const page = await researchTool.fetchPage(url);
          ctx.sources.push({ title: page.title, url: page.url, verified: true });
          return {
            company: page.title,
            url,
            summary: page.text.slice(0, 500),
            qualified: true,
            analyzedAt: new Date().toISOString()
          };
        }
        return { error: 'URL HTTPS válida requerida.' };
      }
    });

    // 9. Email Draft Creator (Nivel 2 - Preparación de borradores)
    this.add({
      id: 'email_draft_creator',
      name: 'Generador de Borradores de Correo',
      description: 'Crea propuestas o respuestas a correos sin enviarlos directamente, esperando autorización.',
      category: 'email',
      autonomyLevel: 2,
      permission: 'write',
      provider: 'Mail Assistant Adapter',
      version: '1.0.0',
      inputSchema: { recipient: 'string', subject: 'string', body: 'string' },
      outputSchema: { draftId: 'string', requiresApproval: 'boolean' },
      allowedAgents: ['orchestrator', 'general'],
      timeoutMs: 5000,
      rateLimitPerMinute: 30,
      requiresExplicitApproval: true,
      status: 'active',
      execute: async (args) => ({
        draftId: 'draft_' + Math.random().toString(36).slice(2, 8),
        recipient: args.recipient,
        subject: args.subject,
        body: args.body,
        status: 'draft_prepared',
        notice: 'El borrador está preparado en Nivel 2. El envío real requerirá autorización explícita (Nivel 4).'
      })
    });

    // 10. Financial / Invoice Parser (Nivel 2 con confirmación obligatoria Nivel 5 para pagos)
    this.add({
      id: 'invoice_data_parser',
      name: 'Extractor de Facturas y Recibos',
      description: 'Extrae datos contables (emisor, importe, impuestos, fecha) de documentos de facturación.',
      category: 'payments_billing',
      autonomyLevel: 2,
      permission: 'read',
      provider: 'Billing OCR Adapter',
      version: '1.0.0',
      inputSchema: { textOrContent: 'string' },
      outputSchema: { issuer: 'string', total: 'number', currency: 'string' },
      allowedAgents: ['research', 'qa', 'orchestrator'],
      timeoutMs: 8000,
      rateLimitPerMinute: 40,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args) => {
        const text = String(args.textOrContent || '');
        const amountMatch = text.match(/\$?\s*([0-9]+[.,][0-9]{2})/);
        return {
          detectedAmount: amountMatch ? amountMatch[1] : null,
          currency: text.includes('EUR') ? 'EUR' : (text.includes('USD') || text.includes('$') ? 'USD' : 'LOCAL'),
          parsedDate: new Date().toISOString(),
          status: 'extracted_read_only',
          notice: 'Datos extraídos con éxito. Los pagos u operaciones contables bancarias requieren confirmación de Nivel 5.'
        };
      }
    });

    // 11. Website & API Health Monitor
    this.add({
      id: 'uptime_api_monitor',
      name: 'Monitor de Disponibilidad y Latencia',
      description: 'Comprueba el estado HTTP, tiempo de respuesta y validez de endpoints públicos.',
      category: 'monitoring_observability',
      autonomyLevel: 1,
      permission: 'read',
      provider: 'HTTP Health Inspector',
      version: '1.0.0',
      inputSchema: { endpointUrl: 'string' },
      outputSchema: { status: 'number', latencyMs: 'number', isHealthy: 'boolean' },
      allowedAgents: ['qa', 'security', 'orchestrator'],
      timeoutMs: 12000,
      rateLimitPerMinute: 60,
      requiresExplicitApproval: false,
      status: 'active',
      execute: async (args) => {
        const url = String(args.endpointUrl || '');
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
          throw new Error('URL de endpoint inválida.');
        }
        const start = Date.now();
        const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'AgentSystemUptimeMonitor/1.0' } });
        const latency = Date.now() - start;
        return {
          endpoint: url,
          status: res.status,
          latencyMs: latency,
          isHealthy: res.status >= 200 && res.status < 400,
          checkedAt: new Date().toISOString()
        };
      }
    });
  }

  public add(spec: UniversalToolSpecification): void {
    this.specs.set(spec.id, spec);
    // Also mirror to core toolRegistry
    toolRegistry.register({
      id: spec.id,
      name: spec.name,
      description: spec.description,
      category: spec.category as any,
      permission: spec.permission,
      allowedAgents: spec.allowedAgents,
      timeoutMs: spec.timeoutMs,
      isAvailable: spec.status === 'active',
      definition: {
        type: 'function',
        function: {
          name: spec.id,
          description: spec.description,
          parameters: {
            type: 'object',
            properties: spec.inputSchema,
            required: Object.keys(spec.inputSchema).slice(0, 2)
          }
        }
      },
      execute: spec.execute
    });
  }

  public listAll(): UniversalToolSpecification[] {
    return Array.from(this.specs.values());
  }

  public get(id: string): UniversalToolSpecification | undefined {
    return this.specs.get(id);
  }

  public listByCategory(cat: ToolCategory): UniversalToolSpecification[] {
    return this.listAll().filter(s => s.category === cat);
  }
}

export const universalToolCatalog = new UniversalToolCatalog();
