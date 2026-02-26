import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Wrench, Zap, Settings, Users, BookOpen, Bot } from 'lucide-react';

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

const STAT_MOCK: Record<string, { label: string; value: string }[]> = {
  admin:                 [{ label: 'Total Users', value: '24' }, { label: 'Open Tickets', value: '12' }, { label: 'Active Orders', value: '8' }, { label: 'Alerts Today', value: '3' }],
  office_staff:          [{ label: 'Tickets Managed', value: '47' }, { label: 'Orders Processed', value: '18' }, { label: 'Customers', value: '132' }, { label: 'Pending Approvals', value: '5' }],
  engine_technician:     [{ label: 'Tasks Completed', value: '34' }, { label: 'Active Tickets', value: '2' }, { label: 'Hours Logged', value: '162h' }, { label: 'Avg Resolution', value: '3.2h' }],
  electrical_technician: [{ label: 'Tasks Completed', value: '29' }, { label: 'Active Tickets', value: '1' }, { label: 'Hours Logged', value: '148h' }, { label: 'Avg Resolution', value: '2.8h' }],
  customer:              [{ label: 'Tickets Submitted', value: '6' }, { label: 'Open Tickets', value: '2' }, { label: 'Resolved', value: '4' }, { label: 'Member Since', value: '2024' }],
};

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const cfg   = ROLE_CONFIG[user.role] ?? ROLE_CONFIG['customer'];
  const RoleIcon = cfg.icon;
  const access = ACCESS_MAP[user.role] ?? [];
  const stats  = STAT_MOCK[user.role] ?? [];

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-xl font-semibold">My Profile</h1>
        <p className="text-muted-foreground text-sm">Your account details and permissions</p>
      </div>

      {/* Identity card */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Avatar panel */}
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

            {/* Details */}
            <div className="flex-1 p-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Contact</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-primary/60" />
                    <span>{user.email}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Role</p>
                <div className="flex items-start gap-2">
                  <RoleIcon className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{cfg.description}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Access / Permissions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Access & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {access.map(item => (
              <Badge key={item} variant="outline" className="text-xs border-border text-muted-foreground">
                {item}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick links based on role */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
