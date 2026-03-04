import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, Loader2, Minimize2 } from 'lucide-react';
import { useFelixChat } from '@/hooks/useFelixChat';
import { FelixChatMessage, formatFelixError } from '@/services/felixChatService';

interface FelixMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  ticketContext?: string;
  componentContext?: string;
}

export default function FloatingFelix({ ticketContext, componentContext }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<FelixMessage[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, sendStream } = useFelixChat();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || isStreaming) return;

    setInput('');
    const userMsg: FelixMessage = { id: Date.now().toString(), role: 'user', content: q };
    const history = [...messages, userMsg];
    const assistantId = `${Date.now()}-assistant`;

    setMessages([...history, { id: assistantId, role: 'assistant', content: '' }]);

    const contextNote = [ticketContext, componentContext].filter(Boolean).join(' | ');
    const contextBlock = contextNote ? `Context: ${contextNote}` : undefined;

    const apiMessages: FelixChatMessage[] = history.map(message => ({
      role: message.role,
      content: message.content,
    }));

    try {
      await sendStream(
        {
          messages: apiMessages,
          contextBlock,
        },
        {
          onDelta: (_delta, fullText) => {
            setMessages(prev => prev.map(message => (
              message.id === assistantId
                ? { ...message, content: fullText }
                : message
            )));
          },
        }
      );
    } catch (error) {
      const errorText = formatFelixError(error);
      setMessages(prev => prev.map(message => (
        message.id === assistantId
          ? { ...message, content: message.content || `Sorry, I encountered an error. ${errorText}` }
          : message
      )));
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95"
        title="Ask Fix-it Felix"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Fix-it Felix</p>
            <p className="text-[10px] text-muted-foreground">Ask anything mid-repair</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-8 w-8 text-primary/30 mb-2" />
            <p className="text-xs text-muted-foreground">Ask about torque specs, part compatibility, repair steps...</p>
          </div>
        )}
        {messages.map(message => (
          <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted/50 text-foreground border border-border rounded-bl-sm'
            }`}>
              {message.content || <span className="text-muted-foreground italic">Thinking...</span>}
            </div>
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-muted/50 border border-border rounded-xl rounded-bl-sm px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question..."
            rows={1}
            className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 pr-10 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/40"
            disabled={isStreaming}
          />
          <Button
            size="icon"
            className="absolute right-1.5 bottom-1.5 h-6 w-6 rounded-md bg-primary hover:bg-primary/90"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
