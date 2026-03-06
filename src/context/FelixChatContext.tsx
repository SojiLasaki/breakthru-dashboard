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

export interface FelixChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: FelixChatMessage[];
}

export interface FelixHistoryEntry {
  id: string;
  title: string;
  createdAt: string;
  messages: FelixChatMessage[];
}

const HISTORY_KEY = (userId: string | number) => `felix_history_${userId}`;
const SESSIONS_KEY = (userId: string | number) => `felix_sessions_${userId}`;
const ACTIVE_SESSION_KEY = (userId: string | number) => `felix_active_session_${userId}`;
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

function loadSessionsFromStorage(userId: string | number): FelixChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY(String(userId)));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessionsToStorage(userId: string | number, sessions: FelixChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY(String(userId)), JSON.stringify(sessions));
  } catch {
    /* ignore */
  }
}

function loadActiveSessionIdFromStorage(userId: string | number): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY(String(userId)));
  } catch {
    return null;
  }
}

function saveActiveSessionIdToStorage(userId: string | number, sessionId: string | null) {
  try {
    if (sessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY(String(userId)), sessionId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY(String(userId)));
    }
  } catch {
    /* ignore */
  }
}

function generateSessionTitle(messages: FelixChatMessage[]): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (firstUser?.content) {
    const text = firstUser.content.slice(0, 50).trim();
    return text.length >= 50 ? text + '...' : text;
  }
  return `Chat ${new Date().toLocaleString()}`;
}

function createNewSession(): FelixChatSession {
  const now = new Date().toISOString();
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: 'New Chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
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
  // Session management
  sessions: FelixChatSession[];
  activeSessionId: string | null;
  createSession: () => FelixChatSession;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, title: string) => void;
  startNewChat: () => void;
}

const FelixChatContext = createContext<FelixChatContextType | null>(null);

export function FelixChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FelixChatMessage[]>([]);
  const [history, setHistory] = useState<FelixHistoryEntry[]>([]);
  const [sessions, setSessions] = useState<FelixChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const prevUserId = useRef<string | number | null>(null);
  const isInitialized = useRef(false);

  // Load sessions and history when user changes
  useEffect(() => {
    if (!user?.id) {
      setMessages([]);
      setHistory([]);
      setSessions([]);
      setActiveSessionId(null);
      prevUserId.current = null;
      isInitialized.current = false;
      return;
    }
    if (prevUserId.current !== user.id) {
      prevUserId.current = user.id;
      setHistory(loadHistoryFromStorage(user.id));
      const loadedSessions = loadSessionsFromStorage(user.id);
      setSessions(loadedSessions);

      // Restore active session or create new one
      const savedActiveId = loadActiveSessionIdFromStorage(user.id);
      if (savedActiveId && loadedSessions.find(s => s.id === savedActiveId)) {
        const session = loadedSessions.find(s => s.id === savedActiveId);
        if (session) {
          setActiveSessionId(savedActiveId);
          setMessages(session.messages);
        }
      } else if (loadedSessions.length > 0) {
        // Load the most recent session
        const mostRecent = loadedSessions[0];
        setActiveSessionId(mostRecent.id);
        setMessages(mostRecent.messages);
      }
      isInitialized.current = true;
    }
  }, [user?.id]);

  // Persist history
  useEffect(() => {
    if (user?.id && history.length > 0) {
      saveHistoryToStorage(user.id, history);
    }
  }, [user?.id, history]);

  // Persist sessions
  useEffect(() => {
    if (user?.id && isInitialized.current) {
      saveSessionsToStorage(user.id, sessions);
    }
  }, [user?.id, sessions]);

  // Persist active session ID
  useEffect(() => {
    if (user?.id && isInitialized.current) {
      saveActiveSessionIdToStorage(user.id, activeSessionId);
    }
  }, [user?.id, activeSessionId]);

  // Update active session when messages change
  useEffect(() => {
    if (!activeSessionId || !user?.id || !isInitialized.current) return;

    setSessions(prev => {
      const sessionIndex = prev.findIndex(s => s.id === activeSessionId);
      if (sessionIndex === -1) return prev;

      const session = prev[sessionIndex];
      const updatedSession: FelixChatSession = {
        ...session,
        messages,
        updatedAt: new Date().toISOString(),
        title: messages.length > 0 ? generateSessionTitle(messages) : session.title,
      };

      const newSessions = [...prev];
      newSessions[sessionIndex] = updatedSession;
      return newSessions;
    });
  }, [messages, activeSessionId, user?.id]);

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

  // Session management functions
  const createSession = useCallback((): FelixChatSession => {
    const newSession = createNewSession();
    setSessions(prev => [newSession, ...prev].slice(0, 50)); // Keep max 50 sessions
    setActiveSessionId(newSession.id);
    setMessages([]);
    return newSession;
  }, []);

  const switchSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setMessages(session.messages);
    }
  }, [sessions]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);

      // If we deleted the active session, switch to another one
      if (activeSessionId === sessionId) {
        if (filtered.length > 0) {
          const nextSession = filtered[0];
          setActiveSessionId(nextSession.id);
          setMessages(nextSession.messages);
        } else {
          // No sessions left, create a new one
          const newSession = createNewSession();
          setActiveSessionId(newSession.id);
          setMessages([]);
          return [newSession];
        }
      }

      return filtered;
    });
  }, [activeSessionId]);

  const renameSession = useCallback((sessionId: string, title: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, title: title.trim() || 'Untitled Chat', updatedAt: new Date().toISOString() }
        : s
    ));
  }, []);

  const startNewChat = useCallback(() => {
    // Save current messages to the active session before creating new one
    if (activeSessionId && messages.length > 0) {
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages, updatedAt: new Date().toISOString(), title: generateSessionTitle(messages) }
          : s
      ));
    }
    createSession();
  }, [activeSessionId, messages, createSession]);

  const value: FelixChatContextType = {
    messages,
    setMessages,
    history,
    addToHistory,
    loadFromHistory,
    removeFromHistory,
    shareConversation,
    loadSharedConversation,
    // Session management
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    startNewChat,
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
