import { useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/context/AuthContext';
import { useAiTutor } from '@/context/AiTutorContext';
import { transactionApi, Transaction } from '@/services/transactionApi';
import {
  Ticket, Users, Package, ShoppingCart, BookOpen, X, Bot,
  User, Layers, Wrench, FileText, ChevronDown, ChevronRight,
  Activity, Cpu, ArrowLeftRight, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  roles: string[];
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operations',
    items: [
      { to: '/customers',    label: 'Customers',    icon: User,           roles: ['admin', 'office_staff'] },
      { to: '/tickets',      label: 'Tickets',      icon: Ticket,         roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician', 'customer'] },
      { to: '/orders',       label: 'Orders',       icon: ShoppingCart,   roles: ['admin', 'office_staff'] },
      { to: '/technicians',  label: 'Technicians',  icon: Users,          roles: ['admin', 'office_staff'] },
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, roles: ['admin', 'office_staff'] },
    ],
  },
  {
    label: 'Equipment',
    items: [
      { to: '/assets',      label: 'Assets',      icon: Cpu,      roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
      { to: '/diagnostics', label: 'Diagnostics', icon: Activity, roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
    ],
  },
  {
    label: 'Inventory & Parts',
    items: [
      { to: '/inventory',  label: 'Inventory',  icon: Package, roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
      { to: '/components', label: 'Components', icon: Layers,  roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
      { to: '/parts',      label: 'Parts',      icon: Wrench,  roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
    ],
  },
  {
    label: 'Resources',
    items: [
      { to: '/manuals',   label: 'Manuals',    icon: BookOpen,  roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician', 'customer'] },
      { to: '/ai-agents', label: 'AI Agents',  icon: Bot,       roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
      { to: '/logs',      label: 'Logs',       icon: FileText,  roles: ['admin', 'office_staff'] },
    ],
  },
];

function SidebarGroup({ label, items, role, onClose }: { label: string; items: NavItem[]; role: string; onClose: () => void }) {
  const visible = items.filter(i => i.roles.includes(role));
  const [collapsed, setCollapsed] = useState(false);

  if (visible.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 group"
      >
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium group-hover:text-foreground transition-colors">
          {label}
        </span>
        {collapsed
          ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
          : <ChevronDown className="h-3 w-3 text-muted-foreground" />
        }
      </button>

      {!collapsed && (
        <div className="space-y-0.5 px-1">
          {visible.map(({ to, label: itemLabel, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              activeClassName="bg-primary/15 text-primary font-medium"
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {itemLabel}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const { openTutor, isOpen, closeTutor } = useAiTutor();
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);

  const role = user?.role ?? 'customer';
  const showAiTutor = role !== 'customer';
  const isAdminOrStaff = role === 'admin' || role === 'office_staff';

  useEffect(() => {
    if (isAdminOrStaff) {
      transactionApi.getRecent(4).then(setRecentTx).catch(() => setRecentTx([]));
    }
  }, [isAdminOrStaff]);

  const txStatusIcon = (status: Transaction['status']) => {
    if (status === 'approved' || status === 'fulfilled') return <CheckCircle2 className="h-3 w-3 text-green-400 flex-shrink-0" />;
    if (status === 'rejected') return <XCircle className="h-3 w-3 text-primary flex-shrink-0" />;
    return <Clock className="h-3 w-3 text-yellow-400 flex-shrink-0" />;
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full w-56 bg-sidebar border-r border-sidebar-border z-50 flex flex-col transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-base italic tracking-tighter">b</span>
            </div>
            <span className="font-bold text-sm text-sidebar-foreground tracking-tight">breakthru</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 p-2 overflow-y-auto space-y-1 mt-1">
          {NAV_GROUPS.map(group => (
            <SidebarGroup
              key={group.label}
              label={group.label}
              items={group.items}
              role={role}
              onClose={onClose}
            />
          ))}
        </nav>

        {/* Recent Transactions mini-panel */}
        {isAdminOrStaff && recentTx.length > 0 && (
          <div className="mx-3 mb-2 border border-sidebar-border rounded-lg overflow-hidden flex-shrink-0">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-sidebar-border">
              <div className="flex items-center gap-1.5">
                <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recent Transactions</span>
              </div>
              {recentTx.some(t => t.status === 'pending') && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                  {recentTx.filter(t => t.status === 'pending').length} pending
                </span>
              )}
            </div>
            <div className="divide-y divide-sidebar-border">
              {recentTx.map(tx => (
                <NavLink
                  key={tx.id}
                  to="/transactions"
                  onClick={onClose}
                  className="flex items-start gap-2 px-3 py-2 hover:bg-sidebar-accent transition-colors"
                  activeClassName=""
                >
                  {txStatusIcon(tx.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate leading-tight">{tx.part_name}</p>
                    <p className="text-[9px] text-muted-foreground truncate">
                      <span className="text-primary">{tx.ai_agent}</span>
                      {tx.approved_by ? ` · ${tx.approved_by}` : ' · awaiting'}
                    </p>
                  </div>
                  <span className="text-[9px] text-muted-foreground flex-shrink-0">${tx.total_price.toFixed(0)}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[10px] text-muted-foreground capitalize">{role.replace(/_/g, ' ')}</span>
          </div>
          {showAiTutor && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => isOpen ? closeTutor() : openTutor()}
            >
              <Bot className="h-4 w-4" />
              {isOpen ? 'Close AI Tutor' : 'Open AI Tutor'}
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
