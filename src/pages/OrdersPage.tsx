import { useEffect, useState } from 'react';
import { orderApi, Order } from '@/services/orderApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Package, Search, ExternalLink, Hash, Calendar, User, ShoppingCart, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending:   { label: 'Pending',   class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  approved:  { label: 'Approved',  class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' },
  shipped:   { label: 'Shipped',   class: 'text-purple-400 bg-purple-400/10 border border-purple-400/20' },
  delivered: { label: 'Delivered', class: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  cancelled: { label: 'Cancelled', class: 'text-muted-foreground bg-muted/50 border border-border' },
};

const TIMELINE_STEPS = ['pending', 'approved', 'shipped', 'delivered'];

const BLANK_ORDER = { item_name: '', quantity: 1, assigned_ticket: '', total_price: 0 };

export default function OrdersPage() {
  const { isRole } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Order | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newOrder, setNewOrder] = useState(BLANK_ORDER);
  const [creating, setCreating] = useState(false);

  const isAdmin = isRole('admin', 'office');

  useEffect(() => { orderApi.getAll().then(setOrders).finally(() => setLoading(false)); }, []);

  const handleCreate = async () => {
    if (!newOrder.item_name.trim()) return;
    setCreating(true);
    try {
      const created = await orderApi.create({ ...newOrder, requested_by: 'Office Staff', status: 'pending' });
      setOrders(prev => [created, ...prev]);
      setAddOpen(false);
      setNewOrder(BLANK_ORDER);
      toast({ title: 'Order created', description: `${created.order_number} has been submitted.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to create order.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      (o.order_number ?? '').toLowerCase().includes(q) ||
      (o.item_name ?? '').toLowerCase().includes(q) ||
      (o.requested_by ?? '').toLowerCase().includes(q);

    const statusNorm = (o.status ?? '').toLowerCase();
    const matchStatus = statusFilter === 'all' || statusNorm === statusFilter;
    return matchSearch && matchStatus;
  });

  const total   = orders.reduce((sum, o) => sum + o.total_price, 0);
  const pending = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Orders</h1>
          <p className="text-muted-foreground text-sm">Parts and supply orders tracking</p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> New Order
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Total Orders</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-yellow-400">{pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">${total.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Total Value</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.keys(STATUS_CONFIG).map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Order #', 'Item', 'Qty', 'Status', 'Ticket', 'Total', 'Requested By', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No orders found</td></tr>
              ) : filtered.map((o, i) => {
                const statusKey = (o.status ?? '').toLowerCase();
                const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
                return (
                  <tr
                    key={o.id}
                    className={`border-b border-border hover:bg-accent/30 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                    onClick={() => setSelected(o)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{o.order_number}</td>
                    <td className="px-4 py-3 text-xs">{o.item_name}</td>
                    <td className="px-4 py-3 text-xs text-center">{o.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-primary font-mono">{o.assigned_ticket || '—'}</td>
                    <td className="px-4 py-3 text-xs font-medium">${o.total_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{o.requested_by}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">{filtered.length} of {orders.length} orders · click a row to view details</div>
      </div>

      {/* Order Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="font-mono text-primary">{selected.order_number}</SheetTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{selected.item_name}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                {/* Status timeline */}
                {selected.status !== 'cancelled' && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Order Progress</p>
                    <div className="flex items-center gap-1">
                      {TIMELINE_STEPS.map((step, idx) => {
                        const currentIdx = TIMELINE_STEPS.indexOf(selected.status);
                        const isComplete = idx <= currentIdx;
                        const isCurrent  = idx === currentIdx;
                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1 flex-1">
                              <div className={`w-3 h-3 rounded-full border-2 transition-all ${isCurrent ? 'border-primary bg-primary scale-125' : isComplete ? 'border-primary bg-primary/40' : 'border-border bg-background'}`} />
                              <span className={`text-[9px] text-center capitalize ${isCurrent ? 'text-primary font-semibold' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>{step}</span>
                            </div>
                            {idx < TIMELINE_STEPS.length - 1 && (
                              <div className={`h-px flex-1 -mt-4 ${isComplete && idx < currentIdx ? 'bg-primary/50' : 'bg-border'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selected.status === 'cancelled' && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary">
                    ⚠ This order has been cancelled.
                  </div>
                )}

                {/* Details */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Order Details</p>
                  <div className="space-y-3">
                    {[
                      { icon: Package,   label: 'Item',         value: selected.item_name },
                      { icon: Hash,      label: 'Quantity',     value: `${selected.quantity} unit${selected.quantity !== 1 ? 's' : ''}` },
                      { icon: User,      label: 'Requested By', value: selected.requested_by },
                      { icon: Calendar,  label: 'Date Created', value: new Date(selected.created_at).toLocaleString() },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 text-xs">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className="font-medium text-foreground">{value}</p>
                        </div>
                      </div>
                    ))}
                    {selected.assigned_ticket && (
                      <div className="flex items-center gap-3 text-xs">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ExternalLink className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Assigned Ticket</p>
                          <p className="font-mono text-primary font-medium">{selected.assigned_ticket}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Order Total</span>
                  <span className="text-2xl font-bold text-foreground">${selected.total_price.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Order Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> New Order</DialogTitle>
            <DialogDescription>Submit a new parts or supply order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Item Name *</Label>
              <Input placeholder="e.g. Fuel Injector 6.7L" value={newOrder.item_name} onChange={e => setNewOrder(f => ({ ...f, item_name: e.target.value }))} className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input type="number" min={1} value={newOrder.quantity} onChange={e => setNewOrder(f => ({ ...f, quantity: Number(e.target.value) }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Price ($)</Label>
                <Input type="number" min={0} step={0.01} value={newOrder.total_price} onChange={e => setNewOrder(f => ({ ...f, total_price: Number(e.target.value) }))} className="bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Linked Ticket (optional)</Label>
              <Input placeholder="e.g. TK-001" value={newOrder.assigned_ticket} onChange={e => setNewOrder(f => ({ ...f, assigned_ticket: e.target.value }))} className="bg-background" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={creating || !newOrder.item_name.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Submit Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
