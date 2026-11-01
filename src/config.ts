import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

export class Config {
  public static get(key: string, defaultValue = ''): string {
    const val = process.env[key];
    return typeof val === 'string' && val.trim() !== '' ? val.trim() : defaultValue;
  }

  public static requireValue(key: string): string {
    const val = this.get(key);
    if (!val) {
      throw new Error(`Configuración requerida ausente: ${key}`);
    }
    return val;
  }

  public static int(key: string, defaultValue: number, min: number, max: number): number {
    const raw = this.get(key, String(defaultValue));
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) return defaultValue;
    return Math.max(min, Math.min(max, parsed));
  }

  public static bool(key: string, defaultValue = false): boolean {
    const raw = this.get(key, String(defaultValue)).toLowerCase();
    return raw === 'true' || raw === '1' || raw === 'yes';
  }

  public static get openRouterApiKey(): string {
    return this.get('OPENROUTER_API_KEY');
  }

  public static get openRouterBaseUrl(): string {
    return this.get('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1');
  }

  public static get defaultModel(): string {
    return this.get('OPENROUTER_MODEL', 'nvidia/nemotron-3-ultra-550b-a55b:free');
  }

  public static get visionModel(): string {
    return this.get('OPENROUTER_VISION_MODEL', 'meta-llama/llama-3.2-11b-vision-instruct:free');
  }

  public static get codingModel(): string {
    return this.get('OPENROUTER_CODING_MODEL', 'qwen/qwen-2.5-coder-32b-instruct:free');
  }

  public static get enableReasoning(): boolean {
    return this.bool('OPENROUTER_ENABLE_REASONING', true);
  }

  public static get reasoningEffort(): string {
    return this.get('OPENROUTER_REASONING_EFFORT', 'high');
  }

  public static get localBridgeSecret(): string {
    return this.get('LOCAL_BRIDGE_SECRET', 'bridge_sec_agent_system_2026');
  }

  public static get appTitle(): string {
    return this.get('OPENROUTER_APP_TITLE', 'AgentSystem');
  }

  public static get browserWorkerUrl(): string {
    return this.get('BROWSER_WORKER_URL', 'http://127.0.0.1:8091');
  }

  public static get browserWorkerToken(): string {
    return this.get('BROWSER_WORKER_TOKEN', '');
  }

  public static get maxTokens(): number {
    return this.int('AGENT_MAX_TOKENS', 4000, 128, 16000);
  }

  public static get timeout(): number {
    return this.int('OPENROUTER_TIMEOUT', 90, 10, 180);
  }

  public static get port(): number {
    return this.int('PORT', 3000, 1000, 65535);
  }
}
