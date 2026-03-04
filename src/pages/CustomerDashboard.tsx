import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { assetsApi } from '@/services/assetsApi';
import { Ticket as TicketIcon, Cpu, Loader2, Plus, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ticketPriorityLabel, ticketStatusBadgeClass } from '@/lib/ticketBadges';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : '';

  useEffect(() => {
    Promise.all([
      ticketApi.getAll().catch(() => []),
      assetsApi.getAll().catch(() => []),
    ]).then(([t, a]) => {
      setTickets(t);
      setAssets(a);
    }).finally(() => setLoading(false));
  }, []);

  const openTickets = tickets.filter(t => t.status !== 'completed');
  const urgentTickets = tickets.filter(t => t.priority >= 4 && t.status !== 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {fullName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's an overview of your account</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/assets')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Cpu className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{assets.length}</p>
              <p className="text-xs text-muted-foreground">My Assets</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/tickets')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TicketIcon className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{openTickets.length}</p>
              <p className="text-xs text-muted-foreground">Open Tickets</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertCircle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{urgentTickets.length}</p>
              <p className="text-xs text-muted-foreground">Urgent Issues</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Tickets</CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigate('/tickets')}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No tickets yet</p>
          ) : (
            <div className="space-y-2">
              {tickets.slice(0, 5).map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/tickets/${t.id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.specialization} · {ticketPriorityLabel(t.priority) || t.priority}</p>
                  </div>
                  <Badge variant="outline" className={ticketStatusBadgeClass(t.status)}>
                    {t.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
