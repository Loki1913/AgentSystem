import { ToolDefinition, AgentRole, ExecutionContext } from './types.js';

export type PermissionLevel = 'read' | 'write' | 'execute' | 'destructive' | 'admin';

export interface RegisteredTool {
  id: string;
  name: string;
  description: string;
  category: 'research' | 'browser' | 'files' | 'coding' | 'security' | 'bridge';
  permission: PermissionLevel;
  allowedAgents: AgentRole[];
  definition: ToolDefinition;
  timeoutMs: number;
  isAvailable: boolean;
  requiresExplicitApproval?: boolean;
  execute: (args: Record<string, unknown>, context: ExecutionContext) => Promise<unknown>;
}

export interface ToolExecutionRecord {
  timestamp: string;
  toolId: string;
  agent: AgentRole;
  durationMs: number;
  success: boolean;
  permission: PermissionLevel;
  error?: string;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private auditLog: ToolExecutionRecord[] = [];

  public register(tool: RegisteredTool): void {
    this.tools.set(tool.id, tool);
  }

  public get(id: string): RegisteredTool | undefined {
    return this.tools.get(id);
  }

  public listTools(agent?: AgentRole): RegisteredTool[] {
    const all = Array.from(this.tools.values());
    if (!agent) return all;
    return all.filter(t => t.allowedAgents.includes(agent) && t.isAvailable);
  }

  public getDefinitionsForAgent(agent: AgentRole): ToolDefinition[] {
    return this.listTools(agent).map(t => t.definition);
  }

  public async executeTool(
    toolId: string,
    args: Record<string, unknown>,
    context: ExecutionContext,
    callingAgent: AgentRole
  ): Promise<unknown> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Herramienta no registrada en el Tool Registry: ${toolId}`);
    }

    if (!tool.isAvailable) {
      throw new Error(`La herramienta ${tool.name} está deshabilitada temporalmente.`);
    }

    if (!tool.allowedAgents.includes(callingAgent) && callingAgent !== 'orchestrator') {
      throw new Error(`El agente [${callingAgent}] no tiene permiso para invocar [${toolId}].`);
    }

    // Permission enforcement:
    if (tool.permission === 'write' && !context.allowWorkspaceWrites) {
      throw new Error(`Permiso denegado: La escritura en el workspace no ha sido autorizada por el usuario.`);
    }

    if (tool.permission === 'destructive' && !context.allowWorkspaceWrites) {
      throw new Error(`Operación destructiva denegada: Requiere confirmación explícita del usuario.`);
    }

    const start = Date.now();
    try {
      // Execute with timeout guard
      const resultPromise = tool.execute(args, context);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout de herramienta [${toolId}] (${tool.timeoutMs}ms)`)), tool.timeoutMs)
      );

      const result = await Promise.race([resultPromise, timeoutPromise]);
      const duration = Date.now() - start;

      this.auditLog.push({
        timestamp: new Date().toISOString(),
        toolId,
        agent: callingAgent,
        durationMs: duration,
        success: true,
        permission: tool.permission
      });

      return result;
    } catch (err: unknown) {
      const duration = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.auditLog.push({
        timestamp: new Date().toISOString(),
        toolId,
        agent: callingAgent,
        durationMs: duration,
        success: false,
        permission: tool.permission,
        error: errorMsg
      });
      throw err;
    }
  }

  public getAuditHistory(limit = 50): ToolExecutionRecord[] {
    return this.auditLog.slice(-limit).reverse();
  }
}

export const toolRegistry = new ToolRegistry();
