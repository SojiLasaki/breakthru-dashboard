import { useEffect, useState, useMemo } from 'react';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { useAiTutor } from '@/context/AiTutorContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Search, Bot, Plus, ArrowUpDown, Info } from 'lucide-react';

const STATUS_CLASSES: Record<string, string> = {
  open: 'status-open',
  in_progress: 'status-in-progress',
  closed: 'status-closed',
  urgent: 'status-urgent',
};

const PRIORITY_CLASSES: Record<string, string> = {
  low: 'text-muted-foreground bg-muted/50 border border-border',
  medium: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20',
  high: 'text-orange-400 bg-orange-400/10 border border-orange-400/20',
  critical: 'text-primary bg-primary/10 border border-primary/20',
};

type SortField = 'ticket_id' | 'status' | 'priority' | 'created_at';

export default function TicketsPage() {
  const { user, isRole } = useAuth();
  const { openTutor } = useAiTutor();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Ticket | null>(null);

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : '';
  const isTech = isRole('engine_technician', 'electrical_technician');
  const isCustomer = isRole('customer');

  // Role label shown under the title
  const scopeLabel = isTech
    ? `Showing tickets assigned to you (${fullName})`
    : isCustomer
    ? `Showing tickets you submitted`
    : 'Showing all tickets';

  useEffect(() => {
    ticketApi.getAll().then(all => {
      // Filter server-side (or client-side as fallback)
      let scoped = all;
      if (isTech) {
        scoped = all.filter(t => t.assigned_technician === fullName);
      } else if (isCustomer) {
        scoped = all.filter(t => t.created_by === fullName);
      }
      setTickets(scoped);
    }).finally(() => setLoading(false));
  }, [isTech, isCustomer, fullName]);

  const filtered = useMemo(() => {
    return tickets
      .filter(t => {
        const matchSearch = !search || t.ticket_id.toLowerCase().includes(search.toLowerCase()) || t.title.toLowerCase().includes(search.toLowerCase()) || t.assigned_technician.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || t.status === statusFilter;
        const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
        return matchSearch && matchStatus && matchPriority;
      })
      .sort((a, b) => {
        const va = a[sortField] as string;
        const vb = b[sortField] as string;
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
  }, [tickets, search, statusFilter, priorityFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tickets</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Info className="h-3 w-3 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">{scopeLabel}</p>
          </div>
        </div>
        {isRole('admin', 'office_staff') && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  { label: 'Ticket ID', field: 'ticket_id' as SortField },
                  { label: 'Title', field: null },
                  { label: 'Status', field: 'status' as SortField },
                  { label: 'Priority', field: 'priority' as SortField },
                  { label: 'Technician', field: null },
                  { label: 'Created', field: 'created_at' as SortField },
                  { label: 'Actions', field: null },
                ].map(({ label, field }) => (
                  <th key={label} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    {field ? (
                      <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-foreground">
                        {label} <ArrowUpDown className="h-3 w-3" />
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No tickets found</td></tr>
              ) : filtered.map((t, i) => (
                <tr key={t.id} className={`border-b border-border hover:bg-accent/30 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-muted/10' : ''}`} onClick={() => setSelected(t)}>
                  <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{t.ticket_id}</td>
                  <td className="px-4 py-3 text-xs max-w-48 truncate">{t.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${STATUS_CLASSES[t.status]}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full capitalize ${PRIORITY_CLASSES[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.assigned_technician}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary" onClick={e => { e.stopPropagation(); openTutor(t.id, t.title); }}>
                      <Bot className="h-3 w-3" /> AI Guide
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          {filtered.length} of {tickets.length} tickets
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-primary text-sm">{selected?.ticket_id}</span>
              {selected?.title}
            </DialogTitle>
            <DialogDescription>{selected?.category}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${STATUS_CLASSES[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
                <span className={`text-[10px] font-medium px-2 py-1 rounded-full capitalize ${PRIORITY_CLASSES[selected.priority]}`}>{selected.priority}</span>
              </div>
              <p className="text-muted-foreground text-xs">{selected.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Technician:</span> <span className="ml-1">{selected.assigned_technician}</span></div>
                <div><span className="text-muted-foreground">Created by:</span> <span className="ml-1">{selected.created_by}</span></div>
                <div><span className="text-muted-foreground">Created:</span> <span className="ml-1">{new Date(selected.created_at).toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Updated:</span> <span className="ml-1">{new Date(selected.updated_at).toLocaleString()}</span></div>
              </div>
              <Button className="w-full gap-2 bg-primary hover:bg-primary/90 mt-2" onClick={() => { openTutor(selected.id, selected.title); setSelected(null); }}>
                <Bot className="h-4 w-4" /> Open AI Tutor for this Ticket
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
