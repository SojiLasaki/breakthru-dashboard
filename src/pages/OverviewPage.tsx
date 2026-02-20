import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { technicianApi, Technician } from '@/services/technicianApi';
import { orderApi, Order } from '@/services/orderApi';
import { Ticket as TicketIcon, Users, Package, ShoppingCart, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_CLASSES: Record<string, string> = {
  open: 'status-open',
  in_progress: 'status-in-progress',
  closed: 'status-closed',
  urgent: 'status-urgent',
};

export default function OverviewPage() {
  const { user, isRole } = useAuth();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : '';
  const isTech = isRole('engine_technician', 'electrical_technician');
  const isCustomer = isRole('customer');
  const isAdminOrStaff = isRole('admin', 'office_staff');

  // Scope tickets by role
  const tickets = isAdminOrStaff
    ? allTickets
    : isTech
    ? allTickets.filter(t => t.assigned_technician === fullName)
    : allTickets.filter(t => t.created_by === fullName);

  useEffect(() => {
    const fetches: Promise<unknown>[] = [ticketApi.getAll().then(setAllTickets)];
    if (isAdminOrStaff) {
      fetches.push(technicianApi.getAll().then(setTechnicians));
      fetches.push(orderApi.getAll().then(setOrders));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [isAdminOrStaff]);

  const openTickets  = tickets.filter(t => t.status === 'open' || t.status === 'urgent').length;
  const urgentTickets = tickets.filter(t => t.status === 'urgent').length;
  const availableTechs = technicians.filter(t => t.availability === 'available').length;
  const pendingOrders  = orders.filter(o => o.status === 'pending').length;
  const closedTickets  = tickets.filter(t => t.status === 'closed').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;

  // Stat cards differ by role
  const statCards = isAdminOrStaff
    ? [
        { label: 'Open Tickets',    value: openTickets,       icon: TicketIcon,    color: 'text-blue-400',   bg: 'bg-blue-400/10' },
        { label: 'Urgent Issues',   value: urgentTickets,     icon: AlertCircle,   color: 'text-primary',    bg: 'bg-primary/10' },
        { label: 'Available Techs', value: availableTechs,    icon: Users,         color: 'text-green-400',  bg: 'bg-green-400/10' },
        { label: 'Pending Orders',  value: pendingOrders,     icon: ShoppingCart,  color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
      ]
    : isTech
    ? [
        { label: 'My Open Tickets',       value: openTickets,       icon: TicketIcon,   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
        { label: 'Urgent / Priority',     value: urgentTickets,     icon: AlertCircle,  color: 'text-primary',    bg: 'bg-primary/10' },
        { label: 'In Progress',           value: inProgressTickets, icon: Package,      color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        { label: 'Completed',             value: closedTickets,     icon: ShoppingCart, color: 'text-green-400',  bg: 'bg-green-400/10' },
      ]
    : [ // customer
        { label: 'My Tickets',    value: tickets.length,     icon: TicketIcon,   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
        { label: 'Open',          value: openTickets,        icon: AlertCircle,  color: 'text-primary',    bg: 'bg-primary/10' },
        { label: 'In Progress',   value: inProgressTickets,  icon: Package,      color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        { label: 'Resolved',      value: closedTickets,      icon: ShoppingCart, color: 'text-green-400',  bg: 'bg-green-400/10' },
      ];

  const greeting = isTech
    ? `Welcome, ${user?.first_name}. Here are your assigned tickets.`
    : isCustomer
    ? `Welcome, ${user?.first_name}. Track your service requests below.`
    : `Welcome back, ${user?.first_name}. Here's what's happening today.`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{isAdminOrStaff ? `Welcome back, ${user?.first_name}` : `Hello, ${user?.first_name}`}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{greeting.split('.').slice(1).join('.').trim() || 'Here\'s your dashboard.'}</p>
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
        {/* Scoped recent tickets */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-primary" />
              {isTech ? 'Your Assigned Tickets' : isCustomer ? 'Your Submitted Tickets' : 'Recent Tickets'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-6 text-center text-muted-foreground text-xs">Loading…</div>
            ) : tickets.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No tickets to display</div>
            ) : tickets.slice(0, 6).map((t, i) => (
              <div key={t.id} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 1 ? 'bg-muted/20' : ''} hover:bg-accent/30 transition-colors`}>
                <div>
                  <p className="text-xs font-medium text-foreground">{t.ticket_id}: {t.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isTech ? `Created by: ${t.created_by}` : `Tech: ${t.assigned_technician}`}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLASSES[t.status]}`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right panel — techs/customers get summary; admins/staff get technician list */}
        {isAdminOrStaff ? (
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
        ) : (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" /> Ticket Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { label: 'Urgent / Critical', value: urgentTickets, dotClass: 'bg-primary' },
                { label: 'In Progress',        value: inProgressTickets, dotClass: 'bg-yellow-400' },
                { label: 'Open',               value: openTickets - urgentTickets, dotClass: 'bg-blue-400' },
                { label: 'Closed',             value: closedTickets, dotClass: 'bg-green-400' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${row.dotClass}`} />
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                  </div>
                  <span className="text-xs font-semibold">{loading ? '—' : row.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
