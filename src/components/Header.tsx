import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAiTutor } from '@/context/AiTutorContext';
import { useTheme } from '@/context/ThemeContext';
import { Bell, Bot, Menu, LogOut, User, ChevronDown, Sparkles, Wifi, WifiOff, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationPanel from './NotificationPanel';

interface HeaderProps {
  onMenuClick: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  office_staff: 'Office Staff',
  engine_technician: 'Engine Technician',
  electrical_technician: 'Electrical Technician',
  customer: 'Customer',
};

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { openTutor, isOpen, closeTutor } = useAiTutor();
  const { theme, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const canUseAiTutor = user && ['admin', 'office_staff', 'engine_technician', 'electrical_technician'].includes(user.role);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-base italic tracking-tighter">b</span>
            </div>
            <span className="font-bold text-sm hidden sm:block text-foreground tracking-tight">breakthru</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUseAiTutor && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => isOpen ? closeTutor() : openTutor()}
            className="gap-2 text-muted-foreground hover:text-foreground hidden sm:flex"
          >
            <Bot className="h-4 w-4" />
            <span className="text-xs">AI Tutor</span>
          </Button>
          )}

          {/* Felix AI button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/ask-ai')}
            className="gap-2 text-muted-foreground hover:text-primary hidden sm:flex relative"
            title="Ask Fix it Felix"
          >
            <div className="relative">
              <Sparkles className="h-4 w-4" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,55%)]" />
            </div>
            <span className="text-xs">Fix it Felix</span>
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <div
            title={isOnline ? 'Online' : 'Offline'}
            className="flex items-center gap-1 px-2 py-1 rounded-md"
          >
            {isOnline
              ? <Wifi className="h-4 w-4 text-[hsl(var(--success))]" />
              : <WifiOff className="h-4 w-4 text-muted-foreground" />
            }
            <span className={`text-[10px] font-medium hidden sm:block ${isOnline ? 'text-[hsl(var(--success))]' : 'text-muted-foreground'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotifOpen(v => !v)}
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary border-0">
                {unreadCount}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-xs font-medium">{user?.first_name} {user?.last_name}</span>
                  <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[user?.role || '']}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                {user?.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/profile'} className="gap-2 text-sm">
                <User className="h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
    </>
  );
}
