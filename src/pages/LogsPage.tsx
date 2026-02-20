import { useEffect, useState } from 'react';
import { logApi, LogEntry } from '@/services/logApi';
import { Loader2, RefreshCw, Ticket, Package, Bot, Settings, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  status_change: { label: 'Status Change', icon: ArrowRight, class: 'text-blue-400 bg-blue-400/10' },
  ai_recommendation: { label: 'AI', icon: Bot, class: 'text-purple-400 bg-purple-400/10' },
  order: { label: 'Order', icon: Package, class: 'text-yellow-400 bg-yellow-400/10' },
  ticket: { label: 'Ticket', icon: Ticket, class: 'text-green-400 bg-green-400/10' },
  system: { label: 'System', icon: Settings, class: 'text-muted-foreground bg-muted/50' },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    logApi.getAll().then(setLogs).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Activity Logs</h1>
          <p className="text-muted-foreground text-sm">System events, status changes, and AI recommendations</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log, i) => {
              const cfg = TYPE_CONFIG[log.type] || TYPE_CONFIG.system;
              const Icon = cfg.icon;
              return (
                <div key={log.id} className={`flex gap-4 p-4 ${i % 2 === 1 ? 'bg-muted/10' : ''} hover:bg-accent/30 transition-colors`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.class}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{log.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{log.performed_by}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${cfg.class} font-medium`}>{cfg.label}</span>
                      {log.entity_id && <span className="text-[10px] font-mono text-muted-foreground">{log.entity_type} #{log.entity_id}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
