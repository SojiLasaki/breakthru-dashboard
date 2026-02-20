import { useNotifications } from '@/context/NotificationContext';
import { Bell, X, Check, Ticket, Package, Bot, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

const icons = {
  ticket: Ticket,
  order: Package,
  ai: Bot,
  system: Settings,
};

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const { notifications, markAllRead, markRead } = useNotifications();

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-4 top-16 z-50 w-80 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notifications</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7 px-2 text-muted-foreground">
              Mark all read
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No notifications</div>
          ) : (
            notifications.map(n => {
              const Icon = icons[n.type];
              return (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex gap-3 p-3 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${!n.read ? 'bg-primary/20' : 'bg-muted'}`}>
                    <Icon className={`h-3.5 w-3.5 ${!n.read ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-xs font-medium ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(n.timestamp, { addSuffix: true })}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
