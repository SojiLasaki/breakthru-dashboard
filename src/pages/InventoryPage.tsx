import { useEffect, useState, useCallback } from 'react';
import { inventoryApi, InventoryItem } from '@/services/inventoryApi';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Search, AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react';

export default function InventoryPage() {
  const { isRole } = useAuth();
  const { addNotification } = useNotifications();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orderItem, setOrderItem] = useState<InventoryItem | null>(null);
  const [orderQty, setOrderQty] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    inventoryApi.getAll().then(setItems).finally(() => { setLoading(false); setLastRefresh(new Date()); });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [load]);

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.part_number.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = items.filter(i => i.quantity <= i.reorder_level).length;

  const handleOrder = async () => {
    if (!orderItem) return;
    setOrdering(true);
    try {
      await inventoryApi.createOrder(orderItem.id, orderQty);
      addNotification({ type: 'order', title: 'Order Created', message: `Order for ${orderQty}x ${orderItem.name} submitted successfully.` });
      setOrderItem(null);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inventory</h1>
          <p className="text-muted-foreground text-sm">Parts and supplies management</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {lowStock > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-primary font-medium">{lowStock} item{lowStock > 1 ? 's' : ''} below reorder level</span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parts..." className="pl-9 bg-card" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Part #', 'Name', 'Category', 'Quantity', 'Reorder Level', 'Unit Price', 'Supplier', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No items found</td></tr>
              ) : filtered.map((item, i) => {
                const isLow = item.quantity <= item.reorder_level;
                return (
                  <tr key={item.id} className={`border-b border-border hover:bg-accent/30 transition-colors ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.part_number}</td>
                    <td className="px-4 py-3 text-xs font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${isLow ? 'text-primary' : 'text-green-400'}`}>
                        {item.quantity} {isLow && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.reorder_level}</td>
                    <td className="px-4 py-3 text-xs">${item.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.supplier}</td>
                    <td className="px-4 py-3">
                      {isRole('admin', 'office_staff') && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => { setOrderItem(item); setOrderQty(item.reorder_level); }}>
                          <ShoppingCart className="h-3 w-3" /> Order
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>{filtered.length} items</span>
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Order Dialog */}
      <Dialog open={!!orderItem} onOpenChange={() => setOrderItem(null)}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>Create Order</DialogTitle>
            <DialogDescription>{orderItem?.name} — {orderItem?.part_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min={1} value={orderQty} onChange={e => setOrderQty(Number(e.target.value))} className="bg-input" />
            </div>
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">${((orderItem?.unit_price || 0) * orderQty).toFixed(2)}</span>
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleOrder} disabled={ordering}>
              {ordering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
