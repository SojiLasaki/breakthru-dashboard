import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/context/AuthContext';
import {
  Ticket, Users, Package, ShoppingCart, FileText, BookOpen,
  LayoutDashboard, X, Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAiTutor } from '@/context/AiTutorContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/',            label: 'Overview',     icon: LayoutDashboard, roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician', 'customer'] },
  { to: '/tickets',     label: 'Tickets',      icon: Ticket,          roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician', 'customer'] },
  { to: '/technicians', label: 'Technicians',  icon: Users,           roles: ['admin', 'office_staff'] },
  { to: '/inventory',   label: 'Inventory',    icon: Package,         roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician'] },
  { to: '/orders',      label: 'Orders',       icon: ShoppingCart,    roles: ['admin', 'office_staff'] },
  { to: '/logs',        label: 'Logs',         icon: FileText,        roles: ['admin', 'office_staff'] },
  { to: '/manuals',     label: 'Manuals',      icon: BookOpen,        roles: ['admin', 'office_staff', 'engine_technician', 'electrical_technician', 'customer'] },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const { openTutor, isOpen, closeTutor } = useAiTutor();

  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role));
  const showAiTutor = user && ['admin', 'office_staff', 'engine_technician', 'electrical_technician'].includes(user.role);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-56 bg-sidebar border-r border-sidebar-border z-50 flex flex-col transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo / Close */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">C</span>
            </div>
            <span className="font-semibold text-sm text-sidebar-foreground">Cummins</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-2">Navigation</p>
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              activeClassName="bg-primary/15 text-primary font-medium"
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Role badge */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[10px] text-muted-foreground capitalize">
              {user?.role?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* AI Tutor shortcut — hidden from customers */}
        {showAiTutor && (
          <div className="p-3 border-t border-sidebar-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => isOpen ? closeTutor() : openTutor()}
            >
              <Bot className="h-4 w-4" />
              {isOpen ? 'Close AI Tutor' : 'Open AI Tutor'}
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
