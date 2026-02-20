import { useEffect, useState } from 'react';
import { componentApi, Component } from '@/services/componentApi';
import { partApi, Part } from '@/services/partApi';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Search, Layers, ChevronRight, Package } from 'lucide-react';

const STATUS_CONFIG = {
  active:       { label: 'Active',       class: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  discontinued: { label: 'Discontinued', class: 'text-muted-foreground bg-muted/50 border border-border' },
  pending:      { label: 'Pending',      class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
};

const PART_STATUS_CONFIG = {
  in_stock:     { label: 'In Stock',     class: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  low_stock:    { label: 'Low Stock',    class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  out_of_stock: { label: 'Out of Stock', class: 'text-primary bg-primary/10 border border-primary/20' },
  discontinued: { label: 'Discontinued', class: 'text-muted-foreground bg-muted/50 border border-border' },
};

export default function ComponentsPage() {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Component | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  useEffect(() => {
    componentApi.getAll().then(setComponents).finally(() => setLoading(false));
  }, []);

  const openComponent = async (comp: Component) => {
    setSelected(comp);
    setLoadingParts(true);
    try {
      const p = await partApi.getByComponent(comp.id);
      setParts(p);
    } finally {
      setLoadingParts(false);
    }
  };

  const filtered = components.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase()) ||
    c.engine_model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Components</h1>
        <p className="text-muted-foreground text-sm">Engine component groups and assemblies</p>
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
          <p className="text-2xl font-bold">{components.reduce((s, c) => s + c.part_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Total Parts</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, category, or engine model..." className="pl-9 bg-card" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Component Group', 'Code', 'Category', 'Engine Model', 'Parts', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No components found</td></tr>
                ) : filtered.map((c, i) => {
                  const cfg = STATUS_CONFIG[c.status];
                  return (
                    <tr key={c.id} className={`border-b border-border hover:bg-accent/30 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-muted/10' : ''}`} onClick={() => openComponent(c)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-medium">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{c.description.slice(0, 50)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.code}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.category}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.engine_model}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{c.part_count}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Parts drill-down dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              {selected?.name}
            </DialogTitle>
            <DialogDescription>{selected?.code} · {selected?.engine_model}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{selected?.description}</p>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Parts in this group</p>
            {loadingParts ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {parts.map(p => {
                  const cfg = PART_STATUS_CONFIG[p.status];
                  return (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20 hover:bg-accent/30">
                      <div>
                        <p className="text-xs font-medium">{p.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{p.part_number}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Qty: {p.quantity_on_hand}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
