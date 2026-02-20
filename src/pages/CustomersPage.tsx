import { useEffect, useState } from 'react';
import { customerApi, Customer } from '@/services/customerApi';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Loader2, Search, User, MapPin, Phone, Mail, Building2, Ticket as TicketIcon,
  Calendar, Hash, ExternalLink, Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const STATUS_CLASSES: Record<string, string> = {
  open:        'status-open',
  in_progress: 'status-in-progress',
  closed:      'status-closed',
  urgent:      'status-urgent',
};

const BLANK_CUSTOMER = { first_name: '', last_name: '', email: '', phone: '', company: '', location: '' };

export default function CustomersPage() {
  const { isRole } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');
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

  const filtered = customers.filter(c =>
    !search ||
    c.first_name.toLowerCase().includes(search.toLowerCase()) ||
    c.last_name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.street_address.toLowerCase().includes(search.toLowerCase()) ||
    c.street_address_2.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.state.toLowerCase().includes(search.toLowerCase()) ||
    c.country.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.toLowerCase().includes(search.toLowerCase())
  );

  const active = customers.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm">{active} active customers</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> New Customer
            </Button>
          )}
          <button onClick={() => setView('table')} className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}>Table</button>
          <button onClick={() => setView('cards')} className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${view === 'cards' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}>Cards</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{customers.length}</p>
          <p className="text-xs text-muted-foreground">Total Customers</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-green-400">{active}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-primary">{customers.reduce((s, c) => s + c.open_tickets, 0)}</p>
          <p className="text-xs text-muted-foreground">Open Tickets</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers, companies, locations..." className="pl-9 bg-card" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : view === 'table' ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Full Name', 'Company', 'Location', 'Phone', 'Email', 'Open Tickets', 'Total', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No customers found</td></tr>
                ) : filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-border hover:bg-accent/30 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                    onClick={() => openDetail(c)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-xs font-medium">{c.first_name} {c.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.company}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.city} {c.state}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${c.open_tickets > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{c.open_tickets}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.total_tickets}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.status === 'active' ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-muted-foreground bg-muted/50 border border-border'}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">{filtered.length} customers · click a row to see full profile</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="bg-card border-border card-hover cursor-pointer" onClick={() => openDetail(c)}>
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
                  <ExternalLink className="h-3.5 w-3.5 text-primary/60" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Customer Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/15 ring-2 ring-primary/30 flex items-center justify-center">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-base">{selected.first_name + ' ' + selected.last_name}</SheetTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" /> {selected.company}
                    </p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${selected.status === 'active' ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-muted-foreground bg-muted/50 border border-border'}`}>
                      {selected.status}
                    </span>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                {/* Contact details */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact Info</p>
                  <div className="space-y-2.5">
                    {[
                      { icon: Mail, label: selected.email },
                      { icon: Phone, label: selected.phone },
                      { icon: MapPin, label: selected.city + ' ' + selected.state },
                      { icon: Calendar, label: `Member since ${new Date(selected.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span>{label}</span>
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

                {/* Related tickets */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Service History</p>
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
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Hash className="h-3 w-3 text-primary/60" />
                              <span className="text-xs font-mono text-primary">{t.ticket_id}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.title}</p>
                          </div>
                          <Badge className={`text-[10px] ${STATUS_CLASSES[t.status]}`}>
                            {t.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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
                <Input placeholder="James" value={newCustomer.first_name} onChange={e => setNewCustomer(f => ({ ...f, first_name: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name</Label>
                <Input placeholder="Porter" value={newCustomer.last_name} onChange={e => setNewCustomer(f => ({ ...f, last_name: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email *</Label>
                <Input type="email" placeholder="james@company.com" value={newCustomer.email} onChange={e => setNewCustomer(f => ({ ...f, email: e.target.value }))} className="bg-background" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input placeholder="+1-555-0000" value={newCustomer.phone} onChange={e => setNewCustomer(f => ({ ...f, phone: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company</Label>
                <Input placeholder="Acme Corp" value={newCustomer.company} onChange={e => setNewCustomer(f => ({ ...f, company: e.target.value }))} className="bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input placeholder="City, State" value={newCustomer.location} onChange={e => setNewCustomer(f => ({ ...f, location: e.target.value }))} className="bg-background" />
            </div>
            <div className="flex gap-3 pt-2">
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
