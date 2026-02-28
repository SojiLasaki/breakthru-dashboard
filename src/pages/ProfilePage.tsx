import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  User, Mail, Shield, Wrench, Zap, Settings, Users, Search, Clock,
  CheckCircle2, AlertCircle, Loader2, TrendingUp, Phone, MapPin, Award, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROLE_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string; description: string }> = {
  admin:                  { label: 'Administrator',          icon: Shield,   color: 'text-red-400 bg-red-400/10 border-red-400/20',     description: 'Full system access.' },
  office_staff:           { label: 'Office Staff',           icon: Users,    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',   description: 'Manages tickets, orders, and customer interactions.' },
  engine_technician:      { label: 'Engine Technician',      icon: Wrench,   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',description: 'Handles engine-related service tickets and maintenance.' },
  electrical_technician:  { label: 'Electrical Technician',  icon: Zap,      color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', description: 'Diagnoses and repairs electrical system faults.' },
  customer:               { label: 'Customer',               icon: User,     color: 'text-green-400 bg-green-400/10 border-green-400/20',description: 'Can submit and track support tickets.' },
};

const SPECIALIZATION_MAP: Record<string, string> = {
  engine_technician: 'Engine',
  electrical_technician: 'Electrical',
  admin: 'General',
  office_staff: 'Operations',
  customer: '—',
};

const EXPERTISE_MAP: Record<string, string> = {
  admin: 'Senior',
  office_staff: 'Mid',
  engine_technician: 'Mid',
  electrical_technician: 'Mid',
  customer: '—',
};

const EXP_MAP: Record<string, number> = {
  admin: 95,
  office_staff: 72,
  engine_technician: 68,
  electrical_technician: 61,
  customer: 20,
};

// Mock certifications — will be fetched from API in production
const MOCK_CERTIFICATIONS: Record<string, { name: string; issuer: string; date: string; expires: string; status: 'active' | 'expiring' | 'expired' }[]> = {
  engine_technician: [
    { name: 'Cummins ISX15 Certified Technician', issuer: 'Cummins Inc.', date: '2023-03-15', expires: '2025-03-15', status: 'active' },
    { name: 'Diesel Engine Overhaul Level II', issuer: 'ASE', date: '2022-08-20', expires: '2024-08-20', status: 'expiring' },
    { name: 'EPA 608 Certification', issuer: 'EPA', date: '2021-01-10', expires: '—', status: 'active' },
    { name: 'Heavy-Duty Engine Diagnostics', issuer: 'Cummins Training Center', date: '2023-11-05', expires: '2025-11-05', status: 'active' },
    { name: 'Fuel System Specialist', issuer: 'Bosch Automotive', date: '2022-06-18', expires: '2024-06-18', status: 'expired' },
  ],
  electrical_technician: [
    { name: 'Electrical Systems Diagnostics Level III', issuer: 'ASE', date: '2023-05-12', expires: '2025-05-12', status: 'active' },
    { name: 'High Voltage Safety Certification', issuer: 'NFPA', date: '2023-01-20', expires: '2025-01-20', status: 'active' },
    { name: 'PLC Programming Fundamentals', issuer: 'Siemens', date: '2022-09-30', expires: '2024-09-30', status: 'expiring' },
    { name: 'Generator Control Panel Specialist', issuer: 'Cummins Inc.', date: '2023-07-14', expires: '2025-07-14', status: 'active' },
  ],
  admin: [
    { name: 'Project Management Professional', issuer: 'PMI', date: '2022-02-10', expires: '2025-02-10', status: 'active' },
    { name: 'ITIL Foundation', issuer: 'Axelos', date: '2021-11-05', expires: '—', status: 'active' },
  ],
  office_staff: [
    { name: 'Customer Service Excellence', issuer: 'Internal', date: '2023-04-01', expires: '2025-04-01', status: 'active' },
  ],
  customer: [],
};

const CERT_STATUS_CLASS: Record<string, string> = {
  active: 'text-green-400 bg-green-400/10 border-green-400/20',
  expiring: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  expired: 'text-muted-foreground bg-muted/50 border-border',
};

const STATUS_ICON: Record<string, React.FC<{ className?: string }>> = {
  open: AlertCircle, assigned: Clock, in_progress: Clock,
  awaiting_parts: Clock, awaiting_approval: Clock, completed: CheckCircle2,
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
      const matchPriority = priorityFilter === 'all' || t.priority === Number(priorityFilter);
      return matchSearch && matchStatus && matchPriority;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  if (!user) return null;

  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG['customer'];
  const RoleIcon = cfg.icon;
  const expScore = EXP_MAP[user.role] ?? 0;
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();
  const specialization = SPECIALIZATION_MAP[user.role] ?? '—';
  const expertise = EXPERTISE_MAP[user.role] ?? '—';
  const certifications = MOCK_CERTIFICATIONS[user.role] ?? [];

  const completedCount = tickets.filter(t => t.status === 'completed').length;
  const openCount = tickets.filter(t => t.status !== 'completed').length;

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-xl font-semibold">My Profile</h1>
        <p className="text-muted-foreground text-sm">Account details, certifications, and ticket history</p>
      </div>

      {/* Top row: Identity + Experience */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
        {/* Identity card */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="flex flex-col items-center justify-center gap-3 p-6 bg-muted/30 border-b sm:border-b-0 sm:border-r border-border sm:min-w-[170px]">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent((user.first_name ?? '') + ' ' + (user.last_name ?? ''))}&background=1a1f2e&color=e61409&size=96`}
                  alt={`${user.first_name} ${user.last_name}`}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/30"
                />
                <div className="text-center">
                  <p className="font-semibold text-sm">{user.first_name} {user.last_name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">ID #{user.id ?? '—'}</p>
                </div>
                <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="flex-1 p-5">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Mail className="h-3.5 w-3.5 text-primary" /></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase">Email</p><p className="text-sm">{user.email}</p></div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Phone className="h-3.5 w-3.5 text-primary" /></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase">Phone</p><p className="text-sm">+234 801 234 5678</p></div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><MapPin className="h-3.5 w-3.5 text-primary" /></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase">Station</p><p className="text-sm">Lagos HQ</p></div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Wrench className="h-3.5 w-3.5 text-primary" /></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase">Specialization</p><p className="text-sm">{specialization}</p></div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Star className="h-3.5 w-3.5 text-primary" /></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase">Expertise</p><p className="text-sm">{expertise}</p></div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><RoleIcon className="h-3.5 w-3.5 text-primary" /></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase">Role</p><p className="text-sm">{cfg.description}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Experience + Stats — compact side column */}
        <div className="flex flex-col gap-3">
          <Card className="bg-card border-border flex-1">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Experience
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-primary leading-none">{expScore}</span>
                <span className="text-xs text-muted-foreground pb-0.5">/ 100</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${expScore}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {expScore >= 80 ? 'Expert' : expScore >= 60 ? 'Proficient' : expScore >= 40 ? 'Intermediate' : 'Beginner'}
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-border rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-primary">{completedCount}</p>
              <p className="text-[9px] text-muted-foreground">Completed</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-primary">{openCount}</p>
              <p className="text-[9px] text-muted-foreground">Open</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-primary">{certifications.filter(c => c.status === 'active').length}</p>
              <p className="text-[9px] text-muted-foreground">Certs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Tickets / Certifications */}
      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="bg-muted/30 border border-border">
          <TabsTrigger value="tickets" className="text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Settings className="h-3.5 w-3.5" />
            Tickets
            <Badge variant="outline" className="text-[10px] ml-1 h-4 px-1.5">{filtered.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="certifications" className="text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Award className="h-3.5 w-3.5" />
            Certifications
            <Badge variant="outline" className="text-[10px] ml-1 h-4 px-1.5">{certifications.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-muted/30"
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
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.customer} · {t.specialization}</p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${PRIORITY_CLASS[t.priority] ?? PRIORITY_CLASS['low'] ?? ''}`}>
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
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              {certifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No certifications on record</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {certifications.map((cert, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-muted/20 border border-border">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Award className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{cert.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{cert.issuer}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 capitalize ${CERT_STATUS_CLASS[cert.status] ?? ''}`}>
                            {cert.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                          <span>Issued: {new Date(cert.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          <span>Expires: {cert.expires === '—' ? 'Never' : new Date(cert.expires).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
