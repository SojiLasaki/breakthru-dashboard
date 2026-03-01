import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isToday } from 'date-fns';
import {
  Plus, Search, CalendarDays, TableProperties, ChevronLeft, ChevronRight,
  Clock, Users, Loader2, CalendarIcon, Download, Eye, Pencil, Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { scheduleApi, getScheduleStatus, formatDuration, parseDuration, type Schedule, type ScheduleStatus } from '@/services/scheduleApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Status helpers ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; className: string }> = {
  upcoming:  { label: 'Upcoming',  className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  ongoing:   { label: 'Ongoing',   className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  completed: { label: 'Completed', className: 'bg-muted text-muted-foreground border-border' },
  overdue:   { label: 'Overdue',   className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

function StatusBadge({ schedule }: { schedule: Schedule }) {
  const status = getScheduleStatus(schedule.scheduled_time, schedule.duration);
  const cfg = STATUS_CONFIG[status];
  return <Badge variant="outline" className={cn('text-[10px] font-semibold', cfg.className)}>{cfg.label}</Badge>;
}

// ── Technician color map (for calendar) ───────────────────────────────────

const TECH_COLORS = [
  'bg-blue-500/20 border-blue-500/40 text-blue-300',
  'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  'bg-amber-500/20 border-amber-500/40 text-amber-300',
  'bg-purple-500/20 border-purple-500/40 text-purple-300',
  'bg-pink-500/20 border-pink-500/40 text-pink-300',
  'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
];

function getTechColor(techId: string, allTechs: string[]): string {
  const idx = allTechs.indexOf(techId);
  return TECH_COLORS[idx % TECH_COLORS.length];
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = isRole('admin', 'office');

  // ── State ──
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [search, setSearch] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('all');
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortAsc, setSortAsc] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date());

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Data ──
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => scheduleApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Schedule deleted' });
    },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  const createMutation = useMutation({
    mutationFn: (p: Partial<Schedule>) => scheduleApi.create(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Schedule created' });
      setFormOpen(false);
    },
    onError: () => toast({ title: 'Create failed', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...p }: Partial<Schedule> & { id: string }) => scheduleApi.update(id, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Schedule updated' });
      setEditSchedule(null);
    },
    onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
  });

  // ── Derived ──
  const uniqueTechs = useMemo(() => [...new Set(schedules.map(s => s.technician_name))].sort(), [schedules]);
  const uniqueCustomers = useMemo(() => [...new Set(schedules.map(s => s.customer_name))].sort(), [schedules]);
  const allTechIds = useMemo(() => [...new Set(schedules.map(s => s.technician))], [schedules]);

  const filtered = useMemo(() => {
    let list = schedules;

    // RBAC filtering
    if (isRole('technician')) {
      list = list.filter(s => s.technician === user?.id?.toString());
    } else if (isRole('customer')) {
      list = list.filter(s => s.customer === user?.id?.toString());
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.customer_name.toLowerCase().includes(q) ||
        s.technician_name.toLowerCase().includes(q) ||
        (s.ticket_id && s.ticket_id.toLowerCase().includes(q)) ||
        s.description.toLowerCase().includes(q)
      );
    }
    if (filterTechnician !== 'all') list = list.filter(s => s.technician_name === filterTechnician);
    if (filterCustomer !== 'all') list = list.filter(s => s.customer_name === filterCustomer);
    if (filterStatus !== 'all') list = list.filter(s => getScheduleStatus(s.scheduled_time, s.duration) === filterStatus);

    list = [...list].sort((a, b) => {
      const diff = new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
      return sortAsc ? diff : -diff;
    });

    return list;
  }, [schedules, search, filterTechnician, filterCustomer, filterStatus, sortAsc, user, isRole]);

  // ── Summary cards ──
  const todaySchedules = useMemo(() => schedules.filter(s => isToday(new Date(s.scheduled_time))), [schedules]);
  const totalHoursByTech = useMemo(() => {
    const map: Record<string, number> = {};
    schedules.forEach(s => {
      const hrs = parseDuration(s.duration) / 3600000;
      map[s.technician_name] = (map[s.technician_name] || 0) + hrs;
    });
    return map;
  }, [schedules]);

  // ── CSV Export ──
  const exportCsv = useCallback(() => {
    const header = 'Date,Time,Duration,Customer,Technician,Ticket,Status,Description';
    const rows = filtered.map(s => {
      const d = new Date(s.scheduled_time);
      return [
        format(d, 'yyyy-MM-dd'), format(d, 'HH:mm'), formatDuration(s.duration),
        `"${s.customer_name}"`, `"${s.technician_name}"`, s.ticket_id ?? '',
        getScheduleStatus(s.scheduled_time, s.duration), `"${s.description.replace(/"/g, '""')}"`,
      ].join(',');
    });
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `schedules-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  // ── Calendar helpers ──
  const calDays = useMemo(() => {
    const monthStart = startOfMonth(calMonth);
    const monthEnd = endOfMonth(calMonth);
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  }, [calMonth]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage technician appointments and service schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Schedule
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><CalendarDays className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Schedules</p><p className="text-xl font-bold text-foreground">{schedules.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10"><Clock className="h-5 w-5 text-emerald-500" /></div>
          <div><p className="text-xs text-muted-foreground">Today</p><p className="text-xl font-bold text-foreground">{todaySchedules.length}</p></div>
        </CardContent></Card>
        {Object.entries(totalHoursByTech).slice(0, 2).map(([name, hrs]) => (
          <Card key={name}><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-xs text-muted-foreground truncate">{name}</p><p className="text-xl font-bold text-foreground">{hrs.toFixed(1)}h</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* ── Filters & View Toggle ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search schedules…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Select value={filterTechnician} onValueChange={setFilterTechnician}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Technician" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technicians</SelectItem>
            {uniqueTechs.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterCustomer} onValueChange={setFilterCustomer}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Customer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {uniqueCustomers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 ml-auto bg-muted rounded-lg p-0.5">
          <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('table')}>
            <TableProperties className="h-4 w-4 mr-1" /> Table
          </Button>
          <Button variant={view === 'calendar' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('calendar')}>
            <CalendarIcon className="h-4 w-4 mr-1" /> Calendar
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium">No schedules yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first schedule to get started.</p>
        </div>
      ) : view === 'table' ? (
        <TableView
          data={filtered}
          sortAsc={sortAsc}
          onToggleSort={() => setSortAsc(v => !v)}
          onView={setDetailSchedule}
          onEdit={canEdit ? setEditSchedule : undefined}
          onDelete={canEdit ? (s) => setDeleteId(s.id) : undefined}
        />
      ) : (
        <CalendarView
          data={filtered}
          calMonth={calMonth}
          calDays={calDays}
          allTechIds={allTechIds}
          onPrev={() => setCalMonth(m => subMonths(m, 1))}
          onNext={() => setCalMonth(m => addMonths(m, 1))}
          onEventClick={setDetailSchedule}
        />
      )}

      {/* ── Modals ── */}
      <ScheduleDetailModal schedule={detailSchedule} onClose={() => setDetailSchedule(null)} />

      <ScheduleFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(p) => createMutation.mutate(p)}
        loading={createMutation.isPending}
        title="New Schedule"
      />

      {editSchedule && (
        <ScheduleFormModal
          open
          onClose={() => setEditSchedule(null)}
          onSubmit={(p) => updateMutation.mutate({ id: editSchedule.id, ...p })}
          loading={updateMutation.isPending}
          title="Edit Schedule"
          initial={editSchedule}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(v) => { if (!v) setDeleteId(null); }}
        onConfirm={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}
        title="Delete Schedule"
        description="This action cannot be undone. This schedule will be permanently removed."
      />
    </div>
  );
}

// ── Table View ─────────────────────────────────────────────────────────────

function TableView({ data, sortAsc, onToggleSort, onView, onEdit, onDelete }: {
  data: Schedule[];
  sortAsc: boolean;
  onToggleSort: () => void;
  onView: (s: Schedule) => void;
  onEdit?: (s: Schedule) => void;
  onDelete?: (s: Schedule) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap" onClick={onToggleSort}>
                Date & Time {sortAsc ? '↑' : '↓'}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Duration</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Technician</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Ticket</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Description</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => (
              <tr key={s.id} className={cn('border-b border-border transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{format(new Date(s.scheduled_time), 'MMM d, yyyy')}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(s.scheduled_time), 'h:mm a')}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDuration(s.duration)}</td>
                <td className="px-4 py-3 text-foreground">{s.customer_name}</td>
                <td className="px-4 py-3 text-foreground">{s.technician_name}</td>
                <td className="px-4 py-3">{s.ticket_id ? <Badge variant="outline" className="text-[10px]">{s.ticket_id}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-3 max-w-[200px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block truncate text-muted-foreground">{s.description}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs"><p className="text-xs">{s.description}</p></TooltipContent>
                  </Tooltip>
                </td>
                <td className="px-4 py-3"><StatusBadge schedule={s} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(s)}><Eye className="h-3.5 w-3.5" /></Button>
                    {onEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>}
                    {onDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(s)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Calendar View ──────────────────────────────────────────────────────────

function CalendarView({ data, calMonth, calDays, allTechIds, onPrev, onNext, onEventClick }: {
  data: Schedule[];
  calMonth: Date;
  calDays: Date[];
  allTechIds: string[];
  onPrev: () => void;
  onNext: () => void;
  onEventClick: (s: Schedule) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="text-sm font-semibold text-foreground">{format(calMonth, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="icon" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {calDays.map(day => {
          const daySchedules = data.filter(s => isSameDay(new Date(s.scheduled_time), day));
          const isCurrentMonth = day.getMonth() === calMonth.getMonth();
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'bg-card min-h-[90px] p-1.5 transition-colors',
                !isCurrentMonth && 'opacity-40',
                isToday(day) && 'ring-1 ring-primary ring-inset',
              )}
            >
              <span className={cn(
                'text-[11px] font-medium',
                isToday(day) ? 'text-primary font-bold' : 'text-foreground',
              )}>
                {format(day, 'd')}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {daySchedules.slice(0, 3).map(s => (
                  <button
                    key={s.id}
                    onClick={() => onEventClick(s)}
                    className={cn(
                      'w-full text-left text-[10px] px-1 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity',
                      getTechColor(s.technician, allTechIds),
                    )}
                  >
                    {format(new Date(s.scheduled_time), 'h:mm a')} {s.technician_name.split(' ')[0]}
                  </button>
                ))}
                {daySchedules.length > 3 && (
                  <span className="text-[9px] text-muted-foreground pl-1">+{daySchedules.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────────────

function ScheduleDetailModal({ schedule, onClose }: { schedule: Schedule | null; onClose: () => void }) {
  if (!schedule) return null;
  const s = schedule;
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Details</DialogTitle>
          <DialogDescription>Viewing schedule information</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium text-foreground">{format(new Date(s.scheduled_time), 'PPP')}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium text-foreground">{format(new Date(s.scheduled_time), 'h:mm a')}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium text-foreground">{formatDuration(s.duration)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium text-foreground">{s.customer_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Technician</span><span className="font-medium text-foreground">{s.technician_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ticket</span><span className="font-medium text-foreground">{s.ticket_id ?? '—'}</span></div>
          <div className="flex justify-between items-center"><span className="text-muted-foreground">Status</span><StatusBadge schedule={s} /></div>
          {s.description && (
            <div className="pt-2 border-t border-border">
              <p className="text-muted-foreground text-xs mb-1">Description</p>
              <p className="text-foreground">{s.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Form Modal ─────────────────────────────────────────────────────────────

function ScheduleFormModal({ open, onClose, onSubmit, loading, title, initial }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: Partial<Schedule>) => void;
  loading: boolean;
  title: string;
  initial?: Schedule;
}) {
  const [customerName, setCustomerName] = useState(initial?.customer_name ?? '');
  const [techName, setTechName] = useState(initial?.technician_name ?? '');
  const [ticketId, setTicketId] = useState(initial?.ticket_id ?? '');
  const [scheduledTime, setScheduledTime] = useState(initial ? format(new Date(initial.scheduled_time), "yyyy-MM-dd'T'HH:mm") : '');
  const [durationH, setDurationH] = useState(initial ? String(parseInt(initial.duration.split(':')[0])) : '1');
  const [durationM, setDurationM] = useState(initial ? String(parseInt(initial.duration.split(':')[1])) : '0');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    if (!customerName || !techName || !scheduledTime) {
      setError('Customer, technician, and time are required.');
      return;
    }
    if (new Date(scheduledTime) < new Date()) {
      setError('Cannot schedule in the past.');
      return;
    }
    const h = parseInt(durationH) || 0;
    const m = parseInt(durationM) || 0;
    if (h === 0 && m === 0) {
      setError('Duration must be at least 1 minute.');
      return;
    }
    onSubmit({
      customer_name: customerName,
      technician_name: techName,
      ticket_id: ticketId || null,
      scheduled_time: new Date(scheduledTime).toISOString(),
      duration: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
      description,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Fill in the schedule details below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Input placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Technician *</Label>
            <Input placeholder="Technician name" value={techName} onChange={e => setTechName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Ticket (optional)</Label>
            <Input placeholder="e.g. TK-001" value={ticketId} onChange={e => setTicketId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Scheduled Time *</Label>
            <Input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <Input type="number" min={0} max={24} className="w-20" value={durationH} onChange={e => setDurationH(e.target.value)} />
                <span className="text-xs text-muted-foreground">hrs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input type="number" min={0} max={59} className="w-20" value={durationM} onChange={e => setDurationM(e.target.value)} />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Details about this schedule…" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {initial ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
