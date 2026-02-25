import { useEffect, useState, useMemo } from 'react';
import { partApi, Part } from '@/services/partApi';
import { componentApi, Component } from '@/services/componentApi';
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
import {
  Loader2, Search, AlertTriangle, Wrench, Plus, DollarSign, Building2,
  Tag, Hash, Pencil, Save, X, Shield, CalendarDays,
} from 'lucide-react';

function getStockBadge(part: Part): { label: string; class: string } {
  if (part.quantity_available === 0) {
    return { label: 'Out of Stock', class: 'text-destructive bg-destructive/10 border border-destructive/20' };
  }
  if (part.quantity_available <= part.reorder_threshold) {
    return { label: 'Low Inventory', class: 'text-destructive bg-destructive/10 border border-destructive/20' };
  }
  return { label: 'In Stock', class: 'text-green-400 bg-green-400/10 border border-green-400/20' };
}

const BLANK_FORM: Partial<Part> = {
  name: '', part_number: '', components_id: [], components_name: [], category: '',
  cost_price: 0, resale_price: 0, weight_kg: 0, supplier: '',
  quantity_available: 0, reorder_threshold: 5, last_ordered: '',
};

export default function PartsPage() {
  const { isRole } = useAuth();
  const { toast } = useToast();
  const [parts, setParts] = useState<Part[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [manualComponentNames, setManualComponentNames] = useState<string[]>([]);
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

  const isAdmin = isRole('admin', 'office_staff');

  useEffect(() => {
    Promise.all([
      partApi.getAll().then(data => setParts(Array.isArray(data) ? data : [])).catch(() => setParts([])),
      componentApi.getAll().then(data => setComponents(Array.isArray(data) ? data : [])).catch(() => setComponents([])),
      manualApi.getAll().then(manuals => {
        const names = new Set<string>();
        manuals.forEach(m => m.component?.forEach(c => names.add(c.name)));
        setManualComponentNames(Array.from(names).sort());
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    parts.filter(p => {
      const matchSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.part_number?.toLowerCase().includes(search.toLowerCase());
      const matchComp = componentFilter === 'all' || (Array.isArray(p.components_id) && p.components_id.includes(componentFilter));
      const matchStatus = statusFilter === 'all' || (() => {
        if (statusFilter === 'out_of_stock') return p.quantity_available === 0;
        if (statusFilter === 'low_stock') return p.quantity_available > 0 && p.quantity_available <= p.reorder_threshold;
        if (statusFilter === 'in_stock') return p.quantity_available > p.reorder_threshold;
        return p.status === statusFilter;
      })();
      return matchSearch && matchComp && matchStatus;
    }),
    [parts, search, componentFilter, statusFilter]
  );

  const openDetail = (p: Part) => {
    setSelected(p);
    setEditing(false);
    setEditForm({
      name: p.name, part_number: p.part_number, category: p.category,
      supplier: p.supplier, status: p.status,
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
      const created = await partApi.create({
        ...newForm,
        components_id: Array.isArray(newForm.components_id) ? newForm.components_id : [],
        components_name: Array.isArray(newForm.components_name) ? newForm.components_name : [],
      });
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

  const lowStockCount = parts.filter(p => p.quantity_available > 0 && p.quantity_available <= p.reorder_threshold).length;
  const outOfStockCount = parts.filter(p => p.quantity_available === 0).length;
  const alerts = lowStockCount + outOfStockCount;

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
      label: 'Available Quantity',
      render: row => {
        const badge = getStockBadge(row);
        const isAlert = badge.label !== 'In Stock';
        return (
          <span className={`text-xs font-semibold flex items-center gap-1 ${isAlert ? 'text-destructive' : 'text-foreground'}`}>
            {row.quantity_available}
            {isAlert && <AlertTriangle className="h-3 w-3" />}
          </span>
        );
      },
    },
    {
      label: 'Stock Status',
      render: row => {
        const badge = getStockBadge(row);
        return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.class}`}>{badge.label}</span>;
      },
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
      render: row => <span className="text-xs">${Number(row.cost_price ?? 0).toFixed(2)}</span>,
    },
    {
      label: 'Resale Price',
      render: row => <span className="text-xs font-medium">${Number(row.resale_price ?? 0).toFixed(2)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Parts</h1>
          <p className="text-muted-foreground text-sm">Parts catalogue and inventory management</p>
        </div>
        <div className="flex items-center gap-2">
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
          <p className="text-2xl font-bold text-green-400">{parts.filter(p => p.quantity_available > p.reorder_threshold).length}</p>
          <p className="text-xs text-muted-foreground">In Stock</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-yellow-400">{lowStockCount}</p>
          <p className="text-xs text-muted-foreground">Low Inventory</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-destructive">{outOfStockCount}</p>
          <p className="text-xs text-muted-foreground">Out of Stock</p>
        </div>
      </div>

      {alerts > 0 && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-destructive font-medium">{alerts} part{alerts > 1 ? 's' : ''} need attention (low inventory or out of stock)</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parts..." className="pl-9 bg-card" />
        </div>
        <Select value={componentFilter} onValueChange={setComponentFilter}>
          <SelectTrigger className="w-52 bg-card"><SelectValue placeholder="All Components" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Components</SelectItem>
            {components?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Stock Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Inventory</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
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
                      {(() => {
                        const badge = getStockBadge(selected);
                        return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${badge.class}`}>{badge.label}</span>;
                      })()}
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
                        <Label className="text-xs">Available Quantity</Label>
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
                      { icon: Tag,          label: 'Components',        value: Array.isArray(selected.components_name) ? selected.components_name.join(', ') : (selected.components_name || '—') },
                      { icon: Building2,    label: 'Supplier',          value: selected.supplier },
                      { icon: CalendarDays, label: 'Last Ordered',      value: selected.last_ordered ? new Date(selected.last_ordered).toLocaleDateString() : '—' },
                      { icon: DollarSign,   label: 'Cost',              value: `$${Number(selected.cost_price ?? 0).toFixed(2)}` },
                      { icon: DollarSign,   label: 'Resale Price',      value: `$${Number(selected.resale_price ?? 0).toFixed(2)}` },
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
                      <span className="text-xs text-muted-foreground">Available: {selected.quantity_available} / Reorder at: {selected.reorder_threshold}</span>
                      {(() => {
                        const badge = getStockBadge(selected);
                        return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.class}`}>{badge.label}</span>;
                      })()}
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
            <DialogDescription>Register a new part in the catalogue.</DialogDescription>
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

            {/* Component dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs">Component Group</Label>
              <Select
                value={(Array.isArray(newForm.components_id) && newForm.components_id.length > 0) ? newForm.components_id[0] : 'none'}
                onValueChange={(v) => {
                  if (v === 'none') {
                    setNewForm(f => ({ ...f, components_id: [], components_name: [] }));
                    return;
                  }
                  const comp = components.find(c => String(c.id) === v);
                  if (comp) {
                    setNewForm(f => ({ ...f, components_id: [String(comp.id)], components_name: [comp.name] }));
                  } else {
                    // Manual component name
                    setNewForm(f => ({ ...f, components_id: [v], components_name: [v] }));
                  }
                }}
              >
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select component…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No component</SelectItem>
                  {components.map(c => (
                    <SelectItem key={`comp-${c.id}`} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                  {manualComponentNames.filter(mc => !components.some(c => c.name.toLowerCase() === mc.toLowerCase())).map(mc => (
                    <SelectItem key={`manual-${mc}`} value={mc}>{mc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Available Quantity</Label>
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
    </div>
  );
}
