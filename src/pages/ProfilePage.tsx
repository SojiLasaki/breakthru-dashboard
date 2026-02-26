import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Shield, Wrench, Zap, Settings, Users, BookOpen, Bot, Search, Clock, CheckCircle2, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROLE_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string; description: string }> = {
  admin:                  { label: 'Administrator',          icon: Shield,   color: 'text-red-400 bg-red-400/10 border-red-400/20',     description: 'Full system access. Manages users, roles, and all operational data.' },
  office_staff:           { label: 'Office Staff',           icon: Users,    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',   description: 'Manages tickets, orders, and customer interactions.' },
  engine_technician:      { label: 'Engine Technician',      icon: Wrench,   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',description: 'Handles engine-related service tickets and maintenance.' },
  electrical_technician:  { label: 'Electrical Technician',  icon: Zap,      color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', description: 'Diagnoses and repairs electrical system faults.' },
  customer:               { label: 'Customer',               icon: User,     color: 'text-green-400 bg-green-400/10 border-green-400/20',description: 'Can submit and track support tickets and access manuals.' },
};

const ACCESS_MAP: Record<string, string[]> = {
  admin:                 ['Dashboard', 'All Tickets', 'All Assets', 'Customers', 'Orders', 'Technicians', 'Transactions', 'Components', 'Parts', 'Manuals', 'AI Agents', 'Ask Felix', 'Logs', 'Settings'],
  office_staff:          ['Dashboard', 'All Tickets', 'All Assets', 'Customers', 'Orders', 'Technicians', 'Transactions', 'Components', 'Parts', 'Manuals', 'AI Agents', 'Ask Felix', 'Logs'],
  engine_technician:     ['Dashboard', 'My Tickets', 'My Assets', 'Manuals', 'Ask Felix (Tutor Mode)'],
  electrical_technician: ['Dashboard', 'My Tickets', 'My Assets', 'Manuals', 'Ask Felix (Tutor Mode)'],
  customer:              ['Dashboard', 'My Tickets', 'My Assets', 'Support'],
};

const EXP_MAP: Record<string, number> = {
  admin: 95,
  office_staff: 72,
  engine_technician: 68,
  electrical_technician: 61,
  customer: 20,
};

const STATUS_ICON: Record<string, React.FC<{ className?: string }>> = {
  open: AlertCircle,
  assigned: Clock,
  in_progress: Clock,
  awaiting_parts: Clock,
  awaiting_approval: Clock,
  completed: CheckCircle2,
};

const STATUS_CLASS: Record<string, string> = {
  open: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  assigned: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  in_progress: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  awaiting_parts: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  awaiting_approval: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  completed: 'text-green-400 bg-green-400/10 border-green-400/20',
};

const PRIORITY_CLASS: Record<string, string> = {
  low: 'text-muted-foreground bg-muted/50 border-border',
  medium: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  high: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  severe: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    ticketApi.getAll().then(t => { setTickets(t); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.title.toLowerCase().includes(q) || t.ticket_id.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  if (!user) return null;

  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG['customer'];
  const RoleIcon = cfg.icon;
  const access = ACCESS_MAP[user.role] ?? [];
  const expScore = EXP_MAP[user.role] ?? 0;
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

  const completedCount = tickets.filter(t => t.status === 'completed').length;
  const openCount = tickets.filter(t => t.status !== 'completed').length;

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-xl font-semibold">My Profile</h1>
        <p className="text-muted-foreground text-sm">Your account details, experience, and ticket history</p>
      </div>

      {/* Top row: Identity + Experience + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Identity */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="flex flex-col items-center justify-center gap-3 p-8 bg-muted/30 border-b sm:border-b-0 sm:border-r border-border sm:min-w-[180px]">
                <div className="w-20 h-20 rounded-full bg-primary/15 ring-2 ring-primary/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{initials || <User className="h-8 w-8" />}</span>
                </div>
                <div className="text-center">
                  <p className="font-semibold">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">ID #{user.id ?? '—'}</p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="flex-1 p-6 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Contact</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-primary/60" />
                    <span>{user.email}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Role</p>
                  <div className="flex items-start gap-2">
                    <RoleIcon className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{cfg.description}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {access.map(item => (
                      <Badge key={item} variant="outline" className="text-[10px] border-border text-muted-foreground">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Experience + Quick Stats */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Experience Level
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black text-primary leading-none">{expScore}</span>
                <span className="text-sm text-muted-foreground pb-1">/ 100</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${expScore}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {expScore >= 80 ? 'Expert' : expScore >= 60 ? 'Proficient' : expScore >= 40 ? 'Intermediate' : 'Beginner'}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{completedCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Completed</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{openCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Open</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tickets Section */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Ticket History
              <Badge variant="outline" className="text-[10px] ml-1">{filtered.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search tickets…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs w-48 bg-muted/30"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[130px] bg-muted/30">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="awaiting_parts">Awaiting Parts</SelectItem>
                  <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 text-xs w-[120px] bg-muted/30">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No tickets found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(t => {
                const SIcon = STATUS_ICON[t.status] ?? Clock;
                return (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <SIcon className={`h-4 w-4 flex-shrink-0 ${(STATUS_CLASS[t.status] ?? '').split(' ')[0]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-primary/70">{t.ticket_id}</span>
                        <span className="text-sm font-medium truncate">{t.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.customer} · {t.category}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${PRIORITY_CLASS[t.priority] ?? ''}`}>
                      {t.priority}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_CLASS[t.status] ?? ''}`}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'My Tickets', href: '/tickets',  icon: Settings, show: true },
              { label: 'Manuals',    href: '/manuals',  icon: BookOpen, show: user.role !== 'customer' },
              { label: 'AI Agents',  href: '/ai-agents', icon: Bot,     show: user.role !== 'customer' },
              { label: 'Ask Felix',  href: '/ask-ai',   icon: Wrench,   show: user.role !== 'customer' },
            ].filter(l => l.show).map(link => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <link.icon className="h-4 w-4 text-primary/60" />
                {link.label}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
