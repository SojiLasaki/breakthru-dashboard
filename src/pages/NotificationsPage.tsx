import { useNotifications } from '@/context/NotificationContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Ticket, Package, Bot, Settings } from 'lucide-react';

const icons = {
  ticket: Ticket,
  order: Package,
  ai: Bot,
  system: Settings,
} as const;

export default function NotificationsPage() {
  const { notifications, markAllRead, clearAll, markRead } = useNotifications();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Notifications</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={notifications.length === 0}
          >
            Mark all read
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={clearAll}
            disabled={notifications.length === 0}
          >
            Clear all
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground text-sm">
              You have no notifications.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = icons[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`w-full flex gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        !n.read ? 'bg-primary/20' : 'bg-muted'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          !n.read ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-medium ${
                            !n.read ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

