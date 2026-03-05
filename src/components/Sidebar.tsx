import { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/context/AuthContext';
import { getDisplayFullName, getDisplayEmail } from '@/lib/displayUser';
import {
  LayoutDashboard, Ticket, Users, BookOpen, X, Bot,
  User, Wrench, FileText, ChevronDown, ChevronRight,
  Activity, Cpu, Sparkles, ShoppingCart, ArrowLeftRight,
  Settings, HeadphonesIcon, Package, CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type NavItem = {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

// ── Role-specific nav configs ──────────────────────────────────────────────

const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/',         label: 'Dashboard',    icon: LayoutDashboard },
      { to: '/analytics', label: 'Analytics',   icon: Activity },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/customers',    label: 'Customers',    icon: User },
      { to: '/technicians',  label: 'Technicians',  icon: Users },
      { to: '/staff',        label: 'Staff',        icon: Users },
      { to: '/orders',       label: 'Orders',       icon: ShoppingCart },
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { to: '/schedules',    label: 'Schedules',    icon: CalendarDays },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/components', label: 'Components', icon: Package },
      { to: '/parts',      label: 'Parts',      icon: Wrench },
    ],
  },
  {
    label: 'Resources',
    items: [
      { to: '/manuals',   label: 'Manuals',    icon: BookOpen },
      { to: '/ai-agents', label: 'Agent Studio', icon: Bot },
      { to: '/logs',      label: 'Logs',       icon: FileText },
    ],
  },
];

const STAFF_NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/',         label: 'Dashboard',    icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/tickets',      label: 'Tickets',      icon: Ticket },
      { to: '/customers',    label: 'Customers',    icon: User },
      { to: '/technicians',  label: 'Technicians',  icon: Users },
      { to: '/staff',        label: 'Staff',        icon: Users },
      { to: '/orders',       label: 'Orders',       icon: ShoppingCart },
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { to: '/schedules',    label: 'Schedules',    icon: CalendarDays },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/components', label: 'Components', icon: Package },
      { to: '/parts',      label: 'Parts',      icon: Wrench },
    ],
  },
  {
    label: 'Resources',
    items: [
      { to: '/manuals',   label: 'Manuals',    icon: BookOpen },
      { to: '/ai-agents', label: 'Agent Studio',  icon: Bot },
      { to: '/logs',      label: 'Logs',       icon: FileText },
    ],
  },
];

const TECHNICIAN_NAV: NavGroup[] = [
  {
    label: 'My Work',
    items: [
      { to: '/',          label: 'Dashboard',    icon: LayoutDashboard },
      { to: '/tickets',   label: 'My Tickets',   icon: Ticket },
      { to: '/schedules', label: 'My Schedules', icon: CalendarDays },
    ],
  },
  {
    label: 'Resources',
    items: [
      { to: '/manuals', label: 'Manuals',   icon: BookOpen },
      { to: '/ask-ai',  label: 'Fix-it Felix', icon: Sparkles },
    ],
  },
];

const CUSTOMER_NAV: NavGroup[] = [
  {
    label: 'My Account',
    items: [
      { to: '/',        label: 'Dashboard',  icon: LayoutDashboard },
      { to: '/assets',  label: 'My Assets',  icon: Cpu },
      { to: '/tickets', label: 'My Tickets', icon: Ticket },
    ],
  },
  {
    label: 'Help',
    items: [
      { to: '/manuals', label: 'Support', icon: HeadphonesIcon },
    ],
  },
];

function getNavGroups(role: string): NavGroup[] {
  if (role === 'admin') return ADMIN_NAV;
  if (role === 'office') return STAFF_NAV;
  if (role === 'technician' || role === 'tech') return TECHNICIAN_NAV;
  return CUSTOMER_NAV;
}

// ── SidebarGroup ───────────────────────────────────────────────────────────

function SidebarNavGroup({ group, onClose }: { group: NavGroup; onClose: () => void }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-1">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 group"
      >
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold group-hover:text-foreground transition-colors">
          {group.label}
        </span>
        {collapsed
          ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
          : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="space-y-0.5 px-1">
          {group.items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-150"
              activeClassName="bg-primary/15 text-primary font-semibold border-l-2 border-primary pl-[10px]"
            >
              <Icon className="h-4 w-4 flex-shrink-0 opacity-70" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();

  const role = user?.role ?? 'customer';
  const navGroups = getNavGroups(role);

  const roleLabel: Record<string, string> = {
    admin: 'Administrator',
    office: 'Office Staff',
    technician: 'Technician',
    customer: 'Customer',
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full w-56 bg-sidebar border-r border-sidebar-border z-50 flex flex-col transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-primary-foreground font-bold text-base italic tracking-tighter leading-none">b</span>
            </div>
            <span className="font-bold text-sm text-sidebar-foreground tracking-tight">breakthru</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden h-7 w-7 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Role chip */}
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <span className="text-[10px] font-medium text-primary/90 tracking-wide">{roleLabel[role]}</span>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 p-2 overflow-y-auto space-y-1 mt-1">
          {navGroups.map(group => (
            <SidebarNavGroup key={group.label} group={group} onClose={onClose} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-3 flex-shrink-0 space-y-2 border-t border-sidebar-border pt-3">
          {/* Profile link */}
          <NavLink
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-150"
            activeClassName="bg-primary/15 text-primary font-semibold"
          >
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary">
                {(user && (getDisplayFullName(user)[0] || user.username?.[0] || '')).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {user ? getDisplayFullName(user) : 'User'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{getDisplayEmail(user) !== '—' ? getDisplayEmail(user) : '(no email)'}</p>
            </div>
          </NavLink>

          {/* Settings — all roles */}
          <NavLink
            to="/settings"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-150"
            activeClassName="bg-primary/15 text-primary font-semibold"
          >
            <Settings className="h-4 w-4 flex-shrink-0 opacity-70" />
            <span>Settings</span>
          </NavLink>

        </div>
      </aside>
    </>
  );
}
