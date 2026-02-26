import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { manualApi, Manual } from '@/services/manualApi';
import { partApi, Part } from '@/services/partApi';
import { componentApi, Component } from '@/services/componentApi';
import { diagnosticsApi, Diagnostic } from '@/services/diagnosticsApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import PdfViewer from '@/components/PdfViewer';
import {
  Send, Loader2, Wrench, BookOpen, Cpu, Package,
  FileText, ExternalLink, Sparkles, ArrowDown,
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfModal, setPdfModal] = useState<Manual | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const searchLocalData = async (query: string) => {
    const q = query.toLowerCase();
    const [allManuals, allParts, allComponents, allDiags] = await Promise.all([
      manualApi.getAll(),
      partApi.getAll(),
      componentApi.getAll(),
      diagnosticsApi.getAll(),
    ]);

    const manuals = allManuals.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.tags.some(t => t.name.toLowerCase().includes(q)) ||
      m.content.toLowerCase().includes(q)
    );

    const parts = allParts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.part_number.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.components_name.some(cn => cn.toLowerCase().includes(q))
    );

    const components = allComponents.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.component_number.toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );

    const diagnostics = allDiags.filter(d =>
      d.fault_code.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.ai_summary.toLowerCase().includes(q) ||
      d.probable_cause.toLowerCase().includes(q) ||
      d.component_name.toLowerCase().includes(q) ||
      d.specialization.toLowerCase().includes(q)
    );

    return { manuals, parts, components, diagnostics };
  };

  const buildContextPrompt = (ctx: ChatMessage['context']) => {
    if (!ctx) return '';
    let prompt = '\n\nHere is relevant data from our system to help answer:\n';

    if (ctx.diagnostics?.length) {
      prompt += '\n## Diagnostic Reports Found:\n';
      ctx.diagnostics.forEach(d => {
        prompt += `- **${d.diagnostic_id}** (Fault: ${d.fault_code}): ${d.ai_summary}\n  Probable Cause: ${d.probable_cause}\n  Recommended: ${d.recommended_actions}\n  Confidence: ${d.confidence_score}%\n`;
      });
    }
    if (ctx.components?.length) {
      prompt += '\n## Related Components:\n';
      ctx.components.forEach(c => {
        prompt += `- **${c.name}** (${c.component_number}) — Group: ${c.group}, ${c.parts_count} parts\n`;
      });
    }
    if (ctx.parts?.length) {
      prompt += '\n## Available Parts:\n';
      ctx.parts.forEach(p => {
        prompt += `- **${p.name}** (${p.part_number}) — Status: ${p.status}, Qty: ${p.quantity_available}, Category: ${p.category}\n`;
      });
    }
    if (ctx.manuals?.length) {
      prompt += '\n## Related Manuals:\n';
      ctx.manuals.forEach(m => {
        prompt += `- **${m.title}** (${m.category}, ${m.version}): ${m.description}\n`;
      });
    }

    prompt += `\nIMPORTANT: Structure your response with these sections (use markdown headings):
## Issue Summary
Brief explanation of the likely problem.

## Affected Components
List related components from the data above.

## Required Parts
List each part with: name, part number, availability status, and quantity.

## Required Tools
List tools needed for this repair.

## Recommended Repair Steps
Numbered step-by-step instructions.

## Related Manuals
List the relevant manuals from above with title and category.

If no exact match was found in the data, say so and provide your best guidance based on general knowledge.`;

    return prompt;
  };

  const handleSubmit = async (text?: string) => {
    const query = text || input.trim();
    if (!query || isLoading) return;
    setInput('');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Search local data for context
      const context = await searchLocalData(query);
      const contextPrompt = buildContextPrompt(context);

      const enrichedQuery = query + contextPrompt;

      // Stream from felix-chat
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/felix-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: enrichedQuery },
          ],
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || `Error ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      const assistantId = (Date.now() + 1).toString();

      // Create assistant message
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', context }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
              );
            }
          } catch { /* partial json, wait */ }
        }
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to get response.', variant: 'destructive' });
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          /* Empty state - centered hero */
          <div className="flex flex-col items-center justify-center min-h-full px-4 py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2">
              Breakthru Repair Assistant
            </h1>
            <p className="text-muted-foreground text-sm md:text-base text-center max-w-md mb-8">
              Describe a fault code, symptom, or equipment issue. I'll find diagnostics, parts, manuals, and step-by-step repair guidance.
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSubmit(s)}
                  className="text-xs px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/40 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat messages */
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
                  <div className="space-y-3">
                    {/* AI response */}
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/90 leading-relaxed [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-foreground [&_ul]:space-y-1 [&_ol]:space-y-1 [&_li]:text-xs [&_p]:text-xs [&_strong]:text-foreground">
                          <MessageContent content={msg.content} />
                        </div>

                        {/* Contextual cards: Manuals */}
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

                        {/* Parts quick view */}
                        {msg.context?.parts && msg.context.parts.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Package className="h-3 w-3" /> Parts Availability
                            </p>
                            <div className="bg-card border border-border rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border bg-muted/30">
                                    <th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground font-medium">Part</th>
                                    <th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground font-medium">Part #</th>
                                    <th className="text-center px-3 py-1.5 text-[10px] text-muted-foreground font-medium">Qty</th>
                                    <th className="text-right px-3 py-1.5 text-[10px] text-muted-foreground font-medium">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {msg.context.parts.map(p => (
                                    <tr key={p.id} className="border-b border-border/50 last:border-0">
                                      <td className="px-3 py-1.5 font-medium">{p.name}</td>
                                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{p.part_number}</td>
                                      <td className="px-3 py-1.5 text-center">{p.quantity_available}</td>
                                      <td className="px-3 py-1.5 text-right">
                                        <StockBadge status={p.status} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Analyzing issue and searching database...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area - always at bottom */}
      <div className={`border-t border-border bg-card/50 backdrop-blur-sm p-4 ${!hasMessages ? '' : ''}`}>
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-card border border-border rounded-xl focus-within:border-primary/40 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Describe a fault code, symptom, or equipment issue..."
              rows={1}
              className="w-full bg-transparent px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none"
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-primary hover:bg-primary/90"
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Powered by Breakthru AI · Searches manuals, parts, diagnostics & components
          </p>
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

/** Simple markdown-like renderer */
function MessageContent({ content }: { content: string }) {
  if (!content) return <span className="text-muted-foreground italic text-xs">Thinking...</span>;

  const lines = content.split('\n');
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith('## '))
          return <h2 key={i}>{line.slice(3)}</h2>;
        if (line.startsWith('### '))
          return <h3 key={i}>{line.slice(4)}</h3>;
        if (line.startsWith('- **'))
          return <li key={i} dangerouslySetInnerHTML={{ __html: formatBold(line.slice(2)) }} />;
        if (line.startsWith('- '))
          return <li key={i}>{line.slice(2)}</li>;
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="list-decimal ml-4">{line.replace(/^\d+\.\s/, '')}</li>;
        if (line.startsWith('**') && line.endsWith('**'))
          return <p key={i}><strong>{line.slice(2, -2)}</strong></p>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatBold(line) }} />;
      })}
    </div>
  );
}

function formatBold(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function StockBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    in_stock: { label: 'In Stock', cls: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' },
    low_stock: { label: 'Low Stock', cls: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10' },
    out_of_stock: { label: 'Out of Stock', cls: 'text-primary bg-primary/10' },
  };
  const s = map[status] || map.in_stock;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}
