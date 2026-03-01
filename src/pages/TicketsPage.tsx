import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Bot, Plus, ArrowUpDown, Info, Pencil, Save, X, Calendar, User, Tag } from 'lucide-react';

const STATUS_CLASSES: Record<string, string> = {
  open:              'status-open',
  assigned:          'status-open',
  in_progress:       'status-in-progress',
  awaiting_parts:    'status-in-progress',
  awaiting_approval: 'status-urgent',
  completed:         'status-closed',
};

const PRIORITY_LABEL: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Severe', 5: 'Critical' };
const PRIORITY_CLASSES_NUM: Record<number, string> = {
  1: 'text-muted-foreground bg-muted/50 border border-border',
  2: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20',
  3: 'text-orange-400 bg-orange-400/10 border border-orange-400/20',
  4: 'text-primary bg-primary/10 border border-primary/20',
  5: 'text-primary bg-primary/10 border border-primary/20',
};

type SortField = 'ticket_id' | 'status' | 'priority' | 'created_at';

const BLANK_TICKET: Partial<Ticket> = {
  title: '', description: '', customer: '', issue_description: '',
  status: 'open',
  priority: 2,
  assigned_to: '',
};

export default function TicketsPage() {
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected]   = useState<Ticket | null>(null);
  const [editing, setEditing]     = useState(false);
  const [editForm, setEditForm]   = useState<Partial<Ticket>>({});
  const [saving, setSaving]       = useState(false);
  const [addOpen, setAddOpen]     = useState(false);
  const [newTicket, setNewTicket] = useState<Partial<Ticket>>({ ...BLANK_TICKET });
  const [creating, setCreating]   = useState(false);

  const fullName    = user ? `${user.first_name} ${user.last_name}`.trim() : '';
  const isAdmin     = isRole('admin', 'office_staff');
  const isTech      = isRole('engine_technician', 'electrical_technician');
  const isCustomer  = isRole('customer');

  const scopeLabel = isTech
    ? `Showing tickets assigned to you (${fullName})`
    : isCustomer ? 'Showing your submitted tickets'
    : 'Showing all tickets';

  useEffect(() => {
    ticketApi.getAll().then(all => {
      let scoped = all;
      if (isTech)     scoped = all.filter(t => t.assigned_to === fullName);
      if (isCustomer) scoped = all.filter(t => t.created_by === fullName);
      setTickets(scoped);
    }).finally(() => setLoading(false));
  }, [isTech, isCustomer, fullName]);

  const filtered = useMemo(() =>
    tickets
      .filter(t => {
        const matchSearch = !search || t.ticket_id.toLowerCase().includes(search.toLowerCase()) || t.title.toLowerCase().includes(search.toLowerCase()) || t.assigned_to.toLowerCase().includes(search.toLowerCase());
        const matchStatus   = statusFilter === 'all'   || t.status === statusFilter;
        const matchPriority = priorityFilter === 'all' || t.priority === Number(priorityFilter);
        return matchSearch && matchStatus && matchPriority;
      })
      .sort((a, b) => {
        const va = String(a[sortField]);
        const vb = String(b[sortField]);
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }),
    [tickets, search, statusFilter, priorityFilter, sortField, sortDir]
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const openFixItFelixForTicket = (ticket: Ticket) => {
    const prompt = `Help me resolve ticket ${ticket.ticket_id}: ${ticket.title}. Issue: ${ticket.issue_description || ticket.description}`;
    navigate(`/ask-ai?q=${encodeURIComponent(prompt)}`);
  };

  const openDetail = (t: Ticket) => {
    if (isTech) {
      navigate(`/tickets/${t.id}`);
      return;
    }
    setSelected(t);
    setEditing(false);
    setEditForm({ status: t.status, priority: t.priority, assigned_to: t.assigned_to, description: t.description });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await ticketApi.update(selected.id, editForm).catch(() => ({ ...selected, ...editForm }));
      const merged = { ...selected, ...updated } as Ticket;
      setTickets(prev => prev.map(t => t.id === merged.id ? merged : t));
      setSelected(merged);
      setEditing(false);
      toast({ title: 'Ticket updated', description: `${merged.ticket_id} has been updated.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update ticket.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newTicket.title?.trim()) return;
    setCreating(true);
    try {
      const created = await ticketApi.create({ ...newTicket, created_by: fullName });
      setTickets(prev => [created, ...prev]);
      setAddOpen(false);
      setNewTicket({ ...BLANK_TICKET });
      toast({ title: 'Ticket created', description: `${created.ticket_id} has been created.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to create ticket.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const tableHeaders = [
    { label: 'Ticket ID', field: 'ticket_id' as SortField },
    { label: 'Specialization', field: null },
    { label: 'Issue', field: null },
    { label: 'Status', field: 'status' as SortField },
    { label: 'Priority', field: 'priority' as SortField },
    { label: 'Technician', field: null },
    { label: 'Created By', field: null },
    { label: 'Created', field: 'created_at' as SortField },
    { label: 'Actions', field: null },
  ];
  const colSpan = tableHeaders.length;

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
        {(isAdmin || isTech) && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setAddOpen(true)}>
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
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="awaiting_parts">Awaiting Parts</SelectItem>
            <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="1">Low</SelectItem>
            <SelectItem value="2">Medium</SelectItem>
            <SelectItem value="3">High</SelectItem>
            <SelectItem value="4">Severe</SelectItem>
            <SelectItem value="5">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {tableHeaders.map(({ label, field }) => (
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
                <tr><td colSpan={colSpan} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={colSpan} className="text-center py-12 text-muted-foreground text-sm">No tickets found</td></tr>
              ) : filtered.map((t, i) => (
                <tr key={t.id} className={`border-b border-border hover:bg-accent/30 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-muted/10' : ''}`} onClick={() => openDetail(t)}>
                  <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{t.ticket_id}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.specialization || '—'}</td>
                  <td className="px-4 py-3 text-xs max-w-48 truncate">{t.issue_description || t.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${STATUS_CLASSES[t.status] ?? ''}`}>{t.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full capitalize ${PRIORITY_CLASSES_NUM[t.priority] ?? ''}`}>{PRIORITY_LABEL[t.priority] ?? t.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.assigned_to}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.created_by}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary" onClick={e => { e.stopPropagation(); openFixItFelixForTicket(t); }}>
                      <Bot className="h-3 w-3" /> Felix
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">{filtered.length} of {tickets.length} tickets</div>
      </div>

      {/* Ticket Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={open => { if (!open) { setSelected(null); setEditing(false); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="font-mono text-primary text-sm">{selected.ticket_id}</SheetTitle>
                    <p className="text-sm font-semibold mt-0.5">{selected.title}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLASSES[editing ? (editForm.status ?? selected.status) : selected.status]}`}>
                        {(editing ? (editForm.status ?? selected.status) : selected.status).replace(/_/g, ' ')}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${PRIORITY_CLASSES_NUM[editing ? (editForm.priority ?? selected.priority) : selected.priority] ?? ''}`}>
                        {PRIORITY_LABEL[editing ? (editForm.priority ?? selected.priority) : selected.priority] ?? (editing ? editForm.priority : selected.priority)}
                      </span>
                    </div>
                  </div>
                  {isAdmin && !editing && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10 flex-shrink-0" onClick={() => setEditing(true)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                {editing ? (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editing Ticket</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Status</Label>
                        <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="awaiting_parts">Awaiting Parts</SelectItem>
                            <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Priority</Label>
                        <Select value={String(editForm.priority ?? '')} onValueChange={v => setEditForm(f => ({ ...f, priority: Number(v) }))}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Low</SelectItem>
                            <SelectItem value="2">Medium</SelectItem>
                            <SelectItem value="3">High</SelectItem>
                            <SelectItem value="4">Severe</SelectItem>
                            <SelectItem value="5">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Assigned Technician</Label>
                      <Input value={editForm.assigned_to ?? ''} onChange={e => setEditForm(f => ({ ...f, assigned_to: e.target.value }))} className="bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <Textarea value={editForm.description ?? ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} className="bg-background resize-none" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" className="flex-1 gap-1.5" onClick={() => setEditing(false)}>
                        <X className="h-3.5 w-3.5" /> Cancel
                      </Button>
                      <Button className="flex-1 gap-1.5 bg-primary hover:bg-primary/90" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</p>
                      <div className="space-y-3">
                        {[
                          { icon: Tag,      label: 'Specialization', value: selected.specialization },
                          { icon: User,     label: 'Customer',       value: selected.customer },
                          { icon: User,     label: 'Technician',     value: selected.assigned_to },
                          { icon: User,     label: 'Created By',     value: selected.created_by },
                          { icon: Calendar, label: 'Created',        value: new Date(selected.created_at).toLocaleString() },
                          { icon: Calendar, label: 'Last Updated',   value: new Date(selected.updated_at).toLocaleString() },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="flex items-center gap-3 text-xs">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">{label}</p>
                              <p className="font-medium">{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Issue Description</p>
                      <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                        {selected.issue_description || selected.description}
                      </div>
                    </div>

                    <Button className="w-full gap-2 bg-primary hover:bg-primary/90" onClick={() => { openFixItFelixForTicket(selected); setSelected(null); }}>
                      <Bot className="h-4 w-4" /> Open Fix it Felix for this Ticket
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Ticket Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Create New Ticket
            </DialogTitle>
            <DialogDescription>Fill in the ticket details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input placeholder="Brief issue description..." value={newTicket.title ?? ''} onChange={e => setNewTicket(f => ({ ...f, title: e.target.value }))} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Issue Description</Label>
              <Textarea placeholder="Detailed description..." value={newTicket.issue_description ?? ''} onChange={e => setNewTicket(f => ({ ...f, issue_description: e.target.value }))} rows={3} className="bg-background resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Customer</Label>
                <Input placeholder="Customer name" value={newTicket.customer ?? ''} onChange={e => setNewTicket(f => ({ ...f, customer: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Specialization</Label>
                <Input placeholder="Engine, Electrical…" value={newTicket.specialization ?? ''} onChange={e => setNewTicket(f => ({ ...f, specialization: e.target.value }))} className="bg-background" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={String(newTicket.priority ?? 2)} onValueChange={v => setNewTicket(f => ({ ...f, priority: Number(v) }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">High</SelectItem>
                    <SelectItem value="4">Severe</SelectItem>
                    <SelectItem value="5">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Severity</Label>
                <Select value={String(newTicket.severity ?? 3)} onValueChange={v => setNewTicket(f => ({ ...f, severity: Number(v) }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Low</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5 - Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assign Technician</Label>
              <Input placeholder="Technician name" value={newTicket.assigned_to ?? ''} onChange={e => setNewTicket(f => ({ ...f, assigned_to: e.target.value }))} className="bg-background" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={creating || !(newTicket.title ?? '').trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
