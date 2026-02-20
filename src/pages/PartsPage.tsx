import { useEffect, useState, useMemo } from 'react';
import { partApi, Part } from '@/services/partApi';
import { componentApi, Component } from '@/services/componentApi';
import { orderApi, Order } from '@/services/orderApi';
import { manualApi } from '@/services/manualApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/DataTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Loader2, Search, AlertTriangle, Wrench, Plus, DollarSign, Building2,
  Tag, Hash, Pencil, Save, X, ShoppingCart, CheckCircle2, Clock,
  XCircle, Truck, Shield, CalendarDays,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  in_stock:     { label: 'In Stock',     class: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  low_stock:    { label: 'Low Stock',    class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  out_of_stock: { label: 'Out of Stock', class: 'text-primary bg-primary/10 border border-primary/20' },
  discontinued: { label: 'Discontinued', class: 'text-muted-foreground bg-muted/50 border border-border' },
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.FC<{className?: string}> }> = {
  pending:   { label: 'Pending',   class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', icon: Clock },
  approved:  { label: 'Approved',  class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',   icon: CheckCircle2 },
  shipped:   { label: 'Shipped',   class: 'text-purple-400 bg-purple-400/10 border border-purple-400/20', icon: Truck },
  delivered: { label: 'Delivered', class: 'text-green-400 bg-green-400/10 border border-green-400/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', class: 'text-muted-foreground bg-muted/50 border border-border', icon: XCircle },
};

const BLANK_FORM: Partial<Part> = {
  name: '', part_number: '', component_id: 0, component_name: '', category: '',
  cost_price: 0, resale_price: 0, weight_kg: 0, compatibility: '', supplier: '',
  quantity_available: 0, reorder_threshold: 5, last_ordered: '',
};

const BLANK_ORDER = { item_name: '', quantity: 1, unit_price: 0, assigned_ticket: '', notes: '' };

export default function PartsPage() {
  const { isRole, user } = useAuth();
  const { toast } = useToast();
  const [parts, setParts] = useState<Part[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [manualComponents, setManualComponents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [componentFilter, setComponentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Part | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Part>>({});
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newForm, setNewForm] = useState<Partial<Part>>(BLANK_FORM);
  const [creating, setCreating] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderForm, setOrderForm] = useState(BLANK_ORDER);
  const [ordering, setOrdering] = useState(false);

  const isAdmin = isRole('admin', 'office_staff');

  useEffect(() => {
    Promise.all([
      partApi.getAll().then(data => setParts(Array.isArray(data) ? data : [])).catch(() => setParts([])),
      componentApi.getAll().then(data => setComponents(Array.isArray(data) ? data : [])).catch(() => setComponents([])),
      orderApi.getAll().then(data => setOrders(Array.isArray(data) ? data : [])).catch(() => setOrders([])),
      manualApi.getAll().then(manuals => {
        const allComponents = new Set<string>();
        manuals.forEach(m => m.components?.forEach(c => allComponents.add(c)));
        setManualComponents(Array.from(allComponents).sort());
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    parts.filter(p => {
      const matchSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.part_number?.toLowerCase().includes(search.toLowerCase());
      const matchComp = componentFilter === 'all' || p.component_id === Number(componentFilter);
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchComp && matchStatus;
    }),
    [parts, search, componentFilter, statusFilter]
  );

  const openDetail = (p: Part) => {
    setSelected(p);
    setEditing(false);
    setEditForm({
      name: p.name, part_number: p.part_number, category: p.category,
      supplier: p.supplier, compatibility: p.compatibility, status: p.status,
      quantity_available: p.quantity_available, reorder_threshold: p.reorder_threshold,
      cost_price: p.cost_price, resale_price: p.resale_price,
      last_ordered: p.last_ordered ?? '',
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await partApi.update(selected.id, editForm);
      const merged = { ...selected, ...updated };
      setParts(prev => prev.map(p => p.id === merged.id ? merged : p));
      setSelected(merged);
      setEditing(false);
      toast({ title: 'Updated', description: `${merged.name} has been updated.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update part.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newForm.name?.trim() || !newForm.part_number?.trim()) return;
    setCreating(true);
    try {
      const comp = components.find(c => c.id === newForm.component_id);
      const created = await partApi.create({ ...newForm, component_name: comp?.name ?? newForm.component_name ?? '' });
      setParts(prev => [created, ...prev]);
      setAddOpen(false);
      setNewForm({ ...BLANK_FORM });
      toast({ title: 'Part added', description: `${created.name} has been registered.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to add part.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleOrder = async () => {
    if (!orderForm.item_name.trim() || orderForm.quantity < 1) return;
    setOrdering(true);
    try {
      const requestedBy = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Staff';
      const created = await orderApi.create({
        item_name: orderForm.item_name,
        quantity: orderForm.quantity,
        total_price: orderForm.unit_price * orderForm.quantity,
        assigned_ticket: orderForm.assigned_ticket || '',
        requested_by: requestedBy,
        status: 'pending',
      });
      setOrders(prev => [created, ...prev]);
      setOrderOpen(false);
      setOrderForm(BLANK_ORDER);
      toast({ title: 'Order placed', description: `Order for "${created.item_name}" is pending admin approval.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to place order.', variant: 'destructive' });
    } finally {
      setOrdering(false);
    }
  };

  const handleApproveOrder = async (order: Order) => {
    try {
      const updated = await orderApi.update(order.id, { status: 'approved' });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...updated } : o));
      toast({ title: 'Order approved', description: `${order.item_name} order has been approved.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to approve order.', variant: 'destructive' });
    }
  };

  const alerts = parts.filter(p => p.status === 'out_of_stock' || p.status === 'low_stock').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  // Table columns: Part #, Name, Qty Available, Reorder Threshold, Supplier, Last Ordered, Cost, Resale Price
  const columns: Column<Part>[] = [
    {
      label: 'Part #',
      render: row => <span className="font-mono text-xs text-muted-foreground">{row.part_number}</span>,
    },
    {
      label: 'Name',
      render: row => <span className="text-xs font-medium">{row.name}</span>,
    },
    {
      label: 'Qty Available',
      render: row => {
        const isAlert = row.status === 'low_stock' || row.status === 'out_of_stock';
        return (
          <span className={`text-xs font-semibold flex items-center gap-1 ${isAlert ? 'text-primary' : 'text-foreground'}`}>
            {row.quantity_available}
            {isAlert && <AlertTriangle className="h-3 w-3" />}
          </span>
        );
      },
    },
    {
      label: 'Reorder Threshold',
      render: row => <span className="text-xs text-muted-foreground">{row.reorder_threshold}</span>,
    },
    {
      label: 'Supplier',
      render: row => <span className="text-xs text-muted-foreground">{row.supplier}</span>,
    },
    {
      label: 'Last Ordered',
      render: row => (
        <span className="text-xs text-muted-foreground">
          {row.last_ordered ? new Date(row.last_ordered).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      label: 'Cost',
      render: row => <span className="text-xs">${Number(row.cost_price).toFixed(2)}</span>,
    },
    {
      label: 'Resale Price',
      render: row => <span className="text-xs font-medium">${Number(row.resale_price).toFixed(2)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Parts</h1>
          <p className="text-muted-foreground text-sm">Parts catalogue and order management</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Order Parts — Admin/Office Staff only */}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => setOrderOpen(true)}
            >
              <ShoppingCart className="h-4 w-4" /> Order Parts
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Part
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{parts.length}</p>
          <p className="text-xs text-muted-foreground">Total Parts</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-green-400">{parts.filter(p => p.status === 'in_stock').length}</p>
          <p className="text-xs text-muted-foreground">In Stock</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-yellow-400">{parts.filter(p => p.status === 'low_stock').length}</p>
          <p className="text-xs text-muted-foreground">Low Stock</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-primary">{pendingOrders}</p>
          <p className="text-xs text-muted-foreground">Pending Orders</p>
        </div>
      </div>

      {alerts > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-primary font-medium">{alerts} part{alerts > 1 ? 's' : ''} need attention (low or out of stock)</span>
        </div>
      )}

      {/* Tabs: Parts | Orders */}
      <Tabs defaultValue="parts">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="parts" className="text-xs gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Parts Catalogue
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs gap-1.5 relative">
            <ShoppingCart className="h-3.5 w-3.5" /> Orders
            {pendingOrders > 0 && (
              <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 font-bold">
                {pendingOrders}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Parts Tab ── */}
        <TabsContent value="parts" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parts..." className="pl-9 bg-card" />
            </div>
            <Select value={componentFilter} onValueChange={setComponentFilter}>
              <SelectTrigger className="w-52 bg-card"><SelectValue placeholder="All Components" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Components</SelectItem>
                {components.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            onRowClick={openDetail}
            rowKey={r => r.id}
            emptyMessage="No parts found"
            footer={`${filtered.length} of ${parts.length} parts · click a row to view details`}
          />
        </TabsContent>

        {/* ── Orders Tab ── */}
        <TabsContent value="orders" className="mt-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-medium">Part Orders</p>
              {isAdmin && pendingOrders > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                  <Shield className="h-3.5 w-3.5" />
                  <span>{pendingOrders} awaiting approval</span>
                </div>
              )}
            </div>
            <div className="divide-y divide-border">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  No orders yet
                </div>
              ) : orders.map(order => {
                const cfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                return (
                  <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
                          <span className="text-xs font-medium">{order.item_name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                          <span>Qty: {order.quantity}</span>
                          <span>${order.total_price.toFixed(2)}</span>
                          <span>By: {order.requested_by}</span>
                          {order.assigned_ticket && <span>Ticket: {order.assigned_ticket}</span>}
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>
                        <StatusIcon className="h-2.5 w-2.5" /> {cfg.label}
                      </span>
                      {isAdmin && order.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 gap-1 border-green-400/30 text-green-400 hover:bg-green-400/10"
                          onClick={() => handleApproveOrder(order)}
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" /> Approve
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Part Detail Sheet ── */}
      <Sheet open={!!selected} onOpenChange={open => { if (!open) { setSelected(null); setEditing(false); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Wrench className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <SheetTitle className="text-base leading-tight">{selected.name}</SheetTitle>
                      <p className="text-xs font-mono text-muted-foreground">{selected.part_number}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.in_stock).class}`}>
                        {(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.in_stock).label}
                      </span>
                    </div>
                  </div>
                  {isAdmin && !editing && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10" onClick={() => setEditing(true)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                {editing ? (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editing Part</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name</Label>
                      <Input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="bg-background" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Part Number</Label>
                        <Input value={editForm.part_number ?? ''} onChange={e => setEditForm(f => ({ ...f, part_number: e.target.value }))} className="bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Status</Label>
                        <Select value={editForm.status ?? selected.status} onValueChange={v => setEditForm(f => ({ ...f, status: v as Part['status'] }))}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Qty Available</Label>
                        <Input type="number" min={0} value={editForm.quantity_available ?? 0} onChange={e => setEditForm(f => ({ ...f, quantity_available: Number(e.target.value) }))} className="bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Reorder Threshold</Label>
                        <Input type="number" min={0} value={editForm.reorder_threshold ?? 0} onChange={e => setEditForm(f => ({ ...f, reorder_threshold: Number(e.target.value) }))} className="bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cost ($)</Label>
                        <Input type="number" min={0} step={0.01} value={editForm.cost_price ?? 0} onChange={e => setEditForm(f => ({ ...f, cost_price: Number(e.target.value) }))} className="bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Resale Price ($)</Label>
                        <Input type="number" min={0} step={0.01} value={editForm.resale_price ?? 0} onChange={e => setEditForm(f => ({ ...f, resale_price: Number(e.target.value) }))} className="bg-background" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Supplier</Label>
                      <Input value={editForm.supplier ?? ''} onChange={e => setEditForm(f => ({ ...f, supplier: e.target.value }))} className="bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Last Ordered</Label>
                      <Input type="date" value={editForm.last_ordered ?? ''} onChange={e => setEditForm(f => ({ ...f, last_ordered: e.target.value }))} className="bg-background" />
                    </div>
                    <div className="flex gap-2">
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
                  <div className="space-y-3">
                    {[
                      { icon: Hash,         label: 'Part Number',       value: selected.part_number },
                      { icon: Tag,          label: 'Component Group',   value: selected.component_name },
                      { icon: Building2,    label: 'Supplier',          value: selected.supplier },
                      { icon: CalendarDays, label: 'Last Ordered',      value: selected.last_ordered ? new Date(selected.last_ordered).toLocaleDateString() : '—' },
                      { icon: DollarSign,   label: 'Cost',              value: `$${Number(selected.cost_price).toFixed(2)}` },
                      { icon: DollarSign,   label: 'Resale Price',      value: `$${Number(selected.resale_price).toFixed(2)}` },
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
                    <div className="bg-muted/30 border border-border rounded-lg p-3 flex items-center justify-between">
                     <span className="text-xs text-muted-foreground">Stock: {selected.quantity_available} / Reorder at: {selected.reorder_threshold}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.in_stock).class}`}>
                        {(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.in_stock).label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add Part Dialog (Admin only) ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Add New Part
            </DialogTitle>
            <DialogDescription>Register a new part in the catalogue. Admin action.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary">
              <Shield className="h-3.5 w-3.5" /> Admin action — part will be visible to all technicians.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Part Name *</Label>
                <Input placeholder="e.g. Fuel Injector 6.7L" value={newForm.name ?? ''} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Part Number *</Label>
                <Input placeholder="e.g. FI-6700-A" value={newForm.part_number ?? ''} onChange={e => setNewForm(f => ({ ...f, part_number: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Supplier</Label>
                <Input placeholder="e.g. Cummins Direct" value={newForm.supplier ?? ''} onChange={e => setNewForm(f => ({ ...f, supplier: e.target.value }))} className="bg-background" />
              </div>
            </div>

            {/* Component dropdown — sourced from manuals */}
            <div className="space-y-1.5">
              <Label className="text-xs">Component Group <span className="text-muted-foreground">(from manuals)</span></Label>
              <Select
                value={newForm.component_id ? String(newForm.component_id) : newForm.component_name || 'none'}
                onValueChange={v => {
                  if (v === 'none') { setNewForm(f => ({ ...f, component_id: 0, component_name: '' })); return; }
                  const comp = components.find(c => c.id === Number(v));
                  if (comp) {
                    setNewForm(f => ({ ...f, component_id: comp.id, component_name: comp.name }));
                  } else {
                    setNewForm(f => ({ ...f, component_id: 0, component_name: v }));
                  }
                }}
              >
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select component…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No component</SelectItem>
                  {components.length > 0 && components.map(c => (
                    <SelectItem key={`comp-${c.id}`} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                  {manualComponents.filter(mc => !components.some(c => c.name.toLowerCase() === mc.toLowerCase())).map(mc => (
                    <SelectItem key={`manual-${mc}`} value={mc}>{mc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Qty Available</Label>
                <Input type="number" min={0} value={newForm.quantity_available ?? 0} onChange={e => setNewForm(f => ({ ...f, quantity_available: Number(e.target.value) }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reorder Threshold</Label>
                <Input type="number" min={0} value={newForm.reorder_threshold ?? 5} onChange={e => setNewForm(f => ({ ...f, reorder_threshold: Number(e.target.value) }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cost ($)</Label>
                <Input type="number" min={0} step={0.01} value={newForm.cost_price ?? 0} onChange={e => setNewForm(f => ({ ...f, cost_price: Number(e.target.value) }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Resale Price ($)</Label>
                <Input type="number" min={0} step={0.01} value={newForm.resale_price ?? 0} onChange={e => setNewForm(f => ({ ...f, resale_price: Number(e.target.value) }))} className="bg-background" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Last Ordered</Label>
                <Input type="date" value={newForm.last_ordered ?? ''} onChange={e => setNewForm(f => ({ ...f, last_ordered: e.target.value }))} className="bg-background" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={creating || !newForm.name?.trim() || !newForm.part_number?.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Part
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Order Parts Dialog (Admin / Office Staff only) ── */}
      {isAdmin && (
        <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
          <DialogContent className="max-w-md bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" /> Order Parts
              </DialogTitle>
              <DialogDescription>Submit a part order — requires admin approval before processing.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-lg text-xs text-yellow-400">
                <Shield className="h-3.5 w-3.5" /> Orders are submitted as <strong>pending</strong> and require admin approval.
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Part / Item Name *</Label>
                <Input placeholder="e.g. Fuel Injector 6.7L" value={orderForm.item_name} onChange={e => setOrderForm(f => ({ ...f, item_name: e.target.value }))} className="bg-background" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity *</Label>
                  <Input type="number" min={1} value={orderForm.quantity} onChange={e => setOrderForm(f => ({ ...f, quantity: Number(e.target.value) }))} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Unit Price ($)</Label>
                  <Input type="number" min={0} step={0.01} value={orderForm.unit_price} onChange={e => setOrderForm(f => ({ ...f, unit_price: Number(e.target.value) }))} className="bg-background" />
                </div>
              </div>
              {orderForm.quantity > 0 && orderForm.unit_price > 0 && (
                <div className="px-3 py-2 bg-muted/30 border border-border rounded-lg text-xs text-muted-foreground">
                  Estimated total: <strong className="text-foreground">${(orderForm.quantity * orderForm.unit_price).toFixed(2)}</strong>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Linked Ticket <span className="text-muted-foreground">(optional)</span></Label>
                <Input placeholder="e.g. TK-042" value={orderForm.assigned_ticket} onChange={e => setOrderForm(f => ({ ...f, assigned_ticket: e.target.value }))} className="bg-background" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setOrderOpen(false)}>Cancel</Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleOrder} disabled={ordering || !orderForm.item_name.trim() || orderForm.quantity < 1}>
                  {ordering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                  Submit Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
