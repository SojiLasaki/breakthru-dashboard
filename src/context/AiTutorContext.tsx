import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AiStep {
  step: number;
  title: string;
  description: string;
  relatedTickets?: number[];
  relatedParts?: string[];
  relatedTechnicians?: string[];
}

export interface AiSession {
  ticketId?: number;
  task?: string;
  steps: AiStep[];
  currentStep: number;
}

interface AiTutorContextType {
  session: AiSession | null;
  isOpen: boolean;
  loading: boolean;
  openTutor: (ticketId?: number, task?: string) => Promise<void>;
  closeTutor: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const AiTutorContext = createContext<AiTutorContextType | null>(null);

const CACHE_KEY = 'cummins_ai_tutor_session';

export const AiTutorProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AiSession | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveSession = useCallback((s: AiSession | null) => {
    setSession(s);
    if (s) localStorage.setItem(CACHE_KEY, JSON.stringify(s));
    else localStorage.removeItem(CACHE_KEY);
  }, []);

  const openTutor = useCallback(async (ticketId?: number, task?: string) => {
    setIsOpen(true);
    // If we already have a cached session for this ticket, restore it
    if (session?.ticketId === ticketId && session?.steps.length > 0) return;

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const token = JSON.parse(localStorage.getItem('cummins_user') || '{}')?.token;
      const res = await fetch(`${apiUrl}/ai_service/?ticket_id=${ticketId || ''}&task=${encodeURIComponent(task || '')}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        saveSession({ ticketId, task, steps: data.steps || [], currentStep: 0 });
      } else {
        throw new Error('API unavailable');
      }
    } catch {
      // Fallback mock steps
      const mockSteps: AiStep[] = [
        { step: 1, title: 'Diagnose Issue', description: 'Review ticket details and run initial diagnostics. Check error codes and recent maintenance logs.', relatedParts: ['Diagnostic Scanner', 'OBD Module'] },
        { step: 2, title: 'Gather Parts', description: 'Identify and collect required parts from inventory. Verify quantities match the maintenance specification.', relatedParts: ['Fuel Injector', 'O-Ring Kit', 'Filter Set'] },
        { step: 3, title: 'Assign Technician', description: 'Assign a qualified engine technician based on availability and specialization.', relatedTechnicians: ['John Smith', 'Maria Garcia'] },
        { step: 4, title: 'Perform Maintenance', description: 'Follow the manufacturer procedure. Document all steps taken and parts replaced.', relatedTickets: ticketId ? [ticketId] : [] },
        { step: 5, title: 'Test & Verify', description: 'Run post-maintenance tests. Confirm all fault codes are cleared and system operates within spec.', relatedParts: ['Test Harness'] },
      ];
      saveSession({ ticketId, task, steps: mockSteps, currentStep: 0 });
    } finally {
      setLoading(false);
    }
  }, [session, saveSession]);

  const closeTutor = useCallback(() => setIsOpen(false), []);

  const nextStep = useCallback(() => {
    if (!session) return;
    const updated = { ...session, currentStep: Math.min(session.currentStep + 1, session.steps.length - 1) };
    saveSession(updated);
  }, [session, saveSession]);

  const prevStep = useCallback(() => {
    if (!session) return;
    const updated = { ...session, currentStep: Math.max(session.currentStep - 1, 0) };
    saveSession(updated);
  }, [session, saveSession]);

  return (
    <AiTutorContext.Provider value={{ session, isOpen, loading, openTutor, closeTutor, nextStep, prevStep }}>
      {children}
    </AiTutorContext.Provider>
  );
};

export const useAiTutor = () => {
  const ctx = useContext(AiTutorContext);
  if (!ctx) throw new Error('useAiTutor must be used within AiTutorProvider');
  return ctx;
};
