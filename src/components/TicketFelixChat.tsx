import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles, Send, Loader2, X, Trash2, MessageSquare,
  ChevronDown, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useFelixChat } from '@/hooks/useFelixChat';
import { useAuth } from '@/context/AuthContext';
import { FelixChatMessage, FelixChatProposal, formatFelixError } from '@/services/felixChatService';
import type { Ticket } from '@/services/ticketApi';
import type { Diagnostic } from '@/services/diagnosticsApi';
import type { RepairStepProgress, RepairStep } from '@/components/RepairChecklist';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  proposals?: FelixChatProposal[];
}

interface TicketThread {
  ticketId: string;
  messages: ThreadMessage[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  ticket: Ticket;
  diagnostic?: Diagnostic | null;
  checklistSteps?: RepairStep[];
  checklistProgress?: RepairStepProgress[];
  onChecklistUpdate?: (updates: Partial<RepairStepProgress>[]) => void;
}

// ─── Storage Keys ────────────────────────────────────────────────────────────

const THREAD_KEY = (ticketId: string, userId: string | number) =>
  `felix_ticket_thread_${ticketId}_${userId}`;

function loadThread(ticketId: string, userId: string | number): TicketThread | null {
  try {
    const raw = localStorage.getItem(THREAD_KEY(ticketId, userId));
    if (!raw) return null;
    return JSON.parse(raw) as TicketThread;
  } catch {
    return null;
  }
}

function saveThread(thread: TicketThread, userId: string | number) {
  try {
    localStorage.setItem(THREAD_KEY(thread.ticketId, userId), JSON.stringify(thread));
  } catch {
    /* ignore */
  }
}

function clearThread(ticketId: string, userId: string | number) {
  try {
    localStorage.removeItem(THREAD_KEY(ticketId, userId));
  } catch {
    /* ignore */
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TicketFelixChat({
  open,
  onClose,
  ticket,
  diagnostic,
  checklistSteps = [],
  checklistProgress = [],
  onChecklistUpdate,
}: Props) {
  const { user } = useAuth();
  const { isStreaming, sendStream } = useFelixChat();

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [initialized, setInitialized] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ─── Load thread from localStorage on mount ────────────────────────────────
  useEffect(() => {
    if (!ticket?.id || !user?.id) return;
    const stored = loadThread(ticket.id, user.id);
    if (stored) {
      setMessages(stored.messages);
    } else {
      setMessages([]);
    }
    setInitialized(true);
  }, [ticket?.id, user?.id]);

  // ─── Persist thread changes ────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized || !ticket?.id || !user?.id) return;
    const now = new Date().toISOString();
    const thread: TicketThread = {
      ticketId: ticket.id,
      messages,
      createdAt: messages[0]?.timestamp || now,
      updatedAt: now,
    };
    saveThread(thread, user.id);
  }, [messages, ticket?.id, user?.id, initialized]);

  // ─── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Focus input when panel opens ──────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // ─── Build context block ───────────────────────────────────────────────────
  const buildContextBlock = useCallback(() => {
    const parts: string[] = [];

    // Ticket info
    parts.push(`[Ticket Context]`);
    parts.push(`Ticket ID: ${ticket.ticket_id}`);
    parts.push(`Title: ${ticket.title}`);
    parts.push(`Status: ${ticket.status}`);
    parts.push(`Specialization: ${ticket.specialization || 'N/A'}`);
    parts.push(`Priority: ${ticket.priority}, Severity: ${ticket.severity}`);
    if (ticket.issue_description) {
      parts.push(`Issue: ${ticket.issue_description}`);
    }

    // Diagnostic info
    if (diagnostic) {
      parts.push('');
      parts.push(`[Diagnostic Report]`);
      parts.push(`Fault Code: ${diagnostic.fault_code}`);
      parts.push(`Probable Cause: ${diagnostic.probable_cause}`);
      if (diagnostic.recommended_actions) {
        parts.push(`Recommended Actions: ${diagnostic.recommended_actions}`);
      }
      if (diagnostic.ai_summary) {
        parts.push(`AI Summary: ${diagnostic.ai_summary}`);
      }
    }

    // Checklist state
    if (checklistSteps.length > 0) {
      parts.push('');
      parts.push(`[Repair Checklist - ${checklistSteps.length} steps]`);
      checklistSteps.forEach((step, idx) => {
        const progress = checklistProgress.find(p => p.item_id === step.id);
        const status = progress?.done ? '✓' : '○';
        const flagged = progress?.flagged ? ' [FLAGGED]' : '';
        const note = progress?.note ? ` (Note: ${progress.note})` : '';
        parts.push(`${idx + 1}. ${status} ${step.label}${flagged}${note}`);
      });

      const completed = checklistProgress.filter(p => p.done).length;
      parts.push(`Progress: ${completed}/${checklistSteps.length} completed`);
    }

    parts.push('');
    parts.push(`You can help the technician with questions about this repair, suggest checklist updates, or provide guidance. If the user wants to update checklist items, propose the changes.`);

    return parts.join('\n');
  }, [ticket, diagnostic, checklistSteps, checklistProgress]);

  // ─── Handle proposal actions ───────────────────────────────────────────────
  const handleApproveProposal = useCallback((proposal: FelixChatProposal) => {
    // For checklist updates, parse the proposal and call onChecklistUpdate
    if (proposal.action === 'update_checklist' && onChecklistUpdate) {
      try {
        const updates = typeof proposal.payload === 'string'
          ? JSON.parse(proposal.payload)
          : proposal.payload;
        if (Array.isArray(updates)) {
          onChecklistUpdate(updates);
        }
      } catch {
        console.warn('Failed to parse checklist update proposal');
      }
    }
    // Mark proposal as approved in UI
    setMessages(prev =>
      prev.map(msg => ({
        ...msg,
        proposals: msg.proposals?.map(p =>
          p.id === proposal.id ? { ...p, status: 'approved' } : p
        ),
      }))
    );
  }, [onChecklistUpdate]);

  // ─── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const q = input.trim();
    if (!q || isStreaming) return;

    setInput('');
    const now = new Date().toISOString();
    const userMsg: ThreadMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: now,
    };
    const assistantId = `assistant-${Date.now()}`;

