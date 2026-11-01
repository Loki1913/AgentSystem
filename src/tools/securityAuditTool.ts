export interface SecurityAuditIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rule: string;
  description: string;
  line?: number;
  snippet?: string;
}

export interface SecurityAuditReport {
  target: string;
  safe: boolean;
  score: number; // 0 to 100
  issues: SecurityAuditIssue[];
  recommendations: string[];
}

export class SecurityAuditTool {
  public auditCode(content: string, filename = 'code.ts'): SecurityAuditReport {
    const issues: SecurityAuditIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // 1. Detect hardcoded secrets
      if (/(api[_-]?key|secret|password|token|bearer)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i.test(line)) {
        issues.push({
          severity: 'CRITICAL',
          rule: 'HARDCODED_SECRET',
          description: 'Posible credencial o token secreto expuesto directamente en el código.',
          line: lineNum,
          snippet: line.trim()
        });
      }

      // 2. Unsafe eval
      if (/\beval\s*\(/.test(line)) {
        issues.push({
          severity: 'CRITICAL',
          rule: 'UNSAFE_EVAL',
          description: 'Uso peligroso de eval(), susceptible a inyección de código arbitrario.',
          line: lineNum,
          snippet: line.trim()
        });
      }

      // 3. Command execution with variables
      if (/(child_process|exec|spawn|system|passthru|shell_exec)\s*\(.*[+`$]/.test(line)) {
        issues.push({
          severity: 'HIGH',
          rule: 'COMMAND_INJECTION_RISK',
          description: 'Concatenación no sanitizada en llamada a comandos de shell.',
          line: lineNum,
          snippet: line.trim()
        });
      }

      // 4. Path traversal vulnerabilities
      if (/(\.\.\/|\.\.\\)/.test(line) && /(fs|path|file_get_contents|open)\b/.test(line)) {
        issues.push({
          severity: 'HIGH',
          rule: 'PATH_TRAVERSAL_RISK',
          description: 'Referencia a rutas relativas ascendentes (..) que pueden escapar del directorio seguro.',
          line: lineNum,
          snippet: line.trim()
        });
      }

      // 5. Raw SQL concatenation
      if (/(SELECT|INSERT|UPDATE|DELETE)\s+.*(\+.*['"]|['"]\s*\+)/i.test(line)) {
        issues.push({
          severity: 'HIGH',
          rule: 'SQL_INJECTION_RISK',
          description: 'Consulta SQL construida mediante concatenación directa en vez de parámetros preparados.',
          line: lineNum,
          snippet: line.trim()
        });
      }
    }

    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const highCount = issues.filter(i => i.severity === 'HIGH').length;
    const mediumCount = issues.filter(i => i.severity === 'MEDIUM').length;

    let score = 100 - criticalCount * 40 - highCount * 20 - mediumCount * 10;
    score = Math.max(0, Math.min(100, score));

    const recommendations: string[] = [];
    if (criticalCount > 0) recommendations.push('Extraer credenciales a variables de entorno (.env).');
    if (issues.some(i => i.rule === 'UNSAFE_EVAL')) recommendations.push('Reemplazar eval() por análisis estructurado JSON.parse() o lógica explícita.');
    if (issues.some(i => i.rule === 'COMMAND_INJECTION_RISK')) recommendations.push('Utilizar APIs nativas con arreglos de argumentos y sanitización estricta.');
    if (issues.some(i => i.rule === 'PATH_TRAVERSAL_RISK')) recommendations.push('Validar que las rutas canónicas residan estrictamente dentro del workspace.');
    if (recommendations.length === 0) recommendations.push('El código analizado no presenta vulnerabilidades críticas obvias.');

    return {
      target: filename,
      safe: criticalCount === 0 && highCount === 0,
      score,
      issues,
      recommendations
    };
  }
}

export const securityAuditTool = new SecurityAuditTool();
