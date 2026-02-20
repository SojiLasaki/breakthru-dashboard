import { useEffect, useState, useMemo } from 'react';
import { partApi, Part } from '@/services/partApi';
import { componentApi, Component } from '@/services/componentApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/DataTable';
import { Loader2, Search, AlertTriangle, Wrench, Plus, DollarSign, Building2, Tag, Hash, Pencil, Save, X } from 'lucide-react';

const STATUS_CONFIG = {
  in_stock:     { label: 'In Stock',     class: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  low_stock:    { label: 'Low Stock',    class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  out_of_stock: { label: 'Out of Stock', class: 'text-primary bg-primary/10 border border-primary/20' },
  discontinued: { label: 'Discontinued', class: 'text-muted-foreground bg-muted/50 border border-border' },
};

const BLANK_FORM: Partial<Part> = {
  name: '', part_number: '', component_id: 0, component_name: '', category: '',
  unit_price: 0, weight_kg: 0, compatibility: '', supplier: '',
  quantity_on_hand: 0, reorder_level: 5,
};

export default function PartsPage() {
  const { isRole } = useAuth();
  const { toast } = useToast();
  const [parts, setParts] = useState<Part[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [componentFilter, setComponentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Part | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Part>>({});
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newForm, setNewForm] = useState(BLANK_FORM);
  const [creating, setCreating] = useState(false);

  const isAdmin = isRole('admin', 'office_staff');

  useEffect(() => {
    Promise.all([
      partApi.getAll().then(setParts),
      componentApi.getAll().then(setComponents),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    parts.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.part_number.toLowerCase().includes(search.toLowerCase());
      const matchComp = componentFilter === 'all' || p.component_id === Number(componentFilter);
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchComp && matchStatus;
    }),
    [parts, search, componentFilter, statusFilter]
  );

  const openDetail = (p: Part) => {
    setSelected(p);
    setEditing(false);
    setEditForm({ status: p.status, quantity_on_hand: p.quantity_on_hand, reorder_level: p.reorder_level, unit_price: p.unit_price, supplier: p.supplier });
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
      const created = await partApi.create({ ...newForm, component_name: comp?.name ?? '' });
      setParts(prev => [created, ...prev]);
      setAddOpen(false);
      setNewForm(BLANK_FORM);
      toast({ title: 'Part added', description: `${created.name} has been registered.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to add part.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const alerts = parts.filter(p => p.status === 'out_of_stock' || p.status === 'low_stock').length;

  const columns: Column<Part>[] = [
    { label: 'Part #',           render: row => <span className="font-mono text-xs text-muted-foreground">{row.part_number}</span> },
    { label: 'Name',             render: row => <span className="text-xs font-medium">{row.name}</span> },
    { label: 'Component Group',  render: row => <span className="text-xs text-muted-foreground">{row.component_name}</span> },
    { label: 'Category',         render: row => <span className="text-xs text-muted-foreground">{row.category}</span> },
    {
      label: 'Qty',
      render: row => {
        const isAlert = row.status === 'low_stock' || row.status === 'out_of_stock';
        return (
          <span className={`text-xs font-semibold ${isAlert ? 'text-primary' : 'text-foreground'}`}>
            {row.quantity_on_hand} {isAlert && <AlertTriangle className="h-3 w-3 inline ml-0.5" />}
          </span>
        );
      },
    },
    { label: 'Reorder',  render: row => <span className="text-xs text-muted-foreground">{row.reorder_level}</span> },
    { label: 'Unit Price', render: row => <span className="text-xs">${row.unit_price.toFixed(2)}</span> },
    { label: 'Supplier',  render: row => <span className="text-xs text-muted-foreground">{row.supplier}</span> },
    {
      label: 'Status',
      render: row => {
        const cfg = STATUS_CONFIG[row.status];
        return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Parts</h1>
          <p className="text-muted-foreground text-sm">Individual parts catalogue across all component groups</p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Part
          </Button>
        )}
      </div>

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
          <p className="text-2xl font-bold text-primary">{parts.filter(p => p.status === 'out_of_stock').length}</p>
          <p className="text-xs text-muted-foreground">Out of Stock</p>
        </div>
      </div>

      {alerts > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-primary font-medium">{alerts} part{alerts > 1 ? 's' : ''} need attention (low or out of stock)</span>
        </div>
      )}

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

      {/* Detail Sheet */}
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
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${STATUS_CONFIG[selected.status].class}`}>
                        {STATUS_CONFIG[selected.status].label}
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
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Status</Label>
                        <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v as Part['status'] }))}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Quantity on Hand</Label>
                        <Input type="number" min={0} value={editForm.quantity_on_hand ?? 0} onChange={e => setEditForm(f => ({ ...f, quantity_on_hand: Number(e.target.value) }))} className="bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Reorder Level</Label>
                        <Input type="number" min={0} value={editForm.reorder_level ?? 0} onChange={e => setEditForm(f => ({ ...f, reorder_level: Number(e.target.value) }))} className="bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unit Price ($)</Label>
                        <Input type="number" min={0} step={0.01} value={editForm.unit_price ?? 0} onChange={e => setEditForm(f => ({ ...f, unit_price: Number(e.target.value) }))} className="bg-background" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Supplier</Label>
                      <Input value={editForm.supplier ?? ''} onChange={e => setEditForm(f => ({ ...f, supplier: e.target.value }))} className="bg-background" />
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
                      { icon: Hash,       label: 'Part Number',    value: selected.part_number },
                      { icon: Tag,        label: 'Category',       value: selected.category },
                      { icon: Wrench,     label: 'Component',      value: selected.component_name },
                      { icon: Tag,        label: 'Compatibility',  value: selected.compatibility },
                      { icon: Building2,  label: 'Supplier',       value: selected.supplier },
                      { icon: DollarSign, label: 'Unit Price',     value: `$${selected.unit_price.toFixed(2)}` },
                      { icon: Hash,       label: 'Weight',         value: `${selected.weight_kg} kg` },
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
                      <span className="text-xs text-muted-foreground">Stock: {selected.quantity_on_hand} / Reorder at: {selected.reorder_level}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[selected.status].class}`}>
                        {STATUS_CONFIG[selected.status].label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Part Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Add New Part</DialogTitle>
            <DialogDescription>Register a new part in the catalogue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Part Name *</Label>
                <Input placeholder="Fuel Injector 6.7L" value={newForm.name ?? ''} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Part Number *</Label>
                <Input placeholder="FI-4021-A" value={newForm.part_number ?? ''} onChange={e => setNewForm(f => ({ ...f, part_number: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Component Group</Label>
                <Select value={String(newForm.component_id ?? 0)} onValueChange={v => setNewForm(f => ({ ...f, component_id: Number(v) }))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {components.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input placeholder="Fuel System" value={newForm.category ?? ''} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit Price ($)</Label>
                <Input type="number" min={0} step={0.01} value={newForm.unit_price ?? 0} onChange={e => setNewForm(f => ({ ...f, unit_price: Number(e.target.value) }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity on Hand</Label>
                <Input type="number" min={0} value={newForm.quantity_on_hand ?? 0} onChange={e => setNewForm(f => ({ ...f, quantity_on_hand: Number(e.target.value) }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reorder Level</Label>
                <Input type="number" min={0} value={newForm.reorder_level ?? 5} onChange={e => setNewForm(f => ({ ...f, reorder_level: Number(e.target.value) }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Supplier</Label>
                <Input placeholder="Cummins Direct" value={newForm.supplier ?? ''} onChange={e => setNewForm(f => ({ ...f, supplier: e.target.value }))} className="bg-background" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Compatibility</Label>
                <Input placeholder="ISX15, All" value={newForm.compatibility ?? ''} onChange={e => setNewForm(f => ({ ...f, compatibility: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Weight (kg)</Label>
                <Input type="number" min={0} step={0.1} value={newForm.weight_kg ?? 0} onChange={e => setNewForm(f => ({ ...f, weight_kg: Number(e.target.value) }))} className="bg-background" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
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
