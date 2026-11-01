export type AgentRole =
  | 'orchestrator'
  | 'research'
  | 'coding'
  | 'vision'
  | 'browser'
  | 'qa'
  | 'security'
  | 'general';

export type TaskMode =
  | 'orchestrated'
  | 'general'
  | 'research'
  | 'coding'
  | 'vision'
  | 'browser'
  | 'qa_security';

export interface MessageContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | MessageContentPart[] | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  reasoning?: string;
  reasoning_details?: unknown[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

export interface Tool {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>, context: ExecutionContext) => Promise<unknown>;
}

export interface ExecutionContext {
  mode: TaskMode;
  allowWorkspaceWrites: boolean;
  taskId: string;
  model: string;
  usedTools: string[];
  sources: SourceItem[];
  log: (agent: AgentRole, message: string, details?: unknown) => void;
  reasoningChunks?: string[];
}

export interface SourceItem {
  title: string;
  url: string;
  snippet?: string;
  verified?: boolean;
}

export interface PlanStep {
  id: number;
  title: string;
  assignedAgent: AgentRole;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: string;
  toolsUsed?: string[];
  reasoning?: string;
}

export interface ExecutionPlan {
  goal: string;
  steps: PlanStep[];
  estimatedDifficulty?: 'baja' | 'media' | 'alta';
}

export interface AgentActivityLog {
  timestamp: string;
  agent: AgentRole;
  action: string;
  details?: unknown;
}

export interface TaskResult {
  id: string;
  answer: string;
  reasoning?: string;
  reasoning_details?: unknown[];
  reasoning_tokens?: number;
  mode: TaskMode;
  model: string;
  plan?: ExecutionPlan;
  agentLogs: AgentActivityLog[];
  sources: SourceItem[];
  tools_used: string[];
  tool_rounds: number;
  duration_ms: number;
  status: 'success' | 'error' | 'partial';
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    reasoning_tokens?: number;
  } | null;
  filesModified?: string[];
}

export interface TaskLogEntry {
  id: string;
  at: string;
  mode: string;
  status: string;
  model: string;
  tools: string[];
  duration_ms: number;
  plan_steps_count?: number;
  summary?: string;
}
