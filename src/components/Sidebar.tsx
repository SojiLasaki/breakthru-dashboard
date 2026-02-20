import { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/context/AuthContext';
import { useAiTutor } from '@/context/AiTutorContext';
import {
  Ticket, Users, Package, ShoppingCart, BookOpen, X, Bot,
  User, Layers, Wrench, FileText, ChevronDown, ChevronRight,
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
  children?: NavItem[];
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operations',
    items: [
      { to: '/customers',   label: 'Customers',    icon: User,         roles: ['admin', 'office_staff'] },
      { to: '/tickets',     label: 'Tickets',      icon: Ticket,       roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician', 'customer'] },
      { to: '/orders',      label: 'Orders',       icon: ShoppingCart, roles: ['admin', 'office_staff'] },
      { to: '/technicians', label: 'Technicians',  icon: Users,        roles: ['admin', 'office_staff'] },
    ],
  },
  {
    label: 'Inventory & Parts',
    items: [
      { to: '/inventory',   label: 'Inventory',    icon: Package,      roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
      { to: '/components',  label: 'Components',   icon: Layers,       roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
      { to: '/parts',       label: 'Parts',        icon: Wrench,       roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
    ],
  },
  {
    label: 'Resources',
    items: [
      { to: '/manuals',     label: 'Manuals',      icon: BookOpen,     roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician', 'customer'] },
      { to: '/ai-agents',   label: 'AI Agents',    icon: Bot,          roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
      { to: '/logs',        label: 'Logs',         icon: FileText,     roles: ['admin', 'office_staff'] },
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

  const role = user?.role ?? 'customer';
  const showAiTutor = role !== 'customer';

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
            <span className="font-bold text-sm text-sidebar-foreground tracking-tight">Breakthru</span>
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
