import { useEffect, useState } from 'react';
import { orderApi, Order } from '@/services/orderApi';
import { Loader2, Package } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  approved: { label: 'Approved', class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' },
  shipped: { label: 'Shipped', class: 'text-purple-400 bg-purple-400/10 border border-purple-400/20' },
  delivered: { label: 'Delivered', class: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  cancelled: { label: 'Cancelled', class: 'text-muted-foreground bg-muted/50 border border-border' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.getAll().then(setOrders).finally(() => setLoading(false));
  }, []);

  const total = orders.reduce((sum, o) => sum + o.total_price, 0);
  const pending = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Orders</h1>
        <p className="text-muted-foreground text-sm">Parts and supply orders tracking</p>
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
              ) : orders.map((o, i) => {
                const cfg = STATUS_CONFIG[o.status];
                return (
                  <tr key={o.id} className={`border-b border-border hover:bg-accent/30 transition-colors ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
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
      </div>
    </div>
  );
}
