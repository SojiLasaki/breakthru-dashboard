import { useEffect, useState, useMemo } from 'react';
import { transactionApi, Transaction } from '@/services/transactionApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DataTable, Column } from '@/components/DataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Search, Bot, CheckCircle2, XCircle, Clock, Package, DollarSign,
  User, Calendar, FileText, Loader2, ThumbsUp, ThumbsDown
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' },
  approved:  { label: 'Approved',  class: 'text-green-400 bg-green-400/10 border border-green-400/20' },
  rejected:  { label: 'Rejected',  class: 'text-primary bg-primary/10 border border-primary/20' },
  fulfilled: { label: 'Fulfilled', class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' },
};

export default function TransactionsPage() {
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [actioning, setActioning] = useState(false);

  const isAdmin = isRole('admin', 'office');

  useEffect(() => {
    transactionApi.getAll().then(setTransactions).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    transactions.filter(t => {
      const matchSearch = !search ||
        t.part_name.toLowerCase().includes(search.toLowerCase()) ||
        t.ai_agent.toLowerCase().includes(search.toLowerCase()) ||
        (t.approved_by ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    }),
    [transactions, search, statusFilter]
  );

  const approverName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.username || 'Admin';

  const handleApprove = async (tx: Transaction) => {
    setActioning(true);
    try {
      const updated = await transactionApi.approve(tx.id, approverName);
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
      setSelected(updated);
      toast({ title: 'Approved', description: `Order #${tx.order_id} approved.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to approve.', variant: 'destructive' });
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async (tx: Transaction) => {
    setActioning(true);
    try {
      const updated = await transactionApi.reject(tx.id, approverName);
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
      setSelected(updated);
      toast({ title: 'Rejected', description: `Order #${tx.order_id} rejected.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to reject.', variant: 'destructive' });
    } finally {
      setActioning(false);
    }
  };

  const pending = transactions.filter(t => t.status === 'pending').length;

  const columns: Column<Transaction>[] = [
    {
      label: 'Order #',
      render: row => <span className="font-mono text-xs text-muted-foreground">#{row.order_id}</span>,
    },
    {
      label: 'Part',
      render: row => (
        <div>
          <p className="text-xs font-medium">{row.part_name}</p>
          <p className="text-[10px] text-muted-foreground">Qty: {row.quantity}</p>
        </div>
      ),
    },
    {
      label: 'AI Agent',
      render: row => (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="h-3 w-3 text-primary" />
          </div>
          <span className="text-xs font-medium text-primary">{row.ai_agent}</span>
        </div>
      ),
    },
    {
      label: 'Approved By',
      render: row => row.approved_by
        ? <span className="text-xs text-muted-foreground">{row.approved_by}</span>
        : <span className="text-xs text-muted-foreground italic">—</span>,
    },
    {
      label: 'Total',
      render: row => <span className="text-xs font-semibold">${row.total_price.toFixed(2)}</span>,
    },
    {
      label: 'Date',
      render: row => <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      label: 'Status',
      render: row => {
        const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending;
        return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transactions</h1>
          <p className="text-muted-foreground text-sm">AI-initiated orders and approval history</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{transactions.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-yellow-400">{pending}</p>
          <p className="text-xs text-muted-foreground">Pending Approval</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-green-400">{transactions.filter(t => t.status === 'approved').length}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">${transactions.reduce((s, t) => s + t.total_price, 0).toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Total Value</p>
        </div>
      </div>

      {pending > 0 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg text-sm">
          <Clock className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          <span className="text-yellow-400 font-medium">{pending} AI-initiated order{pending > 1 ? 's' : ''} awaiting approval</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by part, agent, or approver..." className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={setSelected}
        rowKey={r => r.id}
        emptyMessage="No transactions found"
        footer={`${filtered.length} of ${transactions.length} transactions`}
      />

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border overflow-y-auto">
          {selected && (() => {
            const cfg = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pending;
            return (
              <>
                <SheetHeader className="pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <SheetTitle className="text-base leading-tight">{selected.part_name}</SheetTitle>
                      <p className="text-xs font-mono text-muted-foreground">Order #{selected.order_id}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${cfg.class}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </SheetHeader>

                <div className="mt-5 space-y-5">
                  {/* AI Agent block */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">AI Initiated By</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">{selected.ai_agent}</p>
                        <p className="text-[10px] text-muted-foreground">Autonomous ordering agent</p>
                      </div>
                    </div>
                  </div>

                  {/* Approval block */}
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Approval</p>
                    {selected.approved_by ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{selected.approved_by}</p>
                          {selected.approved_at && (
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(selected.approved_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {selected.status === 'approved'
                          ? <CheckCircle2 className="h-4 w-4 text-green-400 ml-auto" />
                          : <XCircle className="h-4 w-4 text-primary ml-auto" />
                        }
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Awaiting approval</p>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    {[
                      { icon: Package,    label: 'Quantity',   value: `${selected.quantity} units` },
                      { icon: DollarSign, label: 'Total',      value: `$${selected.total_price.toFixed(2)}` },
                      { icon: Calendar,   label: 'Created',    value: new Date(selected.created_at).toLocaleString() },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 text-xs">
                        <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className="font-medium">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selected.notes && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
                      </div>
                      <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                        {selected.notes}
                      </div>
                    </div>
                  )}

                  {/* Approve/Reject */}
                  {isAdmin && selected.status === 'pending' && (
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => handleReject(selected)}
                        disabled={actioning}
                      >
                        {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                        Reject
                      </Button>
                      <Button
                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(selected)}
                        disabled={actioning}
                      >
                        {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                        Approve
                      </Button>
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
