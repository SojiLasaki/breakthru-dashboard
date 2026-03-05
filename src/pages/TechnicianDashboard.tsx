import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { manualApi, Manual } from '@/services/manualApi';
import { partApi, Part } from '@/services/partApi';
import { componentApi, Component } from '@/services/componentApi';
import { diagnosticsApi, Diagnostic } from '@/services/diagnosticsApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useFelixChat } from '@/hooks/useFelixChat';
import { FelixChatMessage, formatFelixError } from '@/services/felixChatService';
import PdfViewer from '@/components/PdfViewer';
import { technicianApi } from '@/services/technicianApi';
import { isTicketAssignedToUser } from '@/lib/ticketIdentity';
import { ticketPriorityBadgeClass, ticketPriorityLabel, ticketStatusBadgeClass } from '@/lib/ticketBadges';
import { getDisplayFullName } from '@/lib/displayUser';
import {
  Send, Loader2, Wrench, BookOpen, Package, Clock,
  FileText, ExternalLink, Sparkles, AlertCircle, Eye, Ticket as TicketIcon,
} from 'lucide-react';

const PRIORITY_ORDER: Record<number, number> = { 5: 0, 4: 1, 3: 2, 2: 3, 1: 4 };

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  context?: {
    manuals?: Manual[];
    parts?: Part[];
    components?: Component[];
    diagnostics?: Diagnostic[];
  };
}