    const history = [...messages, userMsg];
    setMessages([
      ...history,
      { id: assistantId, role: 'assistant', content: '', timestamp: now },
    ]);

    // Build API messages from thread history
    const apiMessages: FelixChatMessage[] = history.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const result = await sendStream(
        {
          messages: apiMessages,
          contextBlock: buildContextBlock(),
          intent: 'ticket_ops',
        },
        {
          onDelta: (_delta, fullText) => {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantId ? { ...msg, content: fullText } : msg
              )
            );
          },
        }
      );

      // Add proposals if any
      if (result?.proposals && result.proposals.length > 0) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantId
              ? { ...msg, proposals: result.proposals }
              : msg
          )
        );
      }
    } catch (error) {
      const errorText = formatFelixError(error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: msg.content || `Sorry, I encountered an error. ${errorText}` }
            : msg
        )
      );
    }
  };

  // ─── Clear thread ──────────────────────────────────────────────────────────
  const handleClearThread = () => {
    if (!user?.id || !ticket?.id) return;
    clearThread(ticket.id, user.id);
    setMessages([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[420px] max-w-[calc(100vw-1rem)] bg-card border-l border-border shadow-2xl shadow-black/30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Ask Fix-it Felix</p>
            <p className="text-[10px] text-muted-foreground">
              About {ticket.ticket_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleClearThread}
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Ticket context badge */}
      <div className="px-4 py-2 border-b border-border bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] gap-1">
            <MessageSquare className="h-3 w-3" />
            {ticket.ticket_id}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {ticket.specialization || 'General'}
          </Badge>
          {diagnostic && (
            <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
              {diagnostic.fault_code}
            </Badge>
          )}
          {messages.length > 0 && (
            <span className="text-[9px] text-muted-foreground ml-auto">
              {messages.length} message{messages.length !== 1 ? 's' : ''} in thread
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary/50" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Ask about this repair
              </p>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                I have full context of ticket {ticket.ticket_id}, the diagnostic report,
                and your checklist progress. Ask me anything!
              </p>
              <div className="mt-4 space-y-2">
                <SuggestionChip onClick={() => setInput('What should I check first?')}>
                  What should I check first?
                </SuggestionChip>
                <SuggestionChip onClick={() => setInput('Mark step 1 as complete')}>
                  Mark step 1 as complete
                </SuggestionChip>
                <SuggestionChip onClick={() => setInput('Explain the fault code')}>
                  Explain the fault code
                </SuggestionChip>
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id}>
              <div
                className={
                  msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                }
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted/50 text-foreground border border-border rounded-bl-sm'
                  }`}
                >
                  {msg.content || (
                    <span className="text-muted-foreground italic flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Thinking...
                    </span>
                  )}
                </div>
              </div>

              {/* Proposals */}
              {msg.proposals && msg.proposals.length > 0 && (
                <div className="mt-2 ml-0 space-y-2">
                  {msg.proposals.map(proposal => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onApprove={() => handleApproveProposal(proposal)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-muted/50 border border-border rounded-xl rounded-bl-sm px-3 py-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 flex-shrink-0 bg-card">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about this repair..."
            rows={2}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
            disabled={isStreaming}
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-primary hover:bg-primary/90"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Thread memory preserved · Press Enter to send
        </p>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function SuggestionChip({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}

function ProposalCard({
  proposal,
  onApprove,
}: {
  proposal: FelixChatProposal & { status?: string };
  onApprove: () => void;
}) {
  const isApproved = proposal.status === 'approved';

  return (
    <div className="border border-primary/20 rounded-lg p-3 bg-primary/5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">
              {proposal.action}
            </Badge>
            {isApproved && (
              <Badge className="text-[9px] bg-[hsl(var(--success))] text-white">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                Applied
              </Badge>
            )}
          </div>
          <p className="text-xs text-foreground">{proposal.description || proposal.action}</p>
        </div>
        {!isApproved && (
          <Button
            size="sm"
            className="h-7 text-[10px] gap-1 bg-primary hover:bg-primary/90"
            onClick={onApprove}
          >
            <CheckCircle2 className="h-3 w-3" />
            Apply
          </Button>
        )}
      </div>
    </div>
  );
}
