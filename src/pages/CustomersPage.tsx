import { useEffect, useState } from 'react';
import { customerApi, Customer } from '@/services/customerApi';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, User, MapPin, Phone, Mail, Building2, Ticket } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    customerApi.getAll().then(setCustomers).finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.location.toLowerCase().includes(search.toLowerCase())
  );

  const active = customers.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm">{active} active customers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('table')} className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}>Table</button>
          <button onClick={() => setView('cards')} className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${view === 'cards' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}>Cards</button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{customers.length}</p>
          <p className="text-xs text-muted-foreground">Total Customers</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-green-400">{active}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-primary">{customers.reduce((s, c) => s + c.open_tickets, 0)}</p>
          <p className="text-xs text-muted-foreground">Open Tickets</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers, companies, locations..." className="pl-9 bg-card" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : view === 'table' ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Name', 'Company', 'Location', 'Contact', 'Open Tickets', 'Total', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No customers found</td></tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id} className={`border-b border-border hover:bg-accent/30 transition-colors ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-xs font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.company}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.location}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${c.open_tickets > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{c.open_tickets}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.total_tickets}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.status === 'active' ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-muted-foreground bg-muted/50 border border-border'}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">{filtered.length} customers</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="bg-card border-border card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">{c.company}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.status === 'active' ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-muted-foreground bg-muted/50 border border-border'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><MapPin className="h-3 w-3" />{c.location}</div>
                  <div className="flex items-center gap-2"><Phone className="h-3 w-3" />{c.phone}</div>
                  <div className="flex items-center gap-2"><Mail className="h-3 w-3 flex-shrink-0" />{c.email}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Ticket className="h-3 w-3" />
                    <span>{c.open_tickets} open / {c.total_tickets} total</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
