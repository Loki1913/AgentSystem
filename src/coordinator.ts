import { Config } from './config.js';
import { ModelGateway } from './core/modelGateway.js';
import { memory } from './core/memory.js';
import {
  AgentActivityLog,
  AgentRole,
  ExecutionContext,
  ExecutionPlan,
  PlanStep,
  SourceItem,
  TaskMode,
  TaskResult
} from './core/types.js';
import {
  BrowserAgent,
  CodingAgent,
  OrchestratorAgent,
  QAAgent,
  ResearchAgent,
  SecurityAgent,
  VisionAgent
} from './agents/specializedAgents.js';
import { toolRegistry } from './core/toolRegistry.js';
import { workspaceTool } from './tools/workspaceTool.js';
import { researchTool } from './tools/researchTool.js';
import { browserCaptureTool } from './tools/browserCaptureTool.js';
import { securityAuditTool } from './tools/securityAuditTool.js';
import { cloudSandboxTool } from './tools/sandboxTool.js';
import crypto from 'node:crypto';

// Initialize Tool Registry tools
toolRegistry.register({
  id: 'web_search',
  name: 'Búsqueda Web Pública',
  description: 'Busca páginas públicas en DuckDuckGo con protección anti-SSRF.',
  category: 'research',
  permission: 'read',
  allowedAgents: ['research', 'orchestrator'],
  timeoutMs: 15000,
  isAvailable: true,
  definition: {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Busca información en internet y devuelve enlaces y citas.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' }, limit: { type: 'number' } },
        required: ['query']
      }
    }
  },
  execute: async (args, ctx) => {
    const res = await researchTool.search(String(args.query || ''), Number(args.limit || 5));
    res.results.forEach(r => ctx.sources.push(r));
    return res;
  }
});

toolRegistry.register({
  id: 'workspace_list',
  name: 'Listar Workspace',
  description: 'Lista recursivamente los archivos del workspace aislado.',
  category: 'files',
  permission: 'read',
  allowedAgents: ['coding', 'qa', 'security', 'orchestrator'],
  timeoutMs: 5000,
  isAvailable: true,
  definition: {
    type: 'function',
    function: { name: 'workspace_list', description: 'Lista archivos en workspace/', parameters: { type: 'object', properties: {} } }
  },
  execute: async () => ({ files: workspaceTool.listFiles() })
});

toolRegistry.register({
  id: 'workspace_write',
  name: 'Escribir Archivo en Workspace',
  description: 'Crea o actualiza un archivo en workspace/ con diff y respaldo para rollback.',
  category: 'coding',
  permission: 'write',
  allowedAgents: ['coding', 'orchestrator'],
  timeoutMs: 8000,
  isAvailable: true,
  definition: {
    type: 'function',
    function: {
      name: 'workspace_write',
      description: 'Escribe un archivo en workspace/',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' }, content: { type: 'string' } },
        required: ['path', 'content']
      }
    }
  },
  execute: async (args) => workspaceTool.write(String(args.path || ''), String(args.content || ''))
});

toolRegistry.register({
  id: 'sandbox_validate',
  name: 'Cloud Sandbox Linter & Validator',
  description: 'Valida sintaxis y seguridad de código en un entorno aislado.',
  category: 'coding',
  permission: 'execute',
  allowedAgents: ['coding', 'qa', 'security', 'orchestrator'],
  timeoutMs: 10000,
  isAvailable: true,
  definition: {
    type: 'function',
    function: {
      name: 'sandbox_validate',
      description: 'Ejecuta validación y linting en sandbox',
      parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
    }
  },
  execute: async (args) => cloudSandboxTool.validateAndExecute(String(args.path || ''))
});

export class Coordinator {
  private gateway = new ModelGateway();
  private orchestrator = new OrchestratorAgent(this.gateway);
  private researchAgent = new ResearchAgent(this.gateway);
  private codingAgent = new CodingAgent(this.gateway);
  private browserAgent = new BrowserAgent(this.gateway);
  private qaAgent = new QAAgent(this.gateway);
  private securityAgent = new SecurityAgent(this.gateway);
  private visionAgent = new VisionAgent(this.gateway);

