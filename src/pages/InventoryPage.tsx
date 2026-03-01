import { useEffect, useState, useCallback } from 'react';
import { inventoryApi, InventoryItem } from '@/services/inventoryApi';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import {
  Loader2, Search, AlertTriangle, RefreshCw, ShoppingCart,
  Package, Hash, DollarSign, Truck, BarChart2,
} from 'lucide-react';

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
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    inventoryApi.getAll().then(setItems).finally(() => { setLoading(false); setLastRefresh(new Date()); });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.part_number.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = items.filter(i => i.quantity <= i.reorder_level).length;
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{items.length}</p>
          <p className="text-xs text-muted-foreground">Total SKUs</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-primary">{lowStock}</p>
          <p className="text-xs text-muted-foreground">Low / Reorder</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{items.reduce((s, i) => s + i.quantity, 0)}</p>
          <p className="text-xs text-muted-foreground">Total Units</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-muted-foreground">Stock Value</p>
        </div>
      </div>

      {lowStock > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-primary font-medium">{lowStock} item{lowStock > 1 ? 's' : ''} below reorder level — action required</span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parts by name, number, category..." className="pl-9 bg-card" />
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
                  <tr
                    key={item.id}
                    className={`border-b border-border hover:bg-accent/30 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                    onClick={() => setDetailItem(item)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.part_number}</td>
                    <td className="px-4 py-3 text-xs font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${isLow ? 'text-primary' : 'text-green-400'}`}>{item.quantity}</span>
                        {isLow && <AlertTriangle className="h-3 w-3 text-primary" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.reorder_level}</td>
                    <td className="px-4 py-3 text-xs">${item.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.supplier}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {isRole('admin', 'office') && (
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
          <span>{filtered.length} items · click a row to view details</span>
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Item Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={open => !open && setDetailItem(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-base">{detailItem.name}</SheetTitle>
                    <p className="text-xs font-mono text-muted-foreground">{detailItem.part_number}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                {/* Stock level visual */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Stock Level</p>
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <p className="text-3xl font-bold text-foreground">{detailItem.quantity}</p>
                        <p className="text-xs text-muted-foreground">units in stock</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Reorder at</p>
                        <p className="text-lg font-bold text-yellow-400">{detailItem.reorder_level}</p>
                      </div>
                    </div>
                    {/* Stock bar */}
                    <div className="h-2 bg-border rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-full rounded-full transition-all ${detailItem.quantity <= detailItem.reorder_level ? 'bg-primary' : 'bg-green-400'}`}
                        style={{ width: `${Math.min((detailItem.quantity / Math.max(detailItem.reorder_level * 3, detailItem.quantity)) * 100, 100)}%` }}
                      />
                    </div>
                    {detailItem.quantity <= detailItem.reorder_level && (
                      <p className="text-[10px] text-primary mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Below reorder level — action recommended
                      </p>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Item Info</p>
                  <div className="space-y-3">
                    {[
                      { icon: Hash,       label: 'Part Number', value: detailItem.part_number },
                      { icon: Package,    label: 'Category',    value: detailItem.category },
                      { icon: DollarSign, label: 'Unit Price',  value: `$${detailItem.unit_price.toFixed(2)}` },
                      { icon: Truck,      label: 'Supplier',    value: detailItem.supplier },
                      { icon: BarChart2,  label: 'Stock Value', value: `$${(detailItem.quantity * detailItem.unit_price).toFixed(2)}` },
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

                {isRole('admin', 'office') && (
                  <Button className="w-full gap-2 bg-primary hover:bg-primary/90" onClick={() => { setOrderItem(detailItem); setOrderQty(detailItem.reorder_level); setDetailItem(null); }}>
                    <ShoppingCart className="h-4 w-4" /> Create Reorder
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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
