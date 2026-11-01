import fs from 'node:fs';
import path from 'node:path';

export interface FileDiff {
  path: string;
  created: boolean;
  bytes: number;
  previousContent: string;
  currentContent: string;
  timestamp: string;
}

export class WorkspaceTool {
  private root: string;
  private history: Map<string, FileDiff[]> = new Map();

  constructor(customRoot?: string) {
    this.root = customRoot || path.join(process.cwd(), 'workspace');
    this.ensureRoot();
  }

  private ensureRoot(): void {
    try {
      if (!fs.existsSync(this.root)) {
        fs.mkdirSync(this.root, { recursive: true });
      }
      this.root = fs.realpathSync(this.root);
    } catch {
      // Fallback
    }
  }

  public listFiles(): string[] {
    this.ensureRoot();
    const results: string[] = [];
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.gitkeep') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const rel = path.relative(this.root, fullPath).split(path.sep).join('/');
          results.push(rel);
          if (results.length >= 500) return;
        }
      }
    };

    walk(this.root);
    return results.sort();
  }

  public read(filePath: string): { path: string; content: string; bytes: number } {
    const target = this.resolve(filePath, false);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      throw new Error(`El archivo no existe o no es un archivo regular: ${filePath}`);
    }
    const stat = fs.statSync(target);
    if (stat.size > 250_000) {
      throw new Error('Archivo demasiado grande (máximo 250 KB).');
    }
    const content = fs.readFileSync(target, 'utf-8');
    return { path: filePath, content, bytes: stat.size };
  }

  public write(filePath: string, content: string): FileDiff {
    if (content.length > 250_000) {
      throw new Error('Contenido demasiado grande (máximo 250 KB).');
    }
    const target = this.resolve(filePath, true);
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const exists = fs.existsSync(target);
    const oldContent = exists ? fs.readFileSync(target, 'utf-8') : '';

    fs.writeFileSync(target, content, 'utf-8');

    const diff: FileDiff = {
      path: filePath,
      created: !exists,
      bytes: Buffer.byteLength(content, 'utf-8'),
      previousContent: oldContent.slice(0, 20000),
      currentContent: content.slice(0, 20000),
      timestamp: new Date().toISOString()
    };

    const fileHistory = this.history.get(filePath) || [];
    fileHistory.push(diff);
    this.history.set(filePath, fileHistory);

    return diff;
  }

  public rollback(filePath: string): { success: boolean; message: string } {
    const fileHistory = this.history.get(filePath);
    if (!fileHistory || fileHistory.length === 0) {
      throw new Error(`No hay historial de cambios previo para revertir en: ${filePath}`);
    }
    const lastChange = fileHistory.pop()!;
    const target = this.resolve(filePath, true);

    if (lastChange.created) {
      // It was newly created, so delete it
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
      return { success: true, message: `Archivo ${filePath} eliminado (revertido a estado inexistente).` };
    } else {
      fs.writeFileSync(target, lastChange.previousContent, 'utf-8');
      return { success: true, message: `Archivo ${filePath} restaurado a la versión previa.` };
    }
  }

  public getDiff(filePath: string): FileDiff | null {
    const fileHistory = this.history.get(filePath);
    if (!fileHistory || fileHistory.length === 0) return null;
    return fileHistory[fileHistory.length - 1];
  }

  private resolve(filePath: string, allowNew: boolean): string {
    const cleanPath = filePath.replace(/\\/g, '/').trim();
    if (!cleanPath || cleanPath.includes('\0') || cleanPath.startsWith('/') || /^[A-Za-z]:/.test(cleanPath)) {
      throw new Error('Ruta de archivo inválida.');
    }
    const parts = cleanPath.split('/');
    for (const part of parts) {
      if (!part || part === '.' || part === '..') {
        throw new Error('La ruta no puede salir del workspace aislado.');
      }
    }
    const target = path.join(this.root, ...parts);
    if (!allowNew && !fs.existsSync(target)) {
      throw new Error(`El archivo solicitado no existe en workspace/: ${cleanPath}`);
    }
    return target;
  }
}

export const workspaceTool = new WorkspaceTool();
