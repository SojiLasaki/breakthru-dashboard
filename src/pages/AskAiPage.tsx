import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Send, Camera, ImagePlus, X, Bot, User, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // base64 data URLs
}

const FELIX_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/felix-chat`;

const STARTERS = [
  'Diagnose a fault code for me',
  'Help me identify a worn part from a photo',
  'What are the service intervals for a Cummins ISX15?',
  'Explain how to replace fuel injectors',
];

export default function AskAiPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageFiles = async (files: FileList | null) => {
    if (!files) return;
    const newImages: string[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      if (!file.type.startsWith('image/')) continue;
      const b64 = await toBase64(file);
      newImages.push(b64);
    }
    setImages(prev => [...prev, ...newImages].slice(0, 4));
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text && images.length === 0) return;
    if (isStreaming) return;

    // Build user message content for API (multimodal if images present)
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    if (text) contentParts.push({ type: 'text', text });
    for (const img of images) {
      contentParts.push({ type: 'image_url', image_url: { url: img } });
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      images: images.length > 0 ? [...images] : undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setImages([]);
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    let assistantText = '';

    // Build API messages (convert history to API format)
    const apiMessages = [...messages, userMsg].map(m => {
      if (m.role === 'user' && m.images?.length) {
        const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
        if (m.content) parts.push({ type: 'text', text: m.content });
        for (const img of m.images) {
          parts.push({ type: 'image_url', image_url: { url: img } });
        }
        return { role: 'user', content: parts };
      }
      return { role: m.role, content: m.content };
    });

    try {
      const resp = await fetch(FELIX_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        if (resp.status === 429 || resp.status === 402) {
          toast({ title: 'Fix it Felix unavailable', description: err.error, variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: err.error || 'Something went wrong.', variant: 'destructive' });
        }
        setIsStreaming(false);
        return;
      }

      // Add empty assistant bubble
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantText += delta;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: assistantText } : m)
              );
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      toast({ title: 'Connection error', description: 'Could not reach Fix it Felix. Please try again.', variant: 'destructive' });
    } finally {
      setIsStreaming(false);
    }
  }, [input, images, messages, isStreaming, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 sm:-m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center relative">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[hsl(142,70%,55%)] border-2 border-card" />
          </div>
          <div>
            <p className="font-semibold text-sm">Fix it Felix</p>
            <p className="text-[10px] text-muted-foreground">Breakthru AI Assistant · Online</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => setMessages([])}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear chat
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Hi, I'm Fix it Felix</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your Breakthru AI assistant. Ask me anything about equipment, diagnostics, parts, or upload a photo for analysis.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="text-left px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-accent/30 hover:border-primary/30 transition-colors text-xs text-muted-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={cn('max-w-[75%] space-y-2', msg.role === 'user' ? 'items-end' : 'items-start')}>
              {msg.images && msg.images.length > 0 && (
                <div className={cn('flex flex-wrap gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt="Uploaded"
                      className="h-28 w-28 object-cover rounded-lg border border-border"
                    />
                  ))}
                </div>
              )}
              {msg.content && (
                <div
                  className={cn(
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card border border-border rounded-tl-sm'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>code]:bg-muted [&>code]:px-1 [&>code]:rounded [&>pre]:bg-muted [&>pre]:p-2 [&>pre]:rounded"
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/`(.*?)`/g, '<code>$1</code>')
                          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                          .replace(/^- (.*$)/gm, '<li>$1</li>')
                          .replace(/\n/g, '<br/>'),
                      }}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                  {msg.role === 'assistant' && msg.content === '' && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card px-4 py-3 flex-shrink-0">
        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex gap-2 mb-2">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img} alt="" className="h-14 w-14 object-cover rounded-lg border border-border" />
                <button
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Camera / image buttons */}
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => cameraInputRef.current?.click()}
              title="Take photo"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              title="Upload image"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
          </div>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Fix it Felix anything… (Enter to send, Shift+Enter for new line)"
            className="flex-1 min-h-[40px] max-h-32 resize-none bg-background text-sm"
            rows={1}
          />

          <Button
            size="icon"
            className="h-9 w-9 bg-primary hover:bg-primary/90 flex-shrink-0"
            onClick={send}
            disabled={isStreaming || (!input.trim() && images.length === 0)}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Fix it Felix can make mistakes. Always verify critical information.
        </p>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleImageFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleImageFiles(e.target.files)}
      />
    </div>
  );
}
