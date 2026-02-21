import { useEffect, useState } from 'react';
import { customerApi, Customer } from '@/services/customerApi';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Search, User, MapPin, Phone, Mail, Building2, Ticket as TicketIcon,
  Calendar, Hash, Plus, X, LayoutGrid, List,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/DataTable';

const STATUS_CLASSES: Record<string, string> = {
  open:        'status-open',
  in_progress: 'status-in-progress',
  closed:      'status-closed',
  urgent:      'status-urgent',
};

const BLANK_CUSTOMER = { first_name: '', last_name: '', email: '', phone: '', company: '', location: '', street_address: '', street_address_2: '', city: '', state: '', country: '', postal_code: '', customer_info: '' };

export default function CustomersPage() {
  const { isRole } = useAuth();
  const { defaultView } = useTheme();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'cards'>(defaultView);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState(BLANK_CUSTOMER);
  const [creating, setCreating] = useState(false);

  const isAdmin = isRole('admin', 'office_staff');

  useEffect(() => { customerApi.getAll().then(setCustomers).finally(() => setLoading(false)); }, []);

  const openDetail = async (c: Customer) => {
    setSelected(c);
    setLoadingTickets(true);
    try {
      const all = await ticketApi.getAll();
      setRelatedTickets(all.filter(t => t.created_by?.toLowerCase().includes(c.first_name.split(' ')[0].toLowerCase())));
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleCreate = async () => {
    if (!newCustomer.first_name.trim() || !newCustomer.email.trim()) return;
    const fullName = `${newCustomer.first_name.trim()} ${newCustomer.last_name.trim()}`.trim();
    setCreating(true);
    try {
      const created = await customerApi.create({ ...newCustomer, first_name: fullName });
      setCustomers(prev => [created, ...prev]);
      setAddOpen(false);
      setNewCustomer(BLANK_CUSTOMER);
      toast({ title: 'Customer added', description: `${fullName} has been registered.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to add customer.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (c.first_name ?? '').toLowerCase().includes(q) ||
      (c.last_name ?? '').toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const active = customers.filter(c => c.status === 'active').length;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm">{active} active customers</p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> New Customer
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0">
        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
          <div>
            <p className="text-lg font-bold">{customers.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div>
            <p className="text-lg font-bold">{active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <div>
            <p className="text-lg font-bold">{customers.reduce((s, c) => s + c.open_tickets, 0)}</p>
            <p className="text-xs text-muted-foreground">Open Tickets</p>
          </div>
        </div>
      </div>

      {/* Filters — matching Technicians style */}
      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers, companies, locations..." className="pl-9 bg-card" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-card w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-md p-1">
          <Button variant={view === 'cards' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('cards')} title="Card View">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === 'table' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('table')} title="Table View">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content: list + detail panel side by side */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: table or cards */}
        <div className={`flex flex-col min-h-0 transition-all duration-300 ${selected ? 'flex-1' : 'flex-1'}`}>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <User className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No customers</p>
              <p className="text-xs text-muted-foreground/60 mt-1">No customers match your current filters.</p>
            </div>
          ) : view === 'table' ? (
            <DataTable<Customer>
              columns={[
                {
                  label: 'Name',
                  render: (c) => (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-medium">{c.first_name} {c.last_name}</span>
                    </div>
                  ),
                },
                { label: 'Company', key: 'company' },
                { label: 'Location', render: (c) => <span>{c.city} {c.state}</span> },
                { label: 'Phone', key: 'phone' },
                { label: 'Email', key: 'email' },
                { label: 'Tickets', render: (c) => <span className={`font-semibold ${c.open_tickets > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{c.open_tickets}/{c.total_tickets}</span> },
                { label: 'Status', render: (c) => (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.status === 'active' ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-muted-foreground bg-muted/50 border border-border'}`}>
                    {c.status}
                  </span>
                )},
              ] as Column<Customer>[]}
              data={filtered}
              rowKey={(c) => c.id}
              onRowClick={(c) => openDetail(c)}
              emptyMessage="No customers found"
              footer={`${filtered.length} customers · click a row to see full profile`}
            />
          ) : (
            <div className="overflow-y-auto flex-1">
              <div className="grid sm:grid-cols-2 gap-4">
                {filtered.map(c => (
                  <Card
                    key={c.id}
                    className={`bg-card border-border cursor-pointer hover:border-primary/40 transition-colors ${selected?.id === c.id ? 'border-primary/50 bg-primary/5' : ''}`}
                    onClick={() => openDetail(c)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground">{c.company}</p>
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.status === 'active' ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-muted-foreground bg-muted/50 border border-border'}`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2"><MapPin className="h-3 w-3" />{c.city} {c.state}</div>
                        <div className="flex items-center gap-2"><Phone className="h-3 w-3" />{c.phone}</div>
                        <div className="flex items-center gap-2"><Mail className="h-3 w-3 flex-shrink-0" />{c.email}</div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TicketIcon className="h-3 w-3" />
                          <span>{c.open_tickets} open / {c.total_tickets} total</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Detail panel (inline, same height) */}
        {selected && (
          <div className="w-80 flex-shrink-0 bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{selected.first_name} {selected.last_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{selected.company}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Status badge */}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block ${selected.status === 'active' ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-muted-foreground bg-muted/50 border border-border'}`}>
                {selected.status}
              </span>

              {/* Contact info */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">Contact Info</p>
                <div className="space-y-2.5">
                  {[
                    { icon: Mail,     label: selected.email },
                    { icon: Phone,    label: selected.phone },
                    { icon: MapPin,   label: `${selected.street_address} ${selected.street_address_2} ${selected.city} ${selected.state} ${selected.country} ${selected.postal_code}` },
                    { icon: Calendar, label: `Member since ${new Date(selected.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-3 w-3 text-primary" />
                      </div>
                      <span className="break-all">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-primary">{selected.open_tickets}</p>
                  <p className="text-[10px] text-muted-foreground">Open Tickets</p>
                </div>
                <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{selected.total_tickets}</p>
                  <p className="text-[10px] text-muted-foreground">Total Tickets</p>
                </div>
              </div>

              {/* Service History */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">Service History</p>
                {loadingTickets ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : relatedTickets.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    <TicketIcon className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    No ticket history found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {relatedTickets.map(t => (
                      <div key={t.id} className="flex items-center justify-between bg-muted/30 border border-border rounded-lg px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-3 w-3 text-primary/60 flex-shrink-0" />
                            <span className="text-xs font-mono text-primary truncate">{t.ticket_id}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.title}</p>
                        </div>
                        <Badge className={`text-[10px] flex-shrink-0 ml-2 ${STATUS_CLASSES[t.status]}`}>
                          {t.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Customer Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Add New Customer
            </DialogTitle>
            <DialogDescription>Register a new customer in the system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First Name *</Label>
                <Input placeholder="Enter First Name ``" value={newCustomer.first_name} onChange={e => setNewCustomer(f => ({ ...f, first_name: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name</Label>
                <Input placeholder="Enter Last Name" value={newCustomer.last_name} onChange={e => setNewCustomer(f => ({ ...f, last_name: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Email *</Label>
                <Input type="email" placeholder="james@company.com" value={newCustomer.email} onChange={e => setNewCustomer(f => ({ ...f, email: e.target.value }))} className="bg-background" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input placeholder="Enter Phone Number" value={newCustomer.phone} onChange={e => setNewCustomer(f => ({ ...f, phone: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company</Label>
                <Input placeholder="Enter Company Name" value={newCustomer.company} onChange={e => setNewCustomer(f => ({ ...f, company: e.target.value }))} className="bg-background" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Street Address</Label>
                <Input placeholder="Enter Street Address" value={newCustomer.street_address} onChange={e => setNewCustomer(f => ({ ...f, street_address: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Street Address</Label>
                <Input placeholder="Enter Street Address 2" value={newCustomer.street_address_2} onChange={e => setNewCustomer(f => ({ ...f, street_address_2: e.target.value }))} className="bg-background" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input placeholder="Enter City" value={newCustomer.city} onChange={e => setNewCustomer(f => ({ ...f, city: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">State</Label>
                <Input placeholder="Enter State" value={newCustomer.state} onChange={e => setNewCustomer(f => ({ ...f, state: e.target.value }))} className="bg-background" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <Input placeholder="Enter Country" value={newCustomer.country} onChange={e => setNewCustomer(f => ({ ...f, country: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Postal / Zip Code</Label>
                <Input placeholder="Enter Postal / Zip Code" value={newCustomer.postal_code} onChange={e => setNewCustomer(f => ({ ...f, postal_code: e.target.value }))} className="bg-background" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input placeholder="Other info" value={newCustomer.customer_info} onChange={e => setNewCustomer(f => ({ ...f, customer_info: e.target.value }))} className="bg-background" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={creating || !newCustomer.first_name.trim() || !newCustomer.email.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
