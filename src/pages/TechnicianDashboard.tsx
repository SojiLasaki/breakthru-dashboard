import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Ticket as TicketIcon, AlertCircle, Wrench, CheckCircle2,
  Clock, ArrowUpDown, Eye, Loader2,
} from 'lucide-react';

const STATUS_CLASSES: Record<string, string> = {
  open:              'status-open',
  assigned:          'status-open',
  in_progress:       'status-in-progress',
  awaiting_parts:    'status-in-progress',
  awaiting_approval: 'status-urgent',
  completed:         'status-closed',
};

const PRIORITY_CLASSES: Record<string, string> = {
  low:    'text-muted-foreground bg-muted/50 border border-border',
  medium: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20',
  high:   'text-orange-400 bg-orange-400/10 border border-orange-400/20',
  severe: 'text-primary bg-primary/10 border border-primary/20',
};

type SortField = 'priority' | 'created_at';

const PRIORITY_ORDER: Record<string, number> = { severe: 0, high: 1, medium: 2, low: 3 };

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : '';

  useEffect(() => {
    ticketApi.getAll().then(all => {
      setAllTickets(all.filter(t => t.assigned_to === fullName));
    }).finally(() => setLoading(false));
  }, [fullName]);

  const activeTickets = useMemo(() =>
    allTickets.filter(t => t.status !== 'completed'), [allTickets]);

  const filtered = useMemo(() =>
    activeTickets
      .filter(t => {
        const q = search.toLowerCase();
        const matchSearch = !search || t.ticket_id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || t.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortField === 'priority') {
          const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          return sortDir === 'asc' ? diff : -diff;
        }
        return sortDir === 'asc'
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at);
      }),
    [activeTickets, search, statusFilter, sortField, sortDir]
  );

  const openCount = activeTickets.filter(t => t.status === 'open' || t.status === 'assigned').length;
  const inProgressCount = activeTickets.filter(t => t.status === 'in_progress').length;
  const urgentCount = activeTickets.filter(t => t.priority === 'severe' || t.priority === 'high').length;
  const completedCount = allTickets.filter(t => t.status === 'completed').length;

  const statCards = [
    { label: 'Active Tickets', value: activeTickets.length, icon: TicketIcon, color: 'text-[hsl(var(--info))]', bg: 'bg-[hsl(var(--info))]/10' },
    { label: 'In Progress', value: inProgressCount, icon: Wrench, color: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning))]/10' },
    { label: 'Urgent / High', value: urgentCount, icon: AlertCircle, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success))]/10' },
  ];

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'priority' ? 'asc' : 'desc'); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Welcome back, {user?.first_name}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Here are your active service tickets.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent>
              </Card>
            ))
          : statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="bg-card border-border card-hover">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ticket ID, title, or customer..." className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-card"><SelectValue placeholder="Filter Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Active</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="awaiting_parts">Awaiting Parts</SelectItem>
            <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-10" onClick={() => toggleSort('priority')}>
          <ArrowUpDown className="h-3.5 w-3.5" /> Severity
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-10" onClick={() => toggleSort('created_at')}>
          <ArrowUpDown className="h-3.5 w-3.5" /> Date
        </Button>
      </div>

      {/* Ticket Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <TicketIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold mb-1">No Active Tickets</p>
            <p className="text-muted-foreground text-sm">You're all caught up! No tickets match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(t => (
            <Card
              key={t.id}
              className="bg-card border-border card-hover cursor-pointer group"
              onClick={() => navigate(`/tickets/${t.id}`)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-primary font-semibold">{t.ticket_id}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5 truncate">{t.title}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full capitalize flex-shrink-0 ml-2 ${PRIORITY_CLASSES[t.priority]}`}>
                    {t.priority === 'severe' ? 'Critical' : t.priority}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{t.customer}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Badge className={`text-[10px] ${STATUS_CLASSES[t.status]}`}>
                    {t.status.replace(/_/g, ' ')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => { e.stopPropagation(); navigate(`/tickets/${t.id}`); }}
                  >
                    <Eye className="h-3 w-3" /> View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
