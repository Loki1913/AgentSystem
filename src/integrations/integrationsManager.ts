export interface IntegrationService {
  id: string;
  name: string;
  category: 'workspace' | 'messaging' | 'crm_sales' | 'social_media' | 'devops' | 'multimedia' | 'billing';
  description: string;
  authType: 'oauth2' | 'api_key' | 'webhook' | 'local_bridge';
  scopesRequired?: string[];
  status: 'available' | 'configured' | 'pending_credentials' | 'requires_auth' | 'disabled';
  icon: string;
  capabilities: string[];
  lastChecked?: string;
}

export class IntegrationsManager {
  private services: Map<string, IntegrationService> = new Map();

  constructor() {
    this.seedCatalog();
  }

  private seedCatalog(): void {
    const list: IntegrationService[] = [
      // 1. Google Workspace
      {
        id: 'google_workspace',
        name: 'Google Workspace',
        category: 'workspace',
        description: 'Gestión integrada de Gmail, Google Calendar, Google Drive, Google Docs y Sheets.',
        authType: 'oauth2',
        scopesRequired: ['gmail.readonly', 'calendar.events', 'drive.file', 'spreadsheets'],
        status: 'available',
        icon: '📁',
        capabilities: ['Lectura y redacción de correos', 'Eventos de calendario', 'Edición de hojas de cálculo y documentos']
      },
      // 2. Microsoft 365
      {
        id: 'microsoft_365',
        name: 'Microsoft 365 / Graph',
        category: 'workspace',
        description: 'Sincronización con Outlook, OneDrive, Excel y Word.',
        authType: 'oauth2',
        scopesRequired: ['Mail.ReadWrite', 'Calendars.ReadWrite', 'Files.ReadWrite'],
        status: 'available',
        icon: '💼',
        capabilities: ['Gestión de Outlook', 'Sincronización de OneDrive', 'Automatización de libros Excel']
      },
      // 3. Notion
      {
        id: 'notion',
        name: 'Notion API',
        category: 'workspace',
        description: 'Consulta y creación de páginas, bases de datos y bloques de documentación.',
        authType: 'api_key',
        status: 'available',
        icon: '📝',
        capabilities: ['Bases de datos de proyectos', 'Documentación estructurada', 'Gestión de tareas']
      },
      // 4. Slack & Discord
      {
        id: 'slack',
        name: 'Slack Bot & Webhooks',
        category: 'messaging',
        description: 'Envío de notificaciones a canales, recepción de comandos y alertas operativas.',
        authType: 'webhook',
        status: 'configured',
        icon: '💬',
        capabilities: ['Notificaciones de eventos', 'Alertas de caídas de API', 'Reportes periódicos']
      },
      {
        id: 'discord',
        name: 'Discord Webhook Connector',
        category: 'messaging',
        description: 'Alertas en canales de Discord para monitoreo y entregas de agentes.',
        authType: 'webhook',
        status: 'configured',
        icon: '🎮',
        capabilities: ['Alertas de orquestación', 'Publicación de reportes de investigación']
      },
      // 5. GitHub & DevOps
      {
        id: 'github',
        name: 'GitHub API & Git Sandbox',
        category: 'devops',
        description: 'Inspección de repositorios, creación de ramas, commits, pull requests e issues.',
        authType: 'api_key',
        scopesRequired: ['repo', 'workflow'],
        status: 'configured',
        icon: '🐙',
        capabilities: ['Análisis estático de repositorios', 'Generación de PRs', 'Gestión de issues']
      },
      // 6. HubSpot & CRM
      {
        id: 'hubspot',
        name: 'HubSpot CRM',
        category: 'crm_sales',
        description: 'Creación de prospectos (leads), seguimiento de negocios y enriquecimiento comercial.',
        authType: 'api_key',
        status: 'available',
        icon: '📈',
        capabilities: ['Calificación de leads', 'Actualización de deals', 'Historial comercial']
      },
      // 7. WhatsApp Business API
      {
        id: 'whatsapp_business',
        name: 'WhatsApp Business Cloud API',
        category: 'messaging',
        description: 'Atención al cliente automatizada y notificaciones de pedidos transaccionales.',
        authType: 'oauth2',
        status: 'available',
        icon: '📱',
        capabilities: ['Atención al cliente', 'Mensajería transaccional', 'Confirmaciones de servicio']
      },
      // 8. Multimedia: FFmpeg & Video Engine
      {
        id: 'ffmpeg_multimedia',
        name: 'FFmpeg & Multimedia Engine',
        category: 'multimedia',
        description: 'Procesamiento, ensamblaje de clips, extracción de audio y generación de subtítulos.',
        authType: 'local_bridge',
        status: 'configured',
        icon: '🎬',
        capabilities: ['Ensamblado de video', 'Extracción de audio', 'Generación de miniaturas']
      },
      // 9. Facturación y Pagos (Stripe / Invoices)
      {
        id: 'stripe_billing',
        name: 'Stripe Billing & Invoicing',
        category: 'billing',
        description: 'Lectura de cobros y facturas (Nivel 5: Toda transacción financiera exige autorización explícita).',
        authType: 'api_key',
        status: 'requires_auth',
        icon: '💳',
        capabilities: ['Consulta de estado de facturas', 'Conciliación de pagos']
      }
    ];

    list.forEach(svc => this.services.set(svc.id, svc));
  }

  public listAll(): IntegrationService[] {
    return Array.from(this.services.values());
  }

  public get(id: string): IntegrationService | undefined {
    return this.services.get(id);
  }

  public updateStatus(id: string, status: IntegrationService['status']): boolean {
    const s = this.services.get(id);
    if (s) {
      s.status = status;
      s.lastChecked = new Date().toISOString();
      return true;
    }
    return false;
  }
}

export const integrationsManager = new IntegrationsManager();
