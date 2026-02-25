import { useEffect, useState, useMemo } from 'react';
import { componentApi, Component } from '@/services/componentApi';
import { partApi, Part } from '@/services/partApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/DataTable';
import { Loader2, Search, Layers, Package, Plus, Tag, Calendar, Pencil, Save, X } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  active:       { label: 'Active',       class: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  discontinued: { label: 'Discontinued', class: 'text-muted-foreground bg-muted/50 border border-border' },
  pending:      { label: 'Pending',      class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
};

const PART_STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  in_stock:     { label: 'In Stock',     class: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  low_stock:    { label: 'Low Stock',    class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  out_of_stock: { label: 'Out of Stock', class: 'text-primary bg-primary/10 border border-primary/20' },
  discontinued: { label: 'Discontinued', class: 'text-muted-foreground bg-muted/50 border border-border' },
};

const BLANK_FORM = { name: '', component_number: '', group: '', description: '' };

export default function ComponentsPage() {
  const { isRole } = useAuth();
  const { toast } = useToast();
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Component | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Component>>({});
  const [saving, setSaving] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newForm, setNewForm] = useState(BLANK_FORM);
  const [creating, setCreating] = useState(false);

  const isAdmin = isRole('admin', 'office_staff');

  useEffect(() => {
    componentApi.getAll()
      .then(data => setComponents(Array.isArray(data) ? data : []))
      .catch(() => setComponents([]))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (comp: Component) => {
    setSelected(comp);
    setEditing(false);
    setEditForm({ status: comp.status, description: comp.description });
    setLoadingParts(true);
    setParts([]);
    try {
      const p = await partApi.getBycomponents(String(comp.id));
      setParts(Array.isArray(p) ? p : []);
    } catch {
      setParts([]);
    } finally {
      setLoadingParts(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await componentApi.update(selected.id, editForm);
      const merged = { ...selected, ...updated };
      setComponents(prev => prev.map(c => c.id === merged.id ? merged : c));
      setSelected(merged);
      setEditing(false);
      toast({ title: 'Updated', description: `${merged.name} has been updated.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update component.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newForm.name.trim() || !newForm.component_number.trim()) return;
    setCreating(true);
    try {
      const created = await componentApi.create(newForm);
      setComponents(prev => [created, ...prev]);
      setAddOpen(false);
      setNewForm(BLANK_FORM);
      toast({ title: 'Component added', description: `${created.name} has been registered.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to add component.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() =>
    components.filter(c =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.component_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.group?.toLowerCase().includes(search.toLowerCase())
    ),
    [components, search]
  );

  const columns: Column<Component>[] = [
    {
      label: 'Component Name',
      render: row => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Layers className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium">{row.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate">{row.description}</p>
          </div>
        </div>
      ),
    },
    { label: 'Component Number',         render: row => <span className="font-mono text-xs text-muted-foreground">{row.component_number}</span> },
    { label: 'Group',     render: row => <span className="text-xs text-muted-foreground">{row.group}</span> },
    { label: "Quantity Available", render: row => <span className="text-xs text-muted-foreground">{row.quantity_available ?? 0}</span> },
    {
      label: 'Parts',
      render: row => (
        <div className="flex items-center gap-1 text-xs">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{row.parts_count ?? 0}</span>
        </div>
      ),
    },
    {
      label: 'Status',
      render: row => {
        const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.active;
        return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Components</h1>
          <p className="text-muted-foreground text-sm">Engine component groups and assemblies</p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Component
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{components.length}</p>
          <p className="text-xs text-muted-foreground">Total Groups</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-green-400">{components.filter(c => c.status === 'active').length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{components.reduce((s, c) => s + (c.quantity_available ?? 0), 0)}</p>
          <p className="text-xs text-muted-foreground">Total Parts</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, component number, group, or engine model..." className="pl-9 bg-card" />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={openDetail}
        rowKey={r => r.id}
        emptyMessage="No components found"
        footer={`${filtered.length} of ${components.length} components · click a row to view parts`}
      />

      {/* Detail + Edit Sheet */}
      <Sheet open={!!selected} onOpenChange={open => { if (!open) { setSelected(null); setEditing(false); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Layers className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <SheetTitle className="text-base leading-tight">{selected.name}</SheetTitle>
                      <p className="text-xs font-mono text-muted-foreground">{selected.component_number} · {selected.group}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.active).class}`}>
                        {(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.active).label}
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
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editing Component</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name</Label>
                      <Input value={editForm.name ?? selected.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="bg-background" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Component Number</Label>
                        <Input value={editForm.component_number ?? selected.component_number} onChange={e => setEditForm(f => ({ ...f, component_number: e.target.value }))} className="bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">group</Label>
                        <Input value={editForm.group ?? selected.group} onChange={e => setEditForm(f => ({ ...f, group: e.target.value }))} className="bg-background" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Engine Model</Label>
                      <Input value={editForm.group ?? selected.group} onChange={e => setEditForm(f => ({ ...f, group: e.target.value }))} className="bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={editForm.status ?? selected.status} onValueChange={v => setEditForm(f => ({ ...f, status: v as Component['status'] }))}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="discontinued">Discontinued</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <Textarea value={editForm.description ?? selected.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} className="bg-background resize-none" />
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
                  <>
                    <div className="space-y-3">
                      {[
                        { icon: Tag,      label: 'component_number',         value: selected.component_number },
                        { icon: Layers,   label: 'group',     value: selected.group },
                        { icon: Package,  label: 'Engine Model', value: selected.group },
                        { icon: Calendar, label: 'Created',      value: selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—' },
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
                    <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground">{selected.description}</div>
                  </>
                )}

                {/* Parts list */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Parts in this group</p>
                  {loadingParts ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                  ) : parts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No parts found for this component</p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {parts.map(p => {
                        const cfg = PART_STATUS_CONFIG[p.status] ?? PART_STATUS_CONFIG.in_stock;
                        return (
                          <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20 hover:bg-accent/30 transition-colors">
                            <div>
                              <p className="text-xs font-medium">{p.name}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{p.part_number}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">Qty: {p.quantity_available}</span>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Component Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Add Component Group</DialogTitle>
            <DialogDescription>Register a new engine component group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input placeholder="Fuel Injection System" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">component_number *</Label>
                <Input placeholder="FIS-6700" value={newForm.component_number} onChange={e => setNewForm(f => ({ ...f, component_number: e.target.value }))} className="bg-background" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">group</Label>
                <Input placeholder="Fuel System" value={newForm.group} onChange={e => setNewForm(f => ({ ...f, group: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Engine Model</Label>
                <Input placeholder="ISX15" value={newForm.group} onChange={e => setNewForm(f => ({ ...f, engine_model: e.target.value }))} className="bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="Brief description..." value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} rows={2} className="bg-background resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={creating || !newForm.name.trim() || !newForm.component_number.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Component
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
