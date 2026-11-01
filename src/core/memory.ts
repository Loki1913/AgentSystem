import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { TaskLogEntry, SourceItem } from './types.js';

export interface KnowledgeItem {
  id: string;
  topic: string;
  summary: string;
  sources: SourceItem[];
  createdAt: string;
}

export interface ProjectNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export class MemoryStore {
  private storageDir: string;
  private taskLogPath: string;
  private projectMemoryPath: string;
  private knowledgePath: string;
  private inMemoryTasks: TaskLogEntry[] = [];
  private inMemoryKnowledge: KnowledgeItem[] = [];
  private inMemoryNotes: ProjectNote[] = [];

  constructor(customStorageDir?: string) {
    this.storageDir = customStorageDir || path.join(process.cwd(), 'storage');
    this.taskLogPath = path.join(this.storageDir, 'tasks.jsonl');
    this.projectMemoryPath = path.join(this.storageDir, 'project_memory.json');
    this.knowledgePath = path.join(this.storageDir, 'knowledge_base.json');
    this.ensureStorageDir();
    this.loadState();
  }

  private ensureStorageDir(): void {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch {
      // Ephemeral fallback
    }
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.projectMemoryPath)) {
        const raw = fs.readFileSync(this.projectMemoryPath, 'utf-8');
        this.inMemoryNotes = JSON.parse(raw);
      }
    } catch {
      this.inMemoryNotes = [];
    }

    try {
      if (fs.existsSync(this.knowledgePath)) {
        const raw = fs.readFileSync(this.knowledgePath, 'utf-8');
        this.inMemoryKnowledge = JSON.parse(raw);
      }
    } catch {
      this.inMemoryKnowledge = [];
    }
  }

  // --- Task Log ---
  public recordTask(
    mode: string,
    status: string,
    model: string,
    tools: string[] = [],
    durationMs = 0,
    planStepsCount = 0,
    summary = ''
  ): TaskLogEntry {
    this.ensureStorageDir();
    const entry: TaskLogEntry = {
      id: crypto.randomBytes(8).toString('hex'),
      at: new Date().toISOString(),
      mode: mode.slice(0, 30),
      status: status.slice(0, 20),
      model: model.slice(0, 120),
      tools: Array.from(new Set(tools.map(t => String(t).slice(0, 50)))).slice(0, 30),
      duration_ms: Math.max(0, durationMs),
      plan_steps_count: planStepsCount,
      summary: summary.slice(0, 200)
    };

    this.inMemoryTasks.unshift(entry);
    if (this.inMemoryTasks.length > 100) this.inMemoryTasks.pop();

    try {
      fs.appendFileSync(this.taskLogPath, JSON.stringify(entry) + '\n', 'utf-8');
    } catch {
      // In-memory array will still serve the response
    }

    return entry;
  }

  public getRecentTasks(limit = 30): TaskLogEntry[] {
    const maxLimit = Math.max(1, Math.min(100, limit));
    try {
      if (fs.existsSync(this.taskLogPath)) {
        const content = fs.readFileSync(this.taskLogPath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const entries: TaskLogEntry[] = [];
        for (const line of lines.slice(-maxLimit)) {
          try {
            entries.push(JSON.parse(line));
          } catch {
            // ignore malformed line
          }
        }
        return entries.reverse();
      }
    } catch {
      // fallback to memory
    }
    return this.inMemoryTasks.slice(0, maxLimit);
  }

  // --- Project Memory ---
  public getProjectNotes(): ProjectNote[] {
    return [...this.inMemoryNotes];
  }

  public saveProjectNote(title: string, content: string): ProjectNote {
    this.ensureStorageDir();
    const existing = this.inMemoryNotes.find(n => n.title.toLowerCase() === title.toLowerCase());
    let note: ProjectNote;
    if (existing) {
      existing.content = content;
      existing.updatedAt = new Date().toISOString();
      note = existing;
    } else {
      note = {
        id: crypto.randomBytes(6).toString('hex'),
        title: title.slice(0, 120),
        content,
        updatedAt: new Date().toISOString()
      };
      this.inMemoryNotes.push(note);
    }

    try {
      fs.writeFileSync(this.projectMemoryPath, JSON.stringify(this.inMemoryNotes, null, 2), 'utf-8');
    } catch {
      // Memory fallback
    }
    return note;
  }

  // --- Knowledge Base ---
  public addKnowledge(topic: string, summary: string, sources: SourceItem[]): KnowledgeItem {
    this.ensureStorageDir();
    const item: KnowledgeItem = {
      id: crypto.randomBytes(6).toString('hex'),
      topic: topic.slice(0, 120),
      summary,
      sources,
      createdAt: new Date().toISOString()
    };
    this.inMemoryKnowledge.unshift(item);
    if (this.inMemoryKnowledge.length > 50) this.inMemoryKnowledge.pop();

    try {
      fs.writeFileSync(this.knowledgePath, JSON.stringify(this.inMemoryKnowledge, null, 2), 'utf-8');
    } catch {
      // Memory fallback
    }
    return item;
  }

  public getRecentKnowledge(limit = 10): KnowledgeItem[] {
    return this.inMemoryKnowledge.slice(0, limit);
  }

  public clearAll(): void {
    this.inMemoryTasks = [];
    this.inMemoryKnowledge = [];
    this.inMemoryNotes = [];
    try {
      if (fs.existsSync(this.taskLogPath)) fs.unlinkSync(this.taskLogPath);
      if (fs.existsSync(this.projectMemoryPath)) fs.unlinkSync(this.projectMemoryPath);
      if (fs.existsSync(this.knowledgePath)) fs.unlinkSync(this.knowledgePath);
    } catch {
      // ignore
    }
  }
}

export const memory = new MemoryStore();
