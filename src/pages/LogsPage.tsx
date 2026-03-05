import { useEffect, useState, useMemo } from 'react';
import { logApi, LogEntry } from '@/services/logApi';
import { Loader2, RefreshCw, Ticket, Package, Bot, Settings, ArrowRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }>; class: string }> = {
  status_change:    { label: 'Status Change',    icon: ArrowRight, class: 'text-blue-400 bg-blue-400/10' },
  ai_recommendation:{ label: 'AI',              icon: Bot,        class: 'text-purple-400 bg-purple-400/10' },
  order:            { label: 'Order',            icon: Package,    class: 'text-yellow-400 bg-yellow-400/10' },
  ticket:           { label: 'Ticket',           icon: Ticket,     class: 'text-green-400 bg-green-400/10' },
  system:           { label: 'System',           icon: Settings,   class: 'text-muted-foreground bg-muted/50' },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<LogEntry | null>(null);

  const load = () => {
    setLoading(true);
    logApi.getAll()
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const safeLogs = Array.isArray(logs) ? logs : [];

  const filtered = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    return logs.filter(l => {
      const matchSearch = !search ||
        (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.details || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.performed_by || '').toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || l.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [logs, search, typeFilter]);

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

      {/* Stat strip */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const count = safeLogs.filter(l => l.type === key).length;
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${typeFilter === key ? 'border-primary/50 bg-primary/10' : 'bg-card border-border hover:border-primary/30'}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.class}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none">{count}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="pl-9 bg-card" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || typeFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); }} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No logs match your filters</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log, i) => {
              const cfg = TYPE_CONFIG[log.type] || TYPE_CONFIG.system;
              const Icon = cfg.icon;
              return (
                <div
                  key={log.id ?? `log-${i}`}
                  className={`flex gap-4 p-4 cursor-pointer ${i % 2 === 1 ? 'bg-muted/10' : ''} hover:bg-accent/30 transition-colors`}
                  onClick={() => setSelected(log)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.class}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{log.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{log.details}</p>
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
        {!loading && (
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">{filtered.length} of {safeLogs.length} log entries</div>
        )}
      </div>

      {/* Log detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {selected && (() => {
                const cfg = TYPE_CONFIG[selected.type] || TYPE_CONFIG.system;
                const Icon = cfg.icon;
                return <><div className={`w-7 h-7 rounded-full flex items-center justify-center ${cfg.class}`}><Icon className="h-3.5 w-3.5" /></div>{cfg.label} Event</>;
              })()}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
                <p className="font-medium">{selected.action}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{selected.details}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div><span className="font-medium text-foreground">Performed by</span><br />{selected.performed_by}</div>
                <div><span className="font-medium text-foreground">Time</span><br />{new Date(selected.timestamp).toLocaleString()}</div>
                {selected.entity_id && <div><span className="font-medium text-foreground">Entity</span><br />{selected.entity_type} #{selected.entity_id}</div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
