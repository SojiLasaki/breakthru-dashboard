import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ListChecks, ChevronDown, Camera, Paperclip, MessageSquare,
  AlertTriangle, Clock, CheckCircle2, Image as ImageIcon,
  Send, Loader2, Sparkles,
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface RepairStep {
  id: number;
  label: string;
  detail?: string;
  required: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StepState {
  checked: boolean;
  note: string;
  flagged: boolean;
  photos: string[];
  timeMinutes: number;
  chatOpen: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  chatLoading: boolean;
}

interface Props {
  steps: RepairStep[];
  ticketContext?: string;
  componentContext?: string;
}

export default function RepairChecklist({ steps, ticketContext, componentContext }: Props) {
  const [states, setStates] = useState<Record<number, StepState>>(
    () => Object.fromEntries(steps.map(s => [s.id, {
      checked: false, note: '', flagged: false, photos: [], timeMinutes: 0,
      chatOpen: false, chatMessages: [], chatInput: '', chatLoading: false,
    }]))
  );

  const chatEndRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const update = (id: number, patch: Partial<StepState>) => {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const completed = Object.values(states).filter(s => s.checked).length;
  const total = steps.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handlePhoto = (stepId: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) update(stepId, { photos: [...(states[stepId]?.photos || []), file.name] });
    };
    input.click();
  };

  const handleUpload = (stepId: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) update(stepId, { photos: [...(states[stepId]?.photos || []), file.name] });
    };
    input.click();
  };

  const handleStepChat = async (stepId: number, step: RepairStep) => {
    const s = states[stepId];
    const q = s.chatInput.trim();
    if (!q || s.chatLoading) return;

    const newMessages: ChatMessage[] = [...s.chatMessages, { role: 'user', content: q }];
    update(stepId, { chatInput: '', chatMessages: newMessages, chatLoading: true });

    try {
      const contextParts = [
        ticketContext,
        componentContext,
        `Current step: "${step.label}"`,
        step.detail ? `Step detail: ${step.detail}` : '',
      ].filter(Boolean).join(' | ');

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/felix-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({
          messages: [
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: `Context: ${contextParts}\n\nQuestion: ${q}` },
          ].slice(-6), // keep last 6 for context window
        }),
      });

      if (!resp.ok) throw new Error('Failed');

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buffer = '', content = '';

      // Add empty assistant message
      const withAssistant: ChatMessage[] = [...newMessages, { role: 'assistant', content: '' }];
      update(stepId, { chatMessages: withAssistant });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const js = line.slice(6).trim();
          if (js === '[DONE]') break;
          try {
            const p = JSON.parse(js);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              content += c;
              const updated: ChatMessage[] = [...newMessages, { role: 'assistant', content }];
              update(stepId, { chatMessages: updated });
            }
          } catch {}
        }
      }
    } catch {
      update(stepId, {
        chatMessages: [...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Try again.' }],
      });
    } finally {
      update(stepId, { chatLoading: false });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> Repair Checklist
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{completed}/{total}</span>
            <span className={`text-[10px] font-bold ${progress === 100 ? 'text-[hsl(var(--success))]' : 'text-primary'}`}>{progress}%</span>
          </div>
        </div>
        <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-[hsl(var(--success))]' : 'bg-primary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-1 pb-4">
        {steps.map((step, idx) => {
          const s = states[step.id] || {
            checked: false, note: '', flagged: false, photos: [], timeMinutes: 0,
            chatOpen: false, chatMessages: [], chatInput: '', chatLoading: false,
          };
          return (
            <Collapsible key={step.id}>
              <div className={`rounded-xl border transition-all ${
                s.checked ? 'bg-[hsl(var(--success))]/5 border-[hsl(var(--success))]/20' :
                s.flagged ? 'bg-primary/5 border-primary/20' :
                'border-border hover:border-border/80 hover:bg-muted/20'
              }`}>
                {/* Main row */}
                <div className="flex items-start gap-3 px-4 py-3">
                  <Checkbox
                    checked={s.checked}
                    onCheckedChange={() => {
                      const nowChecked = !s.checked;
                      if (nowChecked) {
                        // Mark all previous steps as checked too
                        const patch: Record<number, StepState> = {};
                        for (let i = 0; i <= idx; i++) {
                          const sid = steps[i].id;
                          patch[sid] = { ...states[sid], checked: true };
                        }
                        setStates(prev => ({ ...prev, ...patch }));
                      } else {
                        update(step.id, { checked: false });
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${s.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        <span className="text-primary font-bold mr-1">Step {idx + 1}.</span>
                        {step.label}
                      </span>
                      {!step.required && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Optional</Badge>}
                      {s.flagged && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Flagged
                        </Badge>
                      )}
                    </div>
                    {step.detail && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>
                    )}
                    {s.photos.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {s.photos.map((p, i) => (
                          <span key={i} className="text-[9px] bg-muted/50 border border-border rounded px-1.5 py-0.5 flex items-center gap-1">
                            <ImageIcon className="h-2.5 w-2.5" /> {p}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.note && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic bg-muted/20 rounded px-2 py-1">
                        📝 {s.note}
                      </p>
                    )}
                    {/* Chat message count indicator */}
                    {s.chatMessages.length > 0 && !s.chatOpen && (
                      <button
                        onClick={() => update(step.id, { chatOpen: true })}
                        className="text-[9px] text-primary mt-1 flex items-center gap-1 hover:underline"
                      >
                        <MessageSquare className="h-2.5 w-2.5" /> {s.chatMessages.length} messages
                      </button>
                    )}
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                {/* Expanded actions */}
                <CollapsibleContent>
                  <div className="px-4 pb-3 pt-1 border-t border-border/50 space-y-3">
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1.5 px-3" onClick={() => handlePhoto(step.id)}>
                        <Camera className="h-3 w-3" /> Take Photo
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1.5 px-3" onClick={() => handleUpload(step.id)}>
                        <Paperclip className="h-3 w-3" /> Upload Image
                      </Button>
                      <Button
                        variant={s.flagged ? 'default' : 'outline'} size="sm"
                        className={`h-8 text-[10px] gap-1.5 px-3 ${s.flagged ? 'bg-primary hover:bg-primary/90' : ''}`}
                        onClick={() => update(step.id, { flagged: !s.flagged })}
                      >
                        <AlertTriangle className="h-3 w-3" /> {s.flagged ? 'Unflag' : 'Flag Issue'}
                      </Button>
                      <Button
                        variant={s.chatOpen ? 'default' : 'outline'} size="sm"
                        className={`h-8 text-[10px] gap-1.5 px-3 ${s.chatOpen ? 'bg-primary hover:bg-primary/90' : ''}`}
                        onClick={() => update(step.id, { chatOpen: !s.chatOpen })}
                      >
                        <MessageSquare className="h-3 w-3" /> {s.chatOpen ? 'Hide Chat' : 'Ask Felix'}
                      </Button>
                    </div>

                    {/* Note */}
                    <div>
                      <Textarea
                        placeholder="Add a note for this step..."
                        value={s.note}
                        onChange={e => update(step.id, { note: e.target.value })}
                        rows={2}
                        className="text-xs bg-background resize-none"
                      />
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <input
                        type="number"
                        min="0"
                        step="5"
                        placeholder="Minutes"
                        value={s.timeMinutes || ''}
                        onChange={e => update(step.id, { timeMinutes: parseInt(e.target.value) || 0 })}
                        className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <span className="text-[10px] text-muted-foreground">minutes</span>
                    </div>

                    {/* Inline Felix Chat */}
                    {s.chatOpen && (
                      <StepChat
                        stepId={step.id}
                        step={step}
                        messages={s.chatMessages}
                        input={s.chatInput}
                        loading={s.chatLoading}
                        onInputChange={(val) => update(step.id, { chatInput: val })}
                        onSend={() => handleStepChat(step.id, step)}
                        endRef={(el) => { chatEndRefs.current[step.id] = el; }}
                      />
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {progress === 100 && (
          <div className="flex items-center gap-2 justify-center py-3 text-[hsl(var(--success))]">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">All steps completed!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Inline chat per step ── */
function StepChat({
  stepId, step, messages, input, loading, onInputChange, onSend, endRef,
}: {
  stepId: number;
  step: RepairStep;
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  endRef: (el: HTMLDivElement | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="border border-primary/20 rounded-lg bg-primary/5 overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-semibold text-primary">Ask Felix about this step</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-48 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-3 italic">
            Ask about procedures, specs, or skip guidance for this step...
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed ${
              m.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-background text-foreground border border-border rounded-bl-sm'
            }`}>
              {m.content || <span className="italic text-muted-foreground">Thinking...</span>}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-background border border-border rounded-lg rounded-bl-sm px-2.5 py-1.5">
              <Loader2 className="h-3 w-3 text-primary animate-spin" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-primary/10 p-2">
        <div className="relative">
          <input
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="e.g. Can I skip this step if…"
            className="w-full bg-background border border-border rounded-md px-3 py-2 pr-9 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
            disabled={loading}
          />
          <Button
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 rounded-md bg-primary hover:bg-primary/90"
            onClick={onSend}
            disabled={!input.trim() || loading}
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
