import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Send,
  Cable,
  Camera,
  ImagePlus,
  X,
  User,
  Loader2,
  Sparkles,
  Trash2,
  Link2,
  Paperclip,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFelixChat } from '@/hooks/useFelixChat';
import {
  ExtractedDocument,
  buildKnowledgeDocumentIngestionPlan,
  extractDocumentContext,
} from '@/lib/contextIngestion';
import {
  FelixChatMessage,
  FelixMessagePart,
  FelixModelEndpoint,
  KnowledgeSnippet,
  McpAdapterOption,
  addToKnowledgeGraph,
  fallbackModelEndpoints,
  formatFelixError,
  getActiveModelEndpoints,
  getDefaultModel,
  ingestKnowledgeDocuments,
  getMcpAdapters,
  searchKnowledgeSnippets,
} from '@/services/felixChatService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface KnowledgeIngestionStatus {
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
  rechunkAttempted: number;
  rechunkSucceeded: number;
  rechunkFailed: number;
}

const STARTERS = [
  'Diagnose a fault code for me',
  'Help me identify a worn part from a photo',
  'What are the service intervals for a Cummins ISX15?',
  'Explain how to replace fuel injectors',
];

const KNOWLEDGE_GRAPH_COMMAND = 'add this to my knowledge graph';
type PolicyMode = 'manual' | 'semi_auto' | 'auto';
type FelixIntent = 'qa' | 'triage' | 'ticket_ops' | 'parts_ops' | 'assignment_ops';
const PROVIDER_LABELS: Record<string, string> = {
  langgraph: 'Backend AI',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  ollama: 'Ollama',
  vllm: 'vLLM',
  llamacpp: 'llama.cpp',
  local: 'Local',
};
const POLICY_MODE_LABELS: Record<PolicyMode, string> = {
  manual: 'Manual approvals',
  semi_auto: 'Semi-auto',
  auto: 'Auto (high-risk gated)',
};
const INTENT_LABELS: Record<FelixIntent, string> = {
  qa: 'Q&A',
  triage: 'Triage',
  ticket_ops: 'Ticket Ops',
  parts_ops: 'Parts Ops',
  assignment_ops: 'Assignment Ops',
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const renderAssistantHtml = (content: string) => {
  const safe = escapeHtml(content || '');
  return safe
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/\n/g, '<br/>');
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export default function AskAiPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isStreaming, sendStream } = useFelixChat();
  const [searchParams, setSearchParams] = useSearchParams();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [documents, setDocuments] = useState<ExtractedDocument[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [contextUrls, setContextUrls] = useState<string[]>([]);
  const [isIngestingKnowledge, setIsIngestingKnowledge] = useState(false);
  const [knowledgeIngestionStatus, setKnowledgeIngestionStatus] = useState<KnowledgeIngestionStatus | null>(null);

  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [knowledgeSnippets, setKnowledgeSnippets] = useState<KnowledgeSnippet[]>([]);
  const [selectedSnippetIds, setSelectedSnippetIds] = useState<string[]>([]);
  const [attachKnowledge, setAttachKnowledge] = useState(false);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);

  const [modelEndpoints, setModelEndpoints] = useState<FelixModelEndpoint[]>(fallbackModelEndpoints);
  const [modelSource, setModelSource] = useState<'backend' | 'fallback'>('fallback');
  const [selectedProvider, setSelectedProvider] = useState(fallbackModelEndpoints[0].provider);
  const [selectedModel, setSelectedModel] = useState(fallbackModelEndpoints[0].model);

  const [mcpAdapters, setMcpAdapters] = useState<McpAdapterOption[]>([]);
  const [activeConnectorIds, setActiveConnectorIds] = useState<string[]>([]);
  const [policyMode, setPolicyMode] = useState<PolicyMode>('manual');
  const [intent, setIntent] = useState<FelixIntent>('qa');

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const providers = Array.from(new Set(modelEndpoints.map(endpoint => endpoint.provider)));
  const modelsForProvider = modelEndpoints.filter(endpoint => endpoint.provider === selectedProvider);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (!q) return;
    setInput(prev => prev || q);
    const updated = new URLSearchParams(searchParams);
    updated.delete('q');
    setSearchParams(updated, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      const [modelsResult, adaptersResult] = await Promise.all([
        getActiveModelEndpoints(),
        getMcpAdapters(),
      ]);

      if (!active) return;

      setModelEndpoints(modelsResult.data);
      setModelSource(modelsResult.source);
      const defaultModel = getDefaultModel(modelsResult.data);
      setSelectedProvider(defaultModel.provider);
      setSelectedModel(defaultModel.model);

      setMcpAdapters(adaptersResult.data);
      setActiveConnectorIds(
        adaptersResult.data
          .filter(adapter => adapter.enabled !== false)
          .map(adapter => adapter.id)
      );
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!modelsForProvider.length) return;
    if (!modelsForProvider.some(model => model.model === selectedModel)) {
      setSelectedModel(modelsForProvider[0].model);
    }
  }, [modelsForProvider, selectedModel]);

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

  const handleDocumentFiles = async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files).slice(0, 6)) {
      const extracted = await extractDocumentContext(file);
      setDocuments(prev => [...prev, extracted].slice(-8));
      if (extracted.warning) {
        toast({
          title: `Document note: ${file.name}`,
          description: extracted.warning,
        });
      }
    }
  };

  const addContextUrl = () => {
    const value = urlInput.trim();
    if (!value) return;

    try {
      const normalized = new URL(value).toString();
      setContextUrls(prev => (prev.includes(normalized) ? prev : [...prev, normalized]));
      setUrlInput('');
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid absolute URL.',
        variant: 'destructive',
      });
    }
  };

  const toggleSnippet = (snippetId: string, enabled: boolean) => {
    setSelectedSnippetIds(prev => {
      if (enabled) return prev.includes(snippetId) ? prev : [...prev, snippetId];
      return prev.filter(id => id !== snippetId);
    });
  };

  const ingestToKnowledgeBase = useCallback(async () => {
    const plan = buildKnowledgeDocumentIngestionPlan(documents, contextUrls);

    if (plan.items.length === 0) {
      setKnowledgeIngestionStatus({
        attempted: plan.totalCandidates,
        succeeded: 0,
        failed: 0,
        skipped: plan.skipped.length,
        rechunkAttempted: 0,
        rechunkSucceeded: 0,
        rechunkFailed: 0,
      });
      toast({
        title: 'Nothing to ingest',
        description: plan.skipped.length > 0
          ? `${plan.skipped.length} item(s) were skipped because they have no ingestible text or valid URL.`
          : 'Add context documents or URLs first.',
      });
      return;
    }

    setIsIngestingKnowledge(true);
    try {
      const result = await ingestKnowledgeDocuments(plan.items, {
        rechunkIfNeeded: true,
      });

      setKnowledgeIngestionStatus({
        attempted: result.attempted + plan.skipped.length,
        succeeded: result.succeeded,
        failed: result.failed,
        skipped: plan.skipped.length,
        rechunkAttempted: result.rechunkAttempted,
        rechunkSucceeded: result.rechunkSucceeded,
        rechunkFailed: result.rechunkFailed,
      });

      const hasFailures = result.failed > 0 || result.rechunkFailed > 0;
      const summaryParts = [
        `${result.succeeded}/${result.attempted} ingested`,
        result.failed > 0 ? `${result.failed} failed` : '',
        plan.skipped.length > 0 ? `${plan.skipped.length} skipped` : '',
        result.rechunkAttempted > 0
          ? `chunks rebuilt ${result.rechunkSucceeded}/${result.rechunkAttempted}`
          : '',
      ].filter(Boolean);

      toast({
        title: hasFailures ? 'Knowledge ingestion completed with issues' : 'Knowledge ingestion complete',
        description: summaryParts.join(' · '),
        variant: hasFailures ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({
        title: 'Knowledge ingestion failed',
        description: error instanceof Error ? error.message : 'Unable to ingest context into the knowledge base.',
        variant: 'destructive',
      });
    } finally {
      setIsIngestingKnowledge(false);
    }
  }, [contextUrls, documents, toast]);

  const fetchSnippets = useCallback(async (queryInput?: string): Promise<KnowledgeSnippet[]> => {
    const query = (queryInput || knowledgeQuery || input).trim();
    if (!query) {
      toast({
        title: 'Search term required',
        description: 'Enter a query to retrieve knowledge snippets.',
      });
      return [];
    }

    setIsKnowledgeLoading(true);
    try {
      const snippets = await searchKnowledgeSnippets(query, 6);
      setKnowledgeSnippets(snippets);
      setSelectedSnippetIds(snippets.map(snippet => snippet.id));
      if (snippets.length === 0) {
        toast({
          title: 'No snippets found',
          description: 'Knowledge search endpoint is unavailable or returned no matches.',
        });
      } else {
        setAttachKnowledge(true);
      }
      return snippets;
    } catch {
      toast({
        title: 'Knowledge search failed',
        description: 'Could not retrieve snippets right now.',
      });
      return [];
    } finally {
      setIsKnowledgeLoading(false);
    }
  }, [knowledgeQuery, input, toast]);

  const buildConsolidatedContext = (snippets: KnowledgeSnippet[]) => {
    const sections: string[] = [];

    if (documents.length > 0) {
      const docSection = documents
        .map(doc => {
          const header = `${doc.name} (${doc.mimeType || 'unknown'}, ${formatSize(doc.size)})`;
          return `### Document: ${header}\n${doc.text || '[No text extracted]'}`;
        })
        .join('\n\n');
      sections.push(`## Uploaded Documents\n${docSection}`);
    }

    if (contextUrls.length > 0) {
      sections.push(`## URL References\n${contextUrls.map(url => `- ${url}`).join('\n')}`);
    }

    if (attachKnowledge && snippets.length > 0) {
      const snippetText = snippets
        .map(snippet => `- ${snippet.title}: ${snippet.content}`)
        .join('\n');
      sections.push(`## Retrieved Knowledge Snippets\n${snippetText}`);
    }

    if (activeConnectorIds.length > 0) {
      const selectedNames = mcpAdapters
        .filter(adapter => activeConnectorIds.includes(adapter.id))
        .map(adapter => adapter.name);
      if (selectedNames.length > 0) {
        sections.push(`## Active Connectors\n${selectedNames.map(name => `- ${name}`).join('\n')}`);
      }
    }

    if (sections.length === 0) return '';
    return `Use the following context for this answer:\n\n${sections.join('\n\n')}`;
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text && images.length === 0) return;
    if (isStreaming) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      images: images.length > 0 ? [...images] : undefined,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setImages([]);

    let snippetsForContext = knowledgeSnippets.filter(snippet => selectedSnippetIds.includes(snippet.id));
    if (attachKnowledge && snippetsForContext.length === 0 && text) {
      snippetsForContext = await fetchSnippets(text);
    }

    const contextBlock = buildConsolidatedContext(snippetsForContext);
    const contextRefs = [
      ...documents.map(doc => `doc:${doc.name}`),
      ...contextUrls.map(url => `url:${url}`),
      ...snippetsForContext.map(snippet => `snippet:${snippet.id}`),
    ].slice(0, 24);

    if (text.toLowerCase().includes(KNOWLEDGE_GRAPH_COMMAND)) {
      const priorUserMessage = [...messages]
        .reverse()
        .find(message => message.role === 'user' && message.content.trim());

      const contentForKnowledgeGraph =
        text.replace(new RegExp(KNOWLEDGE_GRAPH_COMMAND, 'ig'), '').trim() ||
        priorUserMessage?.content ||
        text;

      const upsert = await addToKnowledgeGraph({
        content: contentForKnowledgeGraph,
        context: contextBlock,
        provider: selectedProvider,
        model: selectedModel,
        urls: contextUrls,
        mcp_adapters: activeConnectorIds,
        snippets: snippetsForContext.map(snippet => ({
          id: snippet.id,
          title: snippet.title,
          content: snippet.content,
          source: snippet.source,
        })),
      });

      toast({
        title: upsert.ok ? 'Saved to knowledge graph' : 'Knowledge graph unavailable',
        description: upsert.ok
          ? 'Stored the latest context successfully.'
          : upsert.error || 'Unable to store knowledge graph context.',
        variant: upsert.ok ? 'default' : 'destructive',
      });
    }

    const assistantId = `${Date.now()}-assistant`;
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    const apiMessages: FelixChatMessage[] = nextHistory.map(message => {
      if (message.role === 'user' && message.images?.length) {
        const parts: FelixMessagePart[] = [];
        if (message.content) parts.push({ type: 'text', text: message.content });
        for (const img of message.images) {
          parts.push({ type: 'image_url', image_url: { url: img } });
        }
        return { role: 'user', content: parts };
      }
      return { role: message.role, content: message.content };
    });

    try {
      await sendStream(
        {
          messages: apiMessages,
          provider: selectedProvider,
          model: selectedModel,
          contextBlock,
          mcpAdapters: activeConnectorIds,
          enabledConnectors: activeConnectorIds,
          policyMode,
          intent,
          contextRefs,
        },
        {
          onDelta: (_delta, fullText) => {
            setMessages(prev =>
              prev.map(message => (
                message.id === assistantId
                  ? { ...message, content: fullText }
                  : message
              ))
            );
          },
        }
      );
    } catch (error) {
      const message = formatFelixError(error);
      toast({ title: 'Fix it Felix error', description: message, variant: 'destructive' });
      setMessages(prev => prev.map(msg => (
        msg.id === assistantId
          ? { ...msg, content: msg.content || 'Sorry, I encountered an error.' }
          : msg
      )));
    }
  }, [
    input,
    images,
    isStreaming,
    messages,
    knowledgeSnippets,
    selectedSnippetIds,
    attachKnowledge,
    fetchSnippets,
    selectedProvider,
    selectedModel,
    policyMode,
    intent,
    contextUrls,
    activeConnectorIds,
    sendStream,
    toast,
    documents,
    mcpAdapters,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 sm:-m-6">
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

      <div className="px-4 py-3 border-b border-border bg-card/60 flex-shrink-0 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Provider</p>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(provider => (
                  <SelectItem key={provider} value={provider} className="text-xs">
                    {PROVIDER_LABELS[provider] || provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Model</p>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {modelsForProvider.map(model => (
                  <SelectItem key={`${model.provider}:${model.model}`} value={model.model} className="text-xs">
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Execution Policy</p>
            <Select value={policyMode} onValueChange={value => setPolicyMode(value as PolicyMode)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select policy" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(POLICY_MODE_LABELS) as PolicyMode[]).map(mode => (
                  <SelectItem key={mode} value={mode} className="text-xs">
                    {POLICY_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Agent Intent</p>
            <Select value={intent} onValueChange={value => setIntent(value as FelixIntent)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select intent" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(INTENT_LABELS) as FelixIntent[]).map(option => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {INTENT_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Database className="h-3 w-3" />
            Model source: {modelSource}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Cable className="h-3 w-3" />
            Active connectors: {activeConnectorIds.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => navigate('/ai-agents?tab=connectors')}
          >
            Manage in Agent Studio
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => docInputRef.current?.click()}
            >
              <Paperclip className="h-3.5 w-3.5" />
              Upload context docs
            </Button>

            <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
              <Input
                value={urlInput}
                onChange={event => setUrlInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addContextUrl();
                  }
                }}
                placeholder="https://example.com/spec-sheet"
                className="h-8 text-xs"
              />
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addContextUrl}>
                <Link2 className="h-3 w-3 mr-1" /> Add URL
              </Button>
            </div>

            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={ingestToKnowledgeBase}
              disabled={isIngestingKnowledge || (documents.length === 0 && contextUrls.length === 0)}
            >
              {isIngestingKnowledge ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              Ingest to Knowledge Base
            </Button>
          </div>

          {(documents.length > 0 || contextUrls.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {documents.map(doc => (
                <span
                  key={doc.id}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px]"
                >
                  {doc.name} ({formatSize(doc.size)})
                  <button onClick={() => setDocuments(prev => prev.filter(item => item.id !== doc.id))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {contextUrls.map(url => (
                <span
                  key={url}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px]"
                >
                  {url}
                  <button onClick={() => setContextUrls(prev => prev.filter(item => item !== url))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {knowledgeIngestionStatus && (
            <div
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-[11px]',
                knowledgeIngestionStatus.failed > 0 || knowledgeIngestionStatus.rechunkFailed > 0
                  ? 'border-destructive/40 text-destructive'
                  : 'border-primary/30 text-foreground'
              )}
            >
              {`Ingestion: ${knowledgeIngestionStatus.succeeded} succeeded · ${knowledgeIngestionStatus.failed} failed · ${knowledgeIngestionStatus.skipped} skipped`}
              {knowledgeIngestionStatus.rechunkAttempted > 0 && (
                <span>{` · Chunks rebuilt ${knowledgeIngestionStatus.rechunkSucceeded}/${knowledgeIngestionStatus.rechunkAttempted}`}</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <Checkbox
                checked={attachKnowledge}
                onCheckedChange={checked => setAttachKnowledge(Boolean(checked))}
                id="attach-knowledge"
              />
              <label htmlFor="attach-knowledge" className="text-xs text-muted-foreground">
                Attach knowledge snippets
              </label>
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
              <Input
                value={knowledgeQuery}
                onChange={event => setKnowledgeQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    fetchSnippets();
                  }
                }}
                placeholder="Search backend knowledge"
                className="h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => fetchSnippets()}
                disabled={isKnowledgeLoading}
              >
                {isKnowledgeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Retrieve'}
              </Button>
            </div>
          </div>

          {knowledgeSnippets.length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {knowledgeSnippets.map(snippet => {
                const checked = selectedSnippetIds.includes(snippet.id);
                return (
                  <label
                    key={snippet.id}
                    className="flex gap-2 p-2 rounded-md border border-border bg-background cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={value => toggleSnippet(snippet.id, Boolean(value))}
                    />
                    <span className="text-[11px] leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">{snippet.title}</strong>
                      {' '}
                      {snippet.content}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Hi, I'm Fix it Felix</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your Breakthru AI assistant. Ask about diagnostics, parts, and procedures, or attach visuals and context files.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {STARTERS.map(starter => (
                <button
                  key={starter}
                  onClick={() => { setInput(starter); textareaRef.current?.focus(); }}
                  className="text-left px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-accent/30 hover:border-primary/30 transition-colors text-xs text-muted-foreground"
                >
                  {starter}
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
              {msg.content !== undefined && (
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
                        __html: renderAssistantHtml(msg.content),
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

      <div className="border-t border-border bg-card px-4 py-3 flex-shrink-0">
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
            onChange={event => setInput(event.target.value)}
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={event => handleImageFiles(event.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={event => handleImageFiles(event.target.files)}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".txt,.md,.markdown,.json,.csv,.pdf,text/plain,text/markdown,application/json,text/csv,application/pdf"
        multiple
        className="hidden"
        onChange={event => handleDocumentFiles(event.target.files)}
      />
    </div>
  );
}
