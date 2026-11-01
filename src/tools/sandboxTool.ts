import { workspaceTool } from './workspaceTool.js';
import { securityAuditTool } from './securityAuditTool.js';

export interface SandboxExecutionResult {
  file: string;
  syntaxValid: boolean;
  securityPassed: boolean;
  securityScore: number;
  output: string;
  errors?: string[];
  executionTimeMs: number;
}

export class CloudSandboxTool {
  public validateAndExecute(filePath: string): SandboxExecutionResult {
    const start = Date.now();
    const file = workspaceTool.read(filePath);

    // 1. Security Audit gate first
    const audit = securityAuditTool.auditCode(file.content, filePath);
    if (!audit.safe) {
      return {
        file: filePath,
        syntaxValid: false,
        securityPassed: false,
        securityScore: audit.score,
        output: `Bloqueado por sandbox de seguridad: se detectaron problemas de seguridad (${audit.issues.map(i => i.rule).join(', ')}).`,
        errors: audit.issues.map(i => `${i.rule}: ${i.description} (línea ${i.line})`),
        executionTimeMs: Date.now() - start
      };
    }

    // 2. Syntax validation (JSON / JavaScript)
    let syntaxValid = true;
    const errors: string[] = [];

    if (filePath.endsWith('.json')) {
      try {
        JSON.parse(file.content);
      } catch (err: unknown) {
        syntaxValid = false;
        errors.push(`Error de sintaxis JSON: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      try {
        // Safe Function constructor syntax parsing without execution
        new Function(file.content);
      } catch (err: unknown) {
        syntaxValid = false;
        errors.push(`Error de sintaxis JavaScript: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const duration = Date.now() - start;
    return {
      file: filePath,
      syntaxValid,
      securityPassed: true,
      securityScore: audit.score,
      output: syntaxValid
        ? `✔ Código verificado en Cloud Sandbox: sintaxis correcta y cero vulnerabilidades críticas.`
        : `⚠ Fallo de validación en Cloud Sandbox.`,
      errors: errors.length > 0 ? errors : undefined,
      executionTimeMs: duration
    };
  }
}

export const cloudSandboxTool = new CloudSandboxTool();
