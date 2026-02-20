import { useEffect, useState, useMemo } from 'react';
import { partApi, Part } from '@/services/partApi';
import { componentApi, Component } from '@/services/componentApi';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  in_stock:     { label: 'In Stock',     class: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  low_stock:    { label: 'Low Stock',    class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  out_of_stock: { label: 'Out of Stock', class: 'text-primary bg-primary/10 border border-primary/20' },
  discontinued: { label: 'Discontinued', class: 'text-muted-foreground bg-muted/50 border border-border' },
};

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [componentFilter, setComponentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const alerts = parts.filter(p => p.status === 'out_of_stock' || p.status === 'low_stock').length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Parts</h1>
        <p className="text-muted-foreground text-sm">Individual parts catalogue across all component groups</p>
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
            {components.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Part #', 'Name', 'Component Group', 'Category', 'Qty', 'Reorder', 'Unit Price', 'Supplier', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">No parts found</td></tr>
              ) : filtered.map((p, i) => {
                const cfg = STATUS_CONFIG[p.status];
                const isAlert = p.status === 'low_stock' || p.status === 'out_of_stock';
                return (
                  <tr key={p.id} className={`border-b border-border hover:bg-accent/30 transition-colors ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.part_number}</td>
                    <td className="px-4 py-3 text-xs font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.component_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${isAlert ? 'text-primary' : 'text-foreground'}`}>
                        {p.quantity_on_hand} {isAlert && <AlertTriangle className="h-3 w-3 inline ml-0.5" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.reorder_level}</td>
                    <td className="px-4 py-3 text-xs">${p.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.supplier}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">{filtered.length} of {parts.length} parts</div>
      </div>
    </div>
  );
}
