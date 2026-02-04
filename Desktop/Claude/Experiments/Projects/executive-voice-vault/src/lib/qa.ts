// QA Instrumentation for Voice Vault
// Enable with ?qa=1 query param

export interface QALogEntry {
  id: string;
  timestamp: string;
  type: 'action' | 'invoke' | 'error';
  tab?: string;
  action: string;
  command?: string;
  payload?: unknown;
  status: 'pending' | 'success' | 'error';
  duration_ms?: number;
  response_preview?: string;
  error?: string;
  stack?: string;
}

class QALogger {
  private logs: QALogEntry[] = [];
  private listeners: Set<() => void> = new Set();
  private enabled: boolean = false;
  private idCounter: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Enable via ?qa=1 or localStorage
      this.enabled = params.get('qa') === '1' || localStorage.getItem('qa_mode') === '1';
      if (this.enabled) {
        console.log('[QA Mode] Enabled - logging all actions and invoke calls');
      }
      // Always expose toggle function
      (window as unknown as { qaLogger: QALogger; enableQA: () => void; disableQA: () => void }).qaLogger = this;
      (window as unknown as { enableQA: () => void }).enableQA = () => {
        localStorage.setItem('qa_mode', '1');
        console.log('[QA Mode] Enabled. Reload the page to activate.');
      };
      (window as unknown as { disableQA: () => void }).disableQA = () => {
        localStorage.removeItem('qa_mode');
        console.log('[QA Mode] Disabled. Reload the page to deactivate.');
      };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private generateId(): string {
    return `qa-${Date.now()}-${++this.idCounter}`;
  }

  logAction(tab: string, action: string, payload?: unknown): string {
    if (!this.enabled) return '';
    const entry: QALogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'action',
      tab,
      action,
      payload,
      status: 'success',
    };
    this.logs.push(entry);
    console.log(`[QA Action] ${tab} > ${action}`, payload);
    this.notify();
    return entry.id;
  }

  startInvoke(command: string, payload?: unknown): string {
    if (!this.enabled) return '';
    const entry: QALogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'invoke',
      action: `invoke:${command}`,
      command,
      payload,
      status: 'pending',
    };
    this.logs.push(entry);
    console.log(`[QA Invoke Start] ${command}`, payload);
    this.notify();
    return entry.id;
  }

  completeInvoke(id: string, response: unknown, duration_ms: number): void {
    if (!this.enabled || !id) return;
    const entry = this.logs.find((e) => e.id === id);
    if (entry) {
      entry.status = 'success';
      entry.duration_ms = duration_ms;
      entry.response_preview = JSON.stringify(response).slice(0, 200);
      console.log(`[QA Invoke Complete] ${entry.command} (${duration_ms}ms)`, response);
      this.notify();
    }
  }

  failInvoke(id: string, error: Error, duration_ms: number): void {
    if (!this.enabled || !id) return;
    const entry = this.logs.find((e) => e.id === id);
    if (entry) {
      entry.status = 'error';
      entry.duration_ms = duration_ms;
      entry.error = error.message;
      entry.stack = error.stack;
      console.error(`[QA Invoke Error] ${entry.command} (${duration_ms}ms)`, error);
      this.notify();
    }
  }

  logError(tab: string, action: string, error: Error): void {
    if (!this.enabled) return;
    const entry: QALogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'error',
      tab,
      action,
      status: 'error',
      error: error.message,
      stack: error.stack,
    };
    this.logs.push(entry);
    console.error(`[QA Error] ${tab} > ${action}`, error);
    this.notify();
  }

  getLogs(): QALogEntry[] {
    return [...this.logs];
  }

  getStats(): { total: number; success: number; error: number; pending: number } {
    return {
      total: this.logs.length,
      success: this.logs.filter((e) => e.status === 'success').length,
      error: this.logs.filter((e) => e.status === 'error').length,
      pending: this.logs.filter((e) => e.status === 'pending').length,
    };
  }

  clear(): void {
    this.logs = [];
    this.notify();
  }

  exportJSON(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        stats: this.getStats(),
        logs: this.logs,
      },
      null,
      2
    );
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const qaLogger = new QALogger();

// Wrap the Tauri invoke function for instrumentation
export function createInstrumentedInvoke(
  originalInvoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
): <T>(cmd: string, args?: Record<string, unknown>) => Promise<T> {
  return async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    const start = performance.now();
    const logId = qaLogger.startInvoke(cmd, args);
    try {
      const result = await originalInvoke<T>(cmd, args);
      const duration = Math.round(performance.now() - start);
      qaLogger.completeInvoke(logId, result, duration);
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      qaLogger.failInvoke(logId, error as Error, duration);
      throw error;
    }
  };
}