const SUGGESTIONS = [
  'Fuel injector fault code DR1123',
  'Engine overheating on ISB6.7',
  'Low oil pressure during operation',
  'Alternator output below spec',
];

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pdfModal, setPdfModal] = useState<Manual | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, sendStream } = useFelixChat();

  const fullName = user ? getDisplayFullName(user) : '';

  // Fetch tickets
  useEffect(() => {
    ticketApi.getAll().then(all => {
      let mine = all
        .filter(t => isTicketAssignedToUser(t, user) && t.status !== 'completed')
        .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4) || (b.created_at || '').localeCompare(a.created_at || ''));
      if (mine.length === 0 && all.length > 0) {
        mine = all.filter(t => t.status !== 'completed').sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4) || (b.created_at || '').localeCompare(a.created_at || ''));
      }
      setTickets(mine);
    }).catch(() => ticketApi.getAll().then(all => setTickets(all.filter(t => t.status !== 'completed')))).finally(() => setTicketsLoading(false));
  }, [fullName, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const searchBackend = async (query: string) => {
    return technicianApi.search(query);
  };

  const buildContextPrompt = (ctx: ChatMessage['context']) => {
    if (!ctx) return '';
    let prompt = '\n\nHere is relevant data from our system:\n';
    if (ctx.diagnostics?.length) {
      prompt += '\n## Diagnostic Reports Found:\n';
      ctx.diagnostics.forEach(d => { prompt += `- **${d.diagnostic_id}** (Fault: ${d.fault_code}): ${d.ai_summary}\n  Probable Cause: ${d.probable_cause}\n  Recommended: ${d.recommended_actions}\n  Confidence: ${d.confidence_score}%\n`; });
    }
    if (ctx.components?.length) {
      prompt += '\n## Related Components:\n';
      ctx.components.forEach(c => { prompt += `- **${c.name}** (${c.component_number}) — Group: ${c.group}, ${c.parts_count} parts\n`; });
    }
    if (ctx.parts?.length) {
      prompt += '\n## Available Parts:\n';
      ctx.parts.forEach(p => { prompt += `- **${p.name}** (${p.part_number}) — Status: ${p.status}, Qty: ${p.quantity_available}\n`; });
    }
    if (ctx.manuals?.length) {
      prompt += '\n## Related Manuals:\n';
      ctx.manuals.forEach(m => { prompt += `- **${m.title}** (${m.category}, ${m.version}): ${m.description}\n`; });
    }
    prompt += `\nStructure your response with: ## Issue Summary, ## Affected Components, ## Required Parts, ## Required Tools, ## Recommended Repair Steps, ## Related Manuals. If no exact match, say so and provide best guidance.`;
    return prompt;
  };

  const handleSubmit = async (text?: string) => {
    const query = text || input.trim();
    if (!query || isStreaming) return;
    setInput('');
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: query };
    const history = [...messages, userMsg];
    setMessages(history);
    try {
      const context = await searchBackend(query);
      const assistantId = `${Date.now()}-assistant`;
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', context }]);

      const apiMessages: FelixChatMessage[] = history.map(m => ({
        role: m.role,
        content: m.content,
      }));

      await sendStream(
        {
          messages: apiMessages,
          contextBlock: buildContextPrompt(context),
        },
        {
          onDelta: (_delta, fullText) => {
            setMessages(prev => prev.map(m => (
              m.id === assistantId ? { ...m, content: fullText } : m
            )));
          },
        }
      );
    } catch (e: any) {
      toast({ title: 'Error', description: formatFelixError(e), variant: 'destructive' });
      setMessages(prev => [...prev, { id: `${Date.now()}-error`, role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }
  };

  const hasMessages = messages.length > 0;
  const topTickets = tickets.slice(0, 4);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <div className="flex flex-col items-center px-4 py-8 min-h-full">
            {/* Hero */}
            <div className="flex flex-col items-center mt-6 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center">
                Fix-it Felix
              </h1>
              <p className="text-muted-foreground text-sm text-center max-w-md mt-1">
                Describe a fault code, symptom, or equipment issue. I'll find diagnostics, parts, manuals, and repair steps.
              </p>
            </div>

            {/* Priority Tickets */}
            <div className="w-full max-w-3xl mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" /> Priority Tickets
                </h2>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate('/tickets')}>
                  View All
                </Button>
              </div>

              {ticketsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="bg-card border-border">
                      <CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent>
                    </Card>
                  ))}
                </div>
              ) : topTickets.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="flex flex-col items-center py-8">
                    <TicketIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No active tickets assigned to you.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {topTickets.map(t => (
                    <Card
                      key={t.id}
                      className="bg-card border-border card-hover cursor-pointer group"
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono text-primary font-semibold">{t.ticket_id}</p>
                            <p className="text-sm font-medium text-foreground mt-1 truncate">{t.title}</p>
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize flex-shrink-0 ml-2 ${ticketPriorityBadgeClass(t.priority)}`}>
                            {ticketPriorityLabel(t.priority) || t.priority}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${ticketStatusBadgeClass(t.status)}`}>{t.status.replace(/_/g, ' ')}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(t.created_at).toLocaleDateString()}</span>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 truncate">{t.customer}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Suggestion chips — kept smaller so tickets stand out */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mb-4">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => handleSubmit(s)} className="text-[11px] px-2.5 py-1.5 rounded-md bg-card border border-border hover:border-primary/40 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-primary font-semibold mb-1">Fix-it Felix</p>
                      <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/90 leading-relaxed [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-foreground [&_ul]:space-y-1 [&_ol]:space-y-1 [&_li]:text-xs [&_p]:text-xs [&_strong]:text-foreground">
                        <MessageContent content={msg.content} />
                      </div>

                      {msg.context?.manuals && msg.context.manuals.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <BookOpen className="h-3 w-3" /> Related Manuals
                          </p>
                          <div className="grid gap-2">
                            {msg.context.manuals.map(m => (
                              <div key={m.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">{m.title}</p>
                                  <p className="text-[10px] text-muted-foreground">{m.category} · {m.version}</p>
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0 ml-2">
                                  {m.file && (
                                    <>
                                      <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => setPdfModal(m)}>
                                        <FileText className="h-2.5 w-2.5" /> View
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => window.open(m.file!, '_blank')}>
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.context?.parts && msg.context.parts.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Package className="h-3 w-3" /> Parts Availability
                          </p>
                          <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead><tr className="border-b border-border bg-muted/30"><th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground font-medium">Part</th><th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground font-medium">Part #</th><th className="text-center px-3 py-1.5 text-[10px] text-muted-foreground font-medium">Qty</th><th className="text-right px-3 py-1.5 text-[10px] text-muted-foreground font-medium">Status</th></tr></thead>
                              <tbody>
                                {msg.context.parts.map(p => (
                                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                                    <td className="px-3 py-1.5 font-medium">{p.name}</td>
                                    <td className="px-3 py-1.5 font-mono text-muted-foreground">{p.part_number}</td>
                                    <td className="px-3 py-1.5 text-center">{p.quantity_available}</td>
                                    <td className="px-3 py-1.5 text-right"><StockBadge status={p.status} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                </div>
                <span className="text-xs text-muted-foreground">Fix-it Felix is analyzing your issue...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-card border border-border rounded-xl focus-within:border-primary/40 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ask Fix-it Felix about a fault code, symptom, or equipment issue..."
              rows={1}
              className="w-full bg-transparent px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none"
              disabled={isStreaming}
            />
            <Button size="icon" className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-primary hover:bg-primary/90" onClick={() => handleSubmit()} disabled={!input.trim() || isStreaming}>
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">Powered by Fix-it Felix · Searches manuals, parts, diagnostics & components</p>
        </div>
      </div>

      {/* PDF Modal */}
      <Dialog open={!!pdfModal} onOpenChange={open => { if (!open) setPdfModal(null); }}>
        <DialogContent className="max-w-4xl h-[80vh] bg-card p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-border">
            <DialogTitle className="text-sm">{pdfModal?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4" style={{ height: 'calc(80vh - 60px)' }}>
            {pdfModal?.file && <PdfViewer url={pdfModal.file} title={pdfModal.title} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  if (!content) return <span className="text-muted-foreground italic text-xs">Thinking...</span>;
  const lines = content.split('\n');
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
        if (line.startsWith('- **')) return <li key={i} dangerouslySetInnerHTML={{ __html: formatBold(line.slice(2)) }} />;
        if (line.startsWith('- ')) return <li key={i}>{line.slice(2)}</li>;
        if (/^\d+\.\s/.test(line)) return <li key={i} className="list-decimal ml-4">{line.replace(/^\d+\.\s/, '')}</li>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i}><strong>{line.slice(2, -2)}</strong></p>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatBold(line) }} />;
      })}
    </div>
  );
}
function escapeHtml(t: string) {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function formatBold(t: string) { return escapeHtml(t).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); }
function StockBadge({ status }: { status: string }) {
  const m: Record<string, { label: string; cls: string }> = { in_stock: { label: 'In Stock', cls: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' }, low_stock: { label: 'Low Stock', cls: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10' }, out_of_stock: { label: 'Out of Stock', cls: 'text-primary bg-primary/10' } };
  const s = m[status] || m.in_stock;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}
