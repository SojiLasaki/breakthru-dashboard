import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context';
import type { FelixChatProposal } from '@/services/felixChatService';

export interface FelixChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  proposals?: FelixChatProposal[];
}

export interface FelixHistoryEntry {
  id: string;
  title: string;
  createdAt: string;
  messages: FelixChatMessage[];
}

const HISTORY_KEY = (userId: string | number) => `felix_history_${userId}`;
const SHARED_PREFIX = 'felix_shared_';

function loadHistoryFromStorage(userId: string | number): FelixHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(String(userId)));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryToStorage(userId: string | number, entries: FelixHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY(String(userId)), JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

interface FelixChatContextType {
  messages: FelixChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<FelixChatMessage[]>>;
  history: FelixHistoryEntry[];
  addToHistory: (messages: FelixChatMessage[]) => void;
  loadFromHistory: (id: string) => void;
  removeFromHistory: (id: string) => void;
  shareConversation: () => string | null;
  loadSharedConversation: (shareId: string) => FelixChatMessage[] | null;
}

const FelixChatContext = createContext<FelixChatContextType | null>(null);

export function FelixChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FelixChatMessage[]>([]);
  const [history, setHistory] = useState<FelixHistoryEntry[]>([]);
  const prevUserId = useRef<string | number | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setMessages([]);
      setHistory([]);
      prevUserId.current = null;
      return;
    }
    if (prevUserId.current !== user.id) {
      prevUserId.current = user.id;
      setHistory(loadHistoryFromStorage(user.id));
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && history.length > 0) {
      saveHistoryToStorage(user.id, history);
    }
  }, [user?.id, history]);

  const addToHistory = useCallback((msgs: FelixChatMessage[]) => {
    if (msgs.length === 0) return;
    const firstUser = msgs.find(m => m.role === 'user');
    const title = firstUser?.content?.slice(0, 50)?.trim() || `Chat ${new Date().toLocaleString()}`;
    setHistory(prev => [
      {
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: title.length > 50 ? title + '…' : title,
        createdAt: new Date().toISOString(),
        messages: msgs,
      },
      ...prev.slice(0, 99),
    ]);
  }, []);

  const loadFromHistory = useCallback((id: string) => {
    const entry = history.find(e => e.id === id);
    if (entry) setMessages(entry.messages);
  }, [history]);

  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(e => e.id !== id));
  }, []);

  const shareConversation = useCallback((): string | null => {
    if (messages.length === 0) return null;
    const shareId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    try {
      localStorage.setItem(SHARED_PREFIX + shareId, JSON.stringify(messages));
      const base = window.location.origin + (window.location.pathname.replace(/\/$/, '') || '');
      const url = `${base}/ask-ai?shared=${shareId}`;
      return url;
    } catch {
      return null;
    }
  }, [messages]);

  const loadSharedConversation = useCallback((shareId: string): FelixChatMessage[] | null => {
    try {
      const raw = localStorage.getItem(SHARED_PREFIX + shareId);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, []);

  const value: FelixChatContextType = {
    messages,
    setMessages,
    history,
    addToHistory,
    loadFromHistory,
    removeFromHistory,
    shareConversation,
    loadSharedConversation,
  };

  return (
    <FelixChatContext.Provider value={value}>
      {children}
    </FelixChatContext.Provider>
  );
}

export function useFelixChatContext() {
  const ctx = useContext(FelixChatContext);
  if (!ctx) throw new Error('useFelixChatContext must be used within FelixChatProvider');
  return ctx;
}
