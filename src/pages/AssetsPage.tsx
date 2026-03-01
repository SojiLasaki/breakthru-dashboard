import { useEffect, useState, useMemo } from 'react';
import { assetsApi, Asset } from '@/services/assetsApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Search, Settings, Zap, Box, RefreshCw, ChevronRight,
  MapPin, Calendar, Hash, User, Clock, AlertCircle, CheckCircle2,
  Wrench, Pencil, Save, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';

const TYPE_ICONS = { generator: Zap, engine: Settings, panel: Box, other: Box };

const STATUS_CONFIG = {
  operational:    { label: 'Operational',    class: 'text-green-400 bg-green-400/10 border border-green-400/20', dot: 'bg-green-400' },
  maintenance:    { label: 'Maintenance',    class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', dot: 'bg-yellow-400' },
  offline:        { label: 'Offline',        class: 'text-primary bg-primary/10 border border-primary/20', dot: 'bg-primary' },
  decommissioned: { label: 'Decommissioned', class: 'text-muted-foreground bg-muted/50 border border-border', dot: 'bg-muted-foreground' },
};

export default function AssetsPage() {
  const { isRole } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});
  const [saving, setSaving] = useState(false);

  const isAdmin = isRole('admin', 'office');

  const load = () => {
    setLoading(true);
    assetsApi.getAll().then(setAssets).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    assets.filter(a => {
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.model.toLowerCase().includes(search.toLowerCase()) || a.customer_name.toLowerCase().includes(search.toLowerCase()) || a.asset_id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchType   = typeFilter === 'all'   || a.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    }),
    [assets, search, statusFilter, typeFilter]
  );

  const openDetail = (a: Asset) => {
    setSelected(a);
    setEditing(false);
    setEditForm({ status: a.status, location: a.location, next_service_date: a.next_service_date });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await assetsApi.update(selected.id, editForm);
      const merged = { ...selected, ...updated };
      setAssets(prev => prev.map(a => a.id === merged.id ? merged : a));
      setSelected(merged);
      setEditing(false);
      toast({ title: 'Asset updated', description: `${merged.name} has been updated.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update asset.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const operational = assets.filter(a => a.status === 'operational').length;
  const maintenance  = assets.filter(a => a.status === 'maintenance').length;
  const offline      = assets.filter(a => a.status === 'offline').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Assets</h1>
          <p className="text-muted-foreground text-sm">Equipment registry and service tracking</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{assets.length}</p>
          <p className="text-xs text-muted-foreground">Total Assets</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-green-400">{operational}</p>
          <p className="text-xs text-muted-foreground">Operational</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-yellow-400">{maintenance}</p>
          <p className="text-xs text-muted-foreground">In Maintenance</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-primary">{offline}</p>
          <p className="text-xs text-muted-foreground">Offline</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="generator">Generator</SelectItem>
            <SelectItem value="engine">Engine</SelectItem>
            <SelectItem value="panel">Panel</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Asset', 'Model', 'Type', 'Customer', 'Location', 'Hours Run', 'Next Service', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">No assets found</td></tr>
              ) : filtered.map((a, i) => {
                const cfg = STATUS_CONFIG[a.status];
                const TypeIcon = TYPE_ICONS[a.type] ?? Box;
                const isOverdue = new Date(a.next_service_date) < new Date();
                return (
                  <tr
                    key={a.id}
                    className={`border-b border-border hover:bg-accent/30 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                    onClick={() => openDetail(a)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{a.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{a.asset_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.model}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{a.type}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.customer_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.location}</td>
                    <td className="px-4 py-3 text-xs font-medium">{a.hours_run.toLocaleString()}h</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${isOverdue ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        {isOverdue && <AlertCircle className="h-3 w-3 inline mr-1" />}
                        {new Date(a.next_service_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">{filtered.length} of {assets.length} assets · click a row to view details</div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={open => { if (!open) { setSelected(null); setEditing(false); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {selected && (() => {
            const cfg = STATUS_CONFIG[editing ? (editForm.status ?? selected.status) : selected.status];
            const TypeIcon = TYPE_ICONS[selected.type] ?? Box;
            const isOverdue = new Date(selected.next_service_date) < new Date();
            return (
              <>
                <SheetHeader className="pb-4 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <SheetTitle className="text-base">{selected.name}</SheetTitle>
                        <p className="text-xs font-mono text-muted-foreground">{selected.asset_id} · {selected.model}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 inline-block ${cfg.class}`}>{cfg.label}</span>
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
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editing Asset</p>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Status</Label>
                        <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v as Asset['status'] }))}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Location</Label>
                        <Input value={editForm.location ?? ''} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} className="bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Next Service Date</Label>
                        <Input type="date" value={editForm.next_service_date ?? ''} onChange={e => setEditForm(f => ({ ...f, next_service_date: e.target.value }))} className="bg-background" />
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
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Asset Details</p>
                        <div className="space-y-3">
                          {[
                            { icon: Hash,     label: 'Serial Number',   value: selected.serial_number },
                            { icon: Settings, label: 'Model',           value: selected.model },
                            { icon: User,     label: 'Customer',        value: selected.customer_name },
                            { icon: MapPin,   label: 'Location',        value: selected.location },
                            { icon: Clock,    label: 'Hours Run',       value: `${selected.hours_run.toLocaleString()} hrs` },
                            { icon: Calendar, label: 'Install Date',    value: new Date(selected.install_date).toLocaleDateString() },
                            { icon: Calendar, label: 'Last Service',    value: new Date(selected.last_service_date).toLocaleDateString() },
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

                      {/* Service status */}
                      <div className={`p-4 rounded-lg border ${isOverdue ? 'bg-primary/10 border-primary/20' : 'bg-green-400/5 border-green-400/20'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {isOverdue
                            ? <AlertCircle className="h-4 w-4 text-primary" />
                            : <CheckCircle2 className="h-4 w-4 text-green-400" />}
                          <p className={`text-xs font-semibold ${isOverdue ? 'text-primary' : 'text-green-400'}`}>
                            {isOverdue ? 'Service Overdue' : 'Service Up to Date'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          Next service: {new Date(selected.next_service_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
