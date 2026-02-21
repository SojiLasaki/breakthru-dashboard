import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { technicianApi, Technician } from '@/services/technicianApi';
import { orderApi, Order } from '@/services/orderApi';
import { customerApi, Customer } from '@/services/customerApi';
import {
  Ticket as TicketIcon, Users, ShoppingCart, AlertCircle, User,
  Wrench, BookOpen, Sparkles, Cpu, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const STATUS_CLASSES: Record<string, string> = {
  open: 'status-open',
  in_progress: 'status-in-progress',
  closed: 'status-closed',
  urgent: 'status-urgent',
};

export default function OverviewPage() {
  const { user, isRole } = useAuth();
  const navigate = useNavigate();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : '';
  const isTech = isRole('engine_technician', 'electrical_technician');
  const isCustomer = isRole('customer');
  const isAdminOrStaff = isRole('admin', 'office_staff');

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
      fetches.push(customerApi.getAll().then(setCustomers));
    }
    if (isCustomer) {
      fetches.push(orderApi.getAll().then(setOrders));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [isAdminOrStaff, isCustomer]);

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'urgent').length;
  const urgentTickets = tickets.filter(t => t.status === 'urgent').length;
  const availableTechs = technicians.filter(t => t.availability === 'available').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const closedTickets = tickets.filter(t => t.status === 'closed').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;

  const statCards = isAdminOrStaff
    ? [
        { label: 'Open Tickets',    value: openTickets,    icon: TicketIcon,   color: 'text-[hsl(var(--info))]',    bg: 'bg-[hsl(var(--info))]/10' },
        { label: 'Urgent Issues',   value: urgentTickets,  icon: AlertCircle,  color: 'text-primary',               bg: 'bg-primary/10' },
        { label: 'Available Techs', value: availableTechs, icon: Users,        color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success))]/10' },
        { label: 'Pending Orders',  value: pendingOrders,  icon: ShoppingCart,  color: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning))]/10' },
      ]
    : isTech
    ? [
        { label: 'My Open Tickets',   value: openTickets,       icon: TicketIcon,  color: 'text-[hsl(var(--info))]',    bg: 'bg-[hsl(var(--info))]/10' },
        { label: 'Urgent / Priority', value: urgentTickets,     icon: AlertCircle, color: 'text-primary',               bg: 'bg-primary/10' },
        { label: 'In Progress',       value: inProgressTickets, icon: Wrench,      color: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning))]/10' },
        { label: 'Completed',         value: closedTickets,     icon: TicketIcon,  color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success))]/10' },
      ]
    : [
        { label: 'My Tickets',  value: tickets.length,    icon: TicketIcon,  color: 'text-[hsl(var(--info))]',    bg: 'bg-[hsl(var(--info))]/10' },
        { label: 'Open',        value: openTickets,       icon: AlertCircle, color: 'text-primary',               bg: 'bg-primary/10' },
        { label: 'In Progress', value: inProgressTickets, icon: Wrench,      color: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning))]/10' },
        { label: 'Resolved',    value: closedTickets,     icon: TicketIcon,  color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success))]/10' },
      ];

  const greeting = isTech
    ? 'Here are your assigned tickets and resources.'
    : isCustomer
    ? 'Track your service requests and assets below.'
    : 'Here\'s what\'s happening today.';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Welcome back, {user?.first_name}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">{greeting}</p>
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
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── ADMIN / STAFF: Three-section layout ── */}
      {isAdminOrStaff && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Customers */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Customers
                </CardTitle>
                <button onClick={() => navigate('/customers')} className="text-[10px] text-primary hover:underline">View all</button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {customers.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground text-sm">No customers</p>
              ) : customers.slice(0, 5).map((c, i) => (
                <div key={c.id} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 1 ? 'bg-muted/20' : ''} hover:bg-accent/30 transition-colors cursor-pointer`} onClick={() => navigate('/customers')}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{c.first_name} {c.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.company}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.status === 'active' ? 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20' : 'text-muted-foreground bg-muted/50 border border-border'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Technicians */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Technicians
                </CardTitle>
                <button onClick={() => navigate('/technicians')} className="text-[10px] text-primary hover:underline">View all</button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {technicians.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground text-sm">No technicians</p>
              ) : technicians.slice(0, 5).map((t, i) => (
                <div key={t.id} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 1 ? 'bg-muted/20' : ''} hover:bg-accent/30 transition-colors cursor-pointer`} onClick={() => navigate(`/technicians/${t.id}`)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${t.availability === 'available' ? 'bg-[hsl(var(--success))]' : t.availability === 'busy' ? 'bg-[hsl(var(--warning))]' : 'bg-muted-foreground'}`} />
                    <div>
                      <p className="text-xs font-medium">{t.first_name} {t.last_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{t.specialization.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{t.active_tickets} tickets</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TicketIcon className="h-4 w-4 text-primary" /> Recent Tickets
                </CardTitle>
                <button onClick={() => navigate('/tickets')} className="text-[10px] text-primary hover:underline">View all</button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground text-sm">No tickets</p>
              ) : tickets.slice(0, 6).map((t, i) => (
                <div key={t.id} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 1 ? 'bg-muted/20' : ''} hover:bg-accent/30 transition-colors`}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{t.ticket_id}: {t.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Tech: {t.assigned_technician}</p>
                  </div>
                  <Badge className={`text-[10px] flex-shrink-0 ml-2 ${STATUS_CLASSES[t.status]}`}>
                    {t.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TECHNICIAN: Relevant sections ── */}
      {isTech && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Assigned Tickets */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TicketIcon className="h-4 w-4 text-primary" /> Your Assigned Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground text-sm">No tickets assigned</p>
              ) : tickets.slice(0, 6).map((t, i) => (
                <div key={t.id} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 1 ? 'bg-muted/20' : ''} hover:bg-accent/30 transition-colors`}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{t.ticket_id}: {t.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Created by: {t.created_by}</p>
                  </div>
                  <Badge className={`text-[10px] flex-shrink-0 ml-2 ${STATUS_CLASSES[t.status]}`}>
                    {t.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Quick Access
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { label: 'Manuals', icon: BookOpen, path: '/manuals', desc: 'Technical documentation' },
                { label: 'Ask Felix', icon: Sparkles, path: '/ask-ai', desc: 'AI-powered assistance' },
                { label: 'Parts', icon: Wrench, path: '/parts', desc: 'Parts catalogue' },
                { label: 'Components', icon: Cpu, path: '/components', desc: 'Component groups' },
              ].map(({ label, icon: Icon, path, desc }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/30 hover:bg-accent/30 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── CUSTOMER: Orders + Assets + Support ── */}
      {isCustomer && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Submitted Tickets */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TicketIcon className="h-4 w-4 text-primary" /> Your Tickets
                </CardTitle>
                <button onClick={() => navigate('/tickets')} className="text-[10px] text-primary hover:underline">View all</button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground text-sm">No tickets submitted</p>
              ) : tickets.slice(0, 6).map((t, i) => (
                <div key={t.id} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 1 ? 'bg-muted/20' : ''} hover:bg-accent/30 transition-colors`}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{t.ticket_id}: {t.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Tech: {t.assigned_technician}</p>
                  </div>
                  <Badge className={`text-[10px] flex-shrink-0 ml-2 ${STATUS_CLASSES[t.status]}`}>
                    {t.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Links for Customer */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" /> Quick Access
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                { label: 'My Assets', icon: Cpu, path: '/assets', desc: 'View your registered assets' },
                { label: 'Support', icon: Sparkles, path: '/ask-ai', desc: 'Get help from Felix AI' },
              ].map(({ label, icon: Icon, path, desc }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/30 hover:bg-accent/30 transition-all text-left w-full"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