  public async run(
    task: string,
    mode: TaskMode = 'orchestrated',
    imageDataUrl?: string | null,
    allowWorkspaceWrites = false,
    customModel?: string | null
  ): Promise<TaskResult> {
    const cleanTask = (task || '').trim();
    if (!cleanTask && !imageDataUrl) {
      throw new Error('La tarea debe incluir instrucciones o una imagen.');
    }
    if (cleanTask.length > 25000) {
      throw new Error('La tarea supera el límite máximo de 25.000 caracteres.');
    }

    const taskId = crypto.randomBytes(8).toString('hex');
    const startTime = Date.now();
    const usedTools: string[] = [];
    const sources: SourceItem[] = [];
    const agentLogs: AgentActivityLog[] = [];
    const filesModified: string[] = [];
    let reasoningChain = '';
    let totalReasoningTokens = 0;

    const log = (agent: AgentRole, action: string, details?: unknown) => {
      agentLogs.push({
        timestamp: new Date().toISOString(),
        agent,
        action,
        details
      });
    };

    const selectedModel = customModel || Config.defaultModel;

    const context: ExecutionContext = {
      mode,
      allowWorkspaceWrites,
      taskId,
      model: selectedModel,
      usedTools,
      sources,
      log
    };

    log('orchestrator', `Nueva tarea iniciada en modo "${mode}".`, { taskId, model: selectedModel });

    try {
      // 1. Multimodal Vision Mode
      if (imageDataUrl) {
        log('vision', 'Procesando análisis visual con modelo multimodal...');
        const visionRes = await this.visionAgent.analyzeImage(
          cleanTask || 'Describe y analiza esta imagen en detalle.',
          imageDataUrl,
          context
        );

        const duration = Date.now() - startTime;
        memory.recordTask(mode, 'success', selectedModel, context.usedTools, duration, 1, cleanTask);

        return {
          id: taskId,
          answer: visionRes.answer,
          mode: 'vision',
          model: selectedModel,
          agentLogs,
          sources: context.sources,
          tools_used: context.usedTools,
          tool_rounds: 1,
          duration_ms: duration,
          status: 'success'
        };
      }

      // 2. Direct Browser Inspection Mode
      if (mode === 'browser') {
        const urlMatch = cleanTask.match(/https:\/\/[^\s"',;>)]+/i);
        if (!urlMatch) {
          throw new Error('El modo navegador requiere una URL HTTPS pública en el texto de la tarea.');
        }
        const targetUrl = urlMatch[0];
        log('browser', `Inspeccionando URL: ${targetUrl}`);

        const browserRun = await this.browserAgent.run(`Inspecciona la página: ${targetUrl}`, context);

        const duration = Date.now() - startTime;
        memory.recordTask(mode, 'success', selectedModel, context.usedTools, duration, 1, cleanTask);

        return {
          id: taskId,
          answer: browserRun.answer,
          mode: 'browser',
          model: selectedModel,
          agentLogs,
          sources: context.sources,
          tools_used: context.usedTools,
          tool_rounds: 1,
          duration_ms: duration,
          status: 'success'
        };
      }

      // 3. Direct Research Mode
      if (mode === 'research') {
        log('research', `Ejecutando investigación con fuentes verificadas.`);
        const researchRun = await this.researchAgent.run(cleanTask, context);

        const duration = Date.now() - startTime;
        memory.recordTask(mode, 'success', selectedModel, context.usedTools, duration, 1, cleanTask);

        return {
          id: taskId,
          answer: researchRun.answer,
          mode: 'research',
          model: selectedModel,
          agentLogs,
          sources: context.sources,
          tools_used: context.usedTools,
          tool_rounds: 1,
          duration_ms: duration,
          status: 'success'
        };
      }

      // 4. Direct Coding Mode
      if (mode === 'coding') {
        log('coding', `Ejecutando tareas de código en workspace/ (escritura: ${allowWorkspaceWrites ? 'habilitada' : 'deshabilitada'}).`);
        const codingRun = await this.codingAgent.run(cleanTask, context);
        if (codingRun.filesModified) {
          filesModified.push(...codingRun.filesModified);
        }

        // QA validation step with Cloud Sandbox
        log('qa', `Ejecutando validación en Cloud Sandbox de cambios realizados.`);
        const qaRun = await this.qaAgent.run(`Verifica que la tarea se cumplió adecuadamente: "${cleanTask}"`, context);

        const combinedAnswer = `${codingRun.answer}\n\n---\n### Dictamen de QA y Sandbox\n${qaRun.answer}`;
        const duration = Date.now() - startTime;
        memory.recordTask(mode, 'success', selectedModel, context.usedTools, duration, 2, cleanTask);

        return {
          id: taskId,
          answer: combinedAnswer,
          mode: 'coding',
          model: selectedModel,
          agentLogs,
          sources: context.sources,
          tools_used: context.usedTools,
          tool_rounds: 2,
          duration_ms: duration,
          status: 'success',
          filesModified
        };
      }

      // 5. Direct Security & QA Audit Mode
      if (mode === 'qa_security') {
        log('security', `Iniciando auditoría de seguridad del workspace.`);
        const secRun = await this.securityAgent.run(cleanTask, context);
        log('qa', `Ejecutando validación de calidad y requisitos.`);
        const qaRun = await this.qaAgent.run(cleanTask, context);

        const combined = `### Informe de Auditoría de Ciberseguridad\n${secRun.answer}\n\n### Reporte de QA\n${qaRun.answer}`;
        const duration = Date.now() - startTime;
        memory.recordTask(mode, 'success', selectedModel, context.usedTools, duration, 2, cleanTask);

        return {
          id: taskId,
          answer: combined,
          mode: 'qa_security',
          model: selectedModel,
          agentLogs,
          sources: context.sources,
          tools_used: context.usedTools,
          tool_rounds: 2,
          duration_ms: duration,
          status: 'success'
        };
      }

      // 6. Direct General Assistant Mode (direct conversational reasoning)
      if (mode === 'general') {
        log('general', 'Procesando consulta con Nemotron 3 Ultra...');
        const chatRes = await this.gateway.rawChat(
          [
            {
              role: 'system',
              content: 'Eres el asistente principal de AgentSystem. Responde con precisión, rigor técnico y claridad.'
            },
            {
              role: 'user',
              content: cleanTask
            }
          ],
          selectedModel
        );

        const choice = chatRes.choices[0]?.message;
        const answer = choice?.content || 'Sin respuesta.';
        const reasoning = choice?.reasoning;
        const reasoningTokens = chatRes.usage?.completion_tokens_details?.reasoning_tokens;
        const duration = Date.now() - startTime;
        memory.recordTask(mode, 'success', selectedModel, [], duration, 1, cleanTask);

        return {
          id: taskId,
          answer,
          reasoning,
          reasoning_tokens: reasoningTokens,
          mode: 'general',
          model: selectedModel,
          agentLogs,
          sources: context.sources,
          tools_used: [],
          tool_rounds: 1,
          duration_ms: duration,
          status: 'success'
        };
      }

      // 7. Autonomous Multi-Agent Orchestration Mode ('orchestrated')
      log('orchestrator', 'Diseñando plan de ejecución multiagente estructurado...');
      const planSteps: PlanStep[] = await this.orchestrator.generatePlan(cleanTask, mode);
      const plan: ExecutionPlan = {
        goal: cleanTask,
        steps: planSteps,
        estimatedDifficulty: planSteps.length > 3 ? 'alta' : 'media'
      };

      const stepOutputs: string[] = [];

      for (const step of plan.steps) {
        step.status = 'running';
        log(step.assignedAgent, `Iniciando paso ${step.id}: ${step.title}`);

        try {
          let stepResultText = '';
          if (step.assignedAgent === 'research') {
            const r = await this.researchAgent.run(cleanTask, context);
            stepResultText = r.answer;
          } else if (step.assignedAgent === 'coding') {
            const r = await this.codingAgent.run(cleanTask, context);
            stepResultText = r.answer;
            if (r.filesModified) filesModified.push(...r.filesModified);
          } else if (step.assignedAgent === 'browser') {
            const r = await this.browserAgent.run(cleanTask, context);
            stepResultText = r.answer;
          } else if (step.assignedAgent === 'security') {
            const r = await this.securityAgent.run(cleanTask, context);
            stepResultText = r.answer;
          } else if (step.assignedAgent === 'qa') {
            const r = await this.qaAgent.run(`Verifica la calidad y cumplimiento del objetivo: ${cleanTask}`, context);
            stepResultText = r.answer;
          } else {
            // Orchestrator thinking with Nemotron 3 Ultra
            const chatRes = await this.gateway.rawChat(
              [
                {
                  role: 'system',
                  content: 'Eres el orquestador principal de AgentSystem. Razona con rigor, analiza dependencias y sintetiza conclusiones claras y verificables.'
                },
                {
                  role: 'user',
                  content: `Objetivo: ${cleanTask}\nPaso actual: ${step.title}\nContexto previo:\n${stepOutputs.join('\n\n')}`
                }
              ],
              selectedModel
            );

            const choiceMsg = chatRes.choices[0]?.message;
            stepResultText = choiceMsg?.content || 'Paso completado.';
            if (choiceMsg?.reasoning) {
              reasoningChain += `\n[Paso ${step.id} - ${step.title}]:\n${choiceMsg.reasoning}\n`;
              step.reasoning = choiceMsg.reasoning;
            }
            if (chatRes.usage?.completion_tokens_details?.reasoning_tokens) {
              totalReasoningTokens += chatRes.usage.completion_tokens_details.reasoning_tokens;
            }
          }

          step.status = 'completed';
          step.result = stepResultText;
          stepOutputs.push(`**Paso ${step.id} (${step.title})**:\n${stepResultText}`);
          log(step.assignedAgent, `Paso ${step.id} completado con éxito.`);
        } catch (stepErr: unknown) {
          step.status = 'failed';
          const errMsg = stepErr instanceof Error ? stepErr.message : String(stepErr);
          step.result = `Error: ${errMsg}`;
          log(step.assignedAgent, `Fallo en paso ${step.id}: ${errMsg}`);
          stepOutputs.push(`**Paso ${step.id} (${step.title})**: ⚠️ ${errMsg}`);
        }
      }

      // Generate final consolidated synthesis with Orchestrator
      log('orchestrator', 'Consolidando resultados finales y generando dictamen integral...');
      const finalChatRes = await this.gateway.rawChat(
        [
          {
            role: 'system',
            content: 'Eres el orquestador principal de AgentSystem. Presenta la entrega final estructurada, detallando logros, fuentes verificadas, modificaciones de archivos y recomendaciones técnicas.'
          },
          {
            role: 'user',
            content: `Objetivo original del usuario: ${cleanTask}\n\nResultados acumulados de los agentes:\n${stepOutputs.join('\n\n---\n\n')}`
          }
        ],
        selectedModel
      );

      const finalChoice = finalChatRes.choices[0]?.message;
      let finalSynthesis = finalChoice?.content || stepOutputs.join('\n\n---\n\n');
      if (finalChoice?.reasoning) {
        reasoningChain += `\n[Síntesis Final]:\n${finalChoice.reasoning}\n`;
      }
      if (finalChatRes.usage?.completion_tokens_details?.reasoning_tokens) {
        totalReasoningTokens += finalChatRes.usage.completion_tokens_details.reasoning_tokens;
      }

      const duration = Date.now() - startTime;
      memory.recordTask(mode, 'success', selectedModel, context.usedTools, duration, plan.steps.length, cleanTask);

      if (context.sources.length > 0) {
        memory.addKnowledge(cleanTask.slice(0, 80), finalSynthesis.slice(0, 500), context.sources);
      }

      return {
        id: taskId,
        answer: finalSynthesis,
        reasoning: reasoningChain.trim() || undefined,
        reasoning_tokens: totalReasoningTokens > 0 ? totalReasoningTokens : undefined,
        mode,
        model: selectedModel,
        plan,
        agentLogs,
        sources: context.sources,
        tools_used: context.usedTools,
        tool_rounds: plan.steps.length,
        duration_ms: duration,
        status: 'success',
        filesModified
      };
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      log('orchestrator', `Error en la tarea: ${errorMsg}`);
      memory.recordTask(mode, 'error', selectedModel, context.usedTools, duration, 0, cleanTask);
      throw err;
    }
  }

  public getRecentTasks(limit = 30) {
    return memory.getRecentTasks(limit);
  }
}

export const coordinator = new Coordinator();
