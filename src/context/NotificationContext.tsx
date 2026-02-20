import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface Notification {
  id: string;
  type: 'ticket' | 'order' | 'ai' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'ticket', title: 'New Ticket Assigned', message: 'Ticket #TK-042 has been assigned to you.', timestamp: new Date(Date.now() - 300000), read: false },
  { id: '2', type: 'order', title: 'Order Approved', message: 'Order #ORD-019 for fuel injectors has been approved.', timestamp: new Date(Date.now() - 900000), read: false },
  { id: '3', type: 'ai', title: 'AI Recommendation', message: 'Predictive maintenance alert for Engine Unit #7.', timestamp: new Date(Date.now() - 1800000), read: false },
];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [{
      ...n,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    }, ...prev]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Simulate polling for new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // In production this would poll /api/notifications/ or use WebSocket
    }, 30000);
    return () => clearInterval(interval);
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
