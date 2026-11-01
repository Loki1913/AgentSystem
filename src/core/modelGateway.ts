import { Config } from '../config.js';
import { ChatMessage, ToolDefinition } from './types.js';

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      reasoning?: string;
      reasoning_details?: unknown[];
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    completion_tokens_details?: {
      reasoning_tokens?: number;
      image_tokens?: number;
      audio_tokens?: number;
    };
  };
}

export class ModelGateway {
  public async rawChat(
    messages: ChatMessage[],
    customModel?: string | null,
    tools?: ToolDefinition[]
  ): Promise<ChatCompletionResponse> {
    const apiKey = Config.openRouterApiKey;
    const model = customModel || Config.defaultModel;

    if (apiKey && apiKey.trim() !== '') {
      return this.callOpenRouter(messages, model, tools, apiKey);
    }

    return this.simulateAutonomousAgentResponse(messages, model, tools);
  }

  private async callOpenRouter(
    messages: ChatMessage[],
    model: string,
    tools: ToolDefinition[] | undefined,
    apiKey: string
  ): Promise<ChatCompletionResponse> {
    const baseUrl = Config.openRouterBaseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    const referer = Config.get('OPENROUTER_HTTP_REFERER');
    if (referer) headers['HTTP-Referer'] = referer;
    const title = Config.get('OPENROUTER_APP_TITLE', 'AgentSystem');
    if (title) headers['X-Title'] = title;

    // Preserve reasoning_details in previous assistant messages for multi-round reasoning
    const cleanedMessages = messages.map(msg => {
      const formatted: Record<string, unknown> = {
        role: msg.role,
        content: msg.content
      };
      if (msg.name) formatted.name = msg.name;
      if (msg.tool_call_id) formatted.tool_call_id = msg.tool_call_id;
      if (msg.tool_calls) formatted.tool_calls = msg.tool_calls;
      if (msg.reasoning_details) formatted.reasoning_details = msg.reasoning_details;
      return formatted;
    });

    const payload: Record<string, unknown> = {
      model,
      messages: cleanedMessages,
      temperature: 0.2,
      max_tokens: Config.maxTokens
    };

    // Enable thinking / reasoning tokens for Nemotron 3 Ultra and compatible models
    if (Config.enableReasoning) {
      payload.reasoning = {
        effort: Config.reasoningEffort || 'high'
      };
    }

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Config.timeout * 1000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const raw = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`OpenRouter devolvió una respuesta no JSON: ${raw.slice(0, 300)}`);
      }

      if (!response.ok) {
        const errObj = data as { error?: { message?: string } };
        const msg = errObj?.error?.message || `HTTP ${response.status}: ${raw.slice(0, 300)}`;
        throw new Error(`OpenRouter: ${msg}`);
      }

      return data as ChatCompletionResponse;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Timeout agotado al conectar con OpenRouter (${Config.timeout}s).`);
      }
      throw err;
    }
  }

  private async simulateAutonomousAgentResponse(
    messages: ChatMessage[],
    model: string,
    tools?: ToolDefinition[]
  ): Promise<ChatCompletionResponse> {
    const lastMsg = messages[messages.length - 1];
    const userMsg = [...messages].reverse().find(m => m.role === 'user');
    let userText = '';

    if (userMsg && userMsg.content) {
      if (typeof userMsg.content === 'string') {
        userText = userMsg.content;
      } else if (Array.isArray(userMsg.content)) {
        userText = userMsg.content
          .filter(p => p.type === 'text' && p.text)
          .map(p => p.text)
          .join('\n');
      }
    }

    const isToolResult = lastMsg && lastMsg.role === 'tool';
    const hasTools = tools && tools.length > 0;

    if (!isToolResult && hasTools) {
      const toolNames = tools.map(t => t.function.name);

      if (toolNames.includes('web_search') && (userText.toLowerCase().includes('buscar') || userText.toLowerCase().includes('investig') || userText.length > 5)) {
        const query = userText.replace(/investiga|busca|acerca de|sobre/gi, '').trim() || userText;
        return {
          id: 'sim-' + Date.now(),
          model: `${model} (motor local)`,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `Procedo a consultar las fuentes de información pública para responder a tu requerimiento con datos verificados.`,
                reasoning: `El usuario solicita investigación. Activando herramienta de búsqueda web.`,
                tool_calls: [
                  {
                    id: 'call_search_' + Date.now(),
                    type: 'function',
                    function: {
                      name: 'web_search',
                      arguments: JSON.stringify({ query: query.slice(0, 100), limit: 4 })
                    }
                  }
                ]
              },
              finish_reason: 'tool_calls'
            }
          ]
        };
      }
    }

    let synthesizedContent = '';
    if (isToolResult) {
      synthesizedContent = `Información de herramientas integrada exitosamente en el contexto.`;
    } else {
      synthesizedContent = `### AgentSystem — Respuesta de Orquestación\n\nHe procesado tu requerimiento: **"${userText || 'Tarea recibida'}"**.\n\nEspecialistas asignados coordinados correctamente.`;
    }

    return {
      id: 'sim-' + Date.now(),
      model: `${model} (motor local)`,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: synthesizedContent,
            reasoning: `Paso de razonamiento autónomo completado.`
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 280,
        total_tokens: 400,
        completion_tokens_details: {
          reasoning_tokens: 45
        }
      }
    };
  }
}
