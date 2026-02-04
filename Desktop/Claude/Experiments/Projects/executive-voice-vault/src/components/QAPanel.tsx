// QA Panel - Only visible in QA mode (?qa=1)
import { useState, useEffect } from 'react';
import { X, Download, Trash2, ChevronDown, ChevronRight, Bug } from 'lucide-react';
import { qaLogger, type QALogEntry } from '../lib/qa';

export function QAPanel() {
  const [logs, setLogs] = useState<QALogEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, error: 0, pending: 0 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [minimized, setMinimized] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'pending'>('all');

  useEffect(() => {
    const update = () => {
      setLogs(qaLogger.getLogs());
      setStats(qaLogger.getStats());
    };
    update();
    return qaLogger.subscribe(update);
  }, []);

  if (!qaLogger.isEnabled()) return null;

  const handleExport = () => {
    const json = qaLogger.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = logs.filter((log) => {
    if (filter === 'error') return log.status === 'error';
    if (filter === 'pending') return log.status === 'pending';
    return true;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700"
      >
        <Bug className="w-4 h-4" />
        QA ({stats.error > 0 ? `${stats.error} errors` : `${stats.total} logs`})
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-[500px] max-h-[50vh] bg-white border-l border-t shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-purple-600 text-white">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <span className="font-semibold">QA Panel</span>
          <span className="text-xs bg-purple-500 px-2 py-0.5 rounded">
            {stats.total} total | {stats.success} ok | {stats.error} err | {stats.pending} pending
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleExport} className="p-1 hover:bg-purple-500 rounded" title="Export JSON">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => qaLogger.clear()} className="p-1 hover:bg-purple-500 rounded" title="Clear">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setMinimized(true)} className="p-1 hover:bg-purple-500 rounded" title="Minimize">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 px-4 py-2 border-b bg-gray-50">
        {(['all', 'error', 'pending'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 text-xs rounded ${
              filter === f ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'error' ? 'Errors Only' : 'Pending'}
          </button>
        ))}
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">No logs yet. Interact with the app.</div>
        ) : (
          <div className="divide-y">
            {filtered.slice().reverse().map((log) => (
              <div key={log.id} className="text-xs">
                <button
                  onClick={() => toggleExpand(log.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  {expanded.has(log.id) ? (
                    <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(log.status)}`}>
                    {log.status}
                  </span>
                  <span className="font-mono text-gray-600 truncate flex-1">{log.action}</span>
                  {log.duration_ms !== undefined && (
                    <span className="text-gray-400">{log.duration_ms}ms</span>
                  )}
                </button>
                {expanded.has(log.id) && (
                  <div className="px-8 pb-2 space-y-1 text-[11px] bg-gray-50">
                    <div><strong>ID:</strong> {log.id}</div>
                    <div><strong>Time:</strong> {log.timestamp}</div>
                    {log.tab && <div><strong>Tab:</strong> {log.tab}</div>}
                    {log.command ? <div><strong>Command:</strong> {String(log.command)}</div> : null}
                    {log.payload ? (
                      <div>
                        <strong>Payload:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                          {JSON.stringify(log.payload as Record<string, unknown>, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                    {log.response_preview && (
                      <div>
                        <strong>Response:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                          {log.response_preview}
                        </pre>
                      </div>
                    )}
                    {log.error && (
                      <div className="text-red-600">
                        <strong>Error:</strong> {log.error}
                        {log.stack && (
                          <pre className="mt-1 p-2 bg-red-50 rounded overflow-auto max-h-32 text-[10px]">
                            {log.stack}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
