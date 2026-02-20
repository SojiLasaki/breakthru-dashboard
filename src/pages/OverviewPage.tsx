import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { technicianApi, Technician } from '@/services/technicianApi';
import { orderApi, Order } from '@/services/orderApi';
import { Ticket as TicketIcon, Users, Package, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function OverviewPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([ticketApi.getAll(), technicianApi.getAll(), orderApi.getAll()])
      .then(([t, tech, o]) => { setTickets(t); setTechnicians(tech); setOrders(o); })
      .finally(() => setLoading(false));
  }, []);

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'urgent').length;
  const urgentTickets = tickets.filter(t => t.status === 'urgent').length;
  const availableTechs = technicians.filter(t => t.availability === 'available').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  const statCards = [
    { label: 'Open Tickets', value: openTickets, icon: TicketIcon, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Urgent Issues', value: urgentTickets, icon: AlertCircle, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Available Techs', value: availableTechs, icon: Users, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Pending Orders', value: pendingOrders, icon: ShoppingCart, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  ];

  const statusColors: Record<string, string> = {
    open: 'status-open',
    in_progress: 'status-in-progress',
    closed: 'status-closed',
    urgent: 'status-urgent',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Welcome back, {user?.first_name}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Here's what's happening today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-card border-border card-hover">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{loading ? '—' : value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-primary" /> Recent Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tickets.slice(0, 5).map((t, i) => (
              <div key={t.id} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 1 ? 'bg-muted/20' : ''} hover:bg-accent/30 transition-colors`}>
                <div>
                  <p className="text-xs font-medium text-foreground">{t.ticket_id}: {t.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.assigned_technician}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[t.status]}`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Technician status */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Technician Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {technicians.map((t, i) => (
              <div key={t.id} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${t.availability === 'available' ? 'bg-green-400' : t.availability === 'busy' ? 'bg-yellow-400' : 'bg-muted-foreground'}`} />
                  <div>
                    <p className="text-xs font-medium text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{t.specialization.replace('_', ' ')}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{t.active_tickets} tickets</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
