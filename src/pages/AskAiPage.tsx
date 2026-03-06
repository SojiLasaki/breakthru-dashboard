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
  AtSign,
  Paperclip,
  Database,
  AlertCircle,
  Clock,
  Ticket as TicketIcon,
  Eye,
  History,
  Share2,
  CheckCircle2,
  XCircle,
  Edit2,
  MessageSquarePlus,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ticketApi, type Ticket } from '@/services/ticketApi';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context';
import { useFelixChatContext, type FelixChatMessage } from '@/context/FelixChatContext';
import { ChatSessionPanel } from '@/components/felix/ChatSessionPanel';
import { isTicketAssignedToUser } from '@/lib/ticketIdentity';
import { useToast } from '@/hooks/use-toast';
import { useFelixChat } from '@/hooks/useFelixChat';
import { ticketPriorityBadgeClass, ticketPriorityLabel, ticketStatusBadgeClass } from '@/lib/ticketBadges';
import { aiAgentApi, type AgentActionProposal } from '@/services/aiAgentApi';
import {
  ExtractedDocument,
  buildKnowledgeDocumentIngestionPlan,
  extractDocumentContext,
} from '@/lib/contextIngestion';
import {
  type FelixChatMessage as FelixApiMessage,
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

interface KnowledgeIngestionStatus {
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
  rechunkAttempted: number;
  rechunkSucceeded: number;
  rechunkFailed: number;
}

interface ResourceMentionOption {
  mention: string;
  label: string;
  ref: string;
  removable?: boolean;
}

const STARTERS = [
  'Diagnose a fault code for me',
  'Help me identify a worn part from a photo',
  'What are the service intervals for a Cummins ISX15?',
  'Explain how to replace fuel injectors',
];

const PRIORITY_ORDER: Record<number, number> = { 5: 0, 4: 1, 3: 2, 2: 3, 1: 4 };

const SEVERITY_BADGE_CLASS: Record<number, string> = {
  1: 'text-muted-foreground',
  2: 'text-blue-400',
  3: 'text-yellow-400',
  4: 'text-orange-400',
  5: 'text-red-400',
};

const SEVERITY_LABEL: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Severe',
  5: 'Critical',
};

const PRIORITY_LABEL_CARD: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Severe',
  5: 'Urgent',
};

const PRIORITY_TEXT_CLASS: Record<number, string> = {
  1: 'text-muted-foreground',
  2: 'text-blue-400',
  3: 'text-yellow-400',
  4: 'text-orange-400',
  5: 'text-red-400',
};

const KNOWLEDGE_GRAPH_COMMAND = 'add this to my knowledge graph';
type PolicyMode = 'manual' | 'semi_auto' | 'auto';
type FelixIntent = 'qa' | 'triage' | 'ticket_ops' | 'parts_ops' | 'assignment_ops';
const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;
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
/** Infer model and execution policy from user input. */
function inferModelAndPolicy(
  text: string,
  hasImages: boolean,
  availableEndpoints: FelixModelEndpoint[],
  defaultEndpoint: FelixModelEndpoint
): { model: string; provider: string; policyMode: PolicyMode } {
  const lower = text.toLowerCase().trim();
  const hasActionKeywords = /\b(assign|create|approve|delete|update|modify|add to knowledge)\b/.test(lower);
  const hasTicketOps = /\b(ticket|work order|assignment)\b/.test(lower);
  const policyMode: PolicyMode =
    hasActionKeywords || hasTicketOps ? 'manual' : 'auto';
  const endpoint = hasImages
    ? availableEndpoints.find(e => e.model.toLowerCase().includes('vision') || e.model.includes('gpt-4o') || e.model.includes('gemini'))
    || defaultEndpoint
    : defaultEndpoint;
  return {
    model: endpoint.model,
    provider: endpoint.provider,
    policyMode,
  };
}

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

const extractUrlsFromText = (value: string): string[] => {
  const matches = value.match(URL_PATTERN) || [];
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const candidate of matches) {
    try {
      const normalized = new URL(candidate).toString();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        deduped.push(normalized);
      }
    } catch {
      // Ignore invalid URL-like fragments.
    }
  }
  return deduped;
};

const extractMentionsFromText = (value: string): string[] => {
  const matches = value.toLowerCase().match(/@([a-z0-9][a-z0-9._-]{0,31})/g) || [];
  return matches.map(item => item.slice(1));
};

const toMentionToken = (value: string, fallback: string): string => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
  return normalized || fallback;
};

const buildResourceMentions = (docs: ExtractedDocument[], urls: string[]): ResourceMentionOption[] => {
  const mentions: ResourceMentionOption[] = [];
  const used = new Set<string>();

  docs.forEach((doc, idx) => {
    const base = toMentionToken(doc.name, `doc${idx + 1}`);
    let mention = base;
    let suffix = 2;
    while (used.has(mention)) {
      mention = `${base}${suffix}`;
      suffix += 1;
    }
    used.add(mention);
    mentions.push({
      mention,
      label: doc.name,
      ref: `doc:${doc.name}`,
      removable: true,
    });
  });

  urls.forEach((url, idx) => {
    const host = (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return `url${idx + 1}`;
      }
    })();
    const base = toMentionToken(host, `url${idx + 1}`);
    let mention = base;
    let suffix = 2;
    while (used.has(mention)) {
      mention = `${base}${suffix}`;
      suffix += 1;
    }
    used.add(mention);
    mentions.push({
      mention,
      label: url,
      ref: `url:${url}`,
      removable: true,
    });
  });

  return mentions;
};

export default function AskAiPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isRole } = useAuth();
  const { isStreaming, sendStream } = useFelixChat();
  const {
    messages,
    setMessages,
    history,
    addToHistory,
    loadFromHistory,
    removeFromHistory,
    shareConversation,
    loadSharedConversation,
    sessions,
    activeSessionId,
    startNewChat,
  } = useFelixChatContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [diagnosticReportId, setDiagnosticReportId] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [sharedLinkInput, setSharedLinkInput] = useState('');
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

  const [mcpAdapters, setMcpAdapters] = useState<McpAdapterOption[]>([]);
  const [activeConnectorIds, setActiveConnectorIds] = useState<string[]>([]);
  const intent: FelixIntent = 'qa';
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [proposalBusy, setProposalBusy] = useState<Record<string, boolean>>({});

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalTicketCount, setTotalTicketCount] = useState(0);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const availableModelEndpoints = modelEndpoints;
  const defaultModelEndpoint = getDefaultModel(availableModelEndpoints);
  const resourceMentions = buildResourceMentions(documents, contextUrls);
  const isTechnician = isRole ? isRole('technician') : user?.role === 'technician';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const sharedId = searchParams.get('shared');
    if (sharedId) {
      const shared = loadSharedConversation(sharedId);
      if (shared?.length) {
        setMessages(shared);
        toast({ title: 'Shared conversation loaded', variant: 'default' });
      }
      const updated = new URLSearchParams(searchParams);
      updated.delete('shared');
      setSearchParams(updated, { replace: true });
    }
  }, [searchParams, setSearchParams, loadSharedConversation, toast]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (!q) return;
    setInput(prev => prev || q);
    const updated = new URLSearchParams(searchParams);
    updated.delete('q');
    setSearchParams(updated, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const reportId = (searchParams.get('diagnostic_report_id') || searchParams.get('dr') || '').trim();
    if (!reportId) return;
    setDiagnosticReportId(prev => prev || reportId);
    const updated = new URLSearchParams(searchParams);
    updated.delete('diagnostic_report_id');
    updated.delete('dr');
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

      const fallbackModels = modelsResult.data.filter(model => model.provider === 'langgraph');
      const resolvedModels = modelsResult.source === 'backend'
        ? (modelsResult.data.length > 0 ? modelsResult.data : [getDefaultModel(modelsResult.data)])
        : (fallbackModels.length > 0 ? fallbackModels : [getDefaultModel(modelsResult.data)]);

      setModelEndpoints(resolvedModels);
      setModelSource(modelsResult.source);

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
    if (!user || !isTechnician) {
      setTickets([]);
      setTotalTicketCount(0);
      setTicketsLoading(false);
      return;
    }

    setTicketsLoading(true);
    ticketApi
      .getAll()
      .then(all => {
        // Technicians should see ONLY tickets assigned to them
        const mine = all.filter(t => isTicketAssignedToUser(t, user) && t.status !== 'completed');

        // Sort by "most urgent and most recent":
        // 1) higher priority first, 2) higher severity, 3) newest created_at.
        mine.sort((a, b) => {
          const pa = typeof a.priority === 'number' ? a.priority : 0;
          const pb = typeof b.priority === 'number' ? b.priority : 0;
          if (pb !== pa) return pb - pa;

          const sa = typeof a.severity === 'number' ? a.severity : 0;
          const sb = typeof b.severity === 'number' ? b.severity : 0;
          if (sb !== sa) return sb - sa;

          const ta = a.created_at || '';
          const tb = b.created_at || '';
          return tb.localeCompare(ta);
        });

        setTotalTicketCount(mine.length);
        setTickets(mine.slice(0, 4));
      })
      .catch(() => { setTickets([]); setTotalTicketCount(0); })
      .finally(() => setTicketsLoading(false));
  }, [isTechnician, user?.id]);


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

  const buildConsolidatedContext = (
    snippets: KnowledgeSnippet[],
    options?: { urls?: string[]; mentionedRefs?: Set<string> }
  ) => {
    const urls = options?.urls || contextUrls;
    const mentionedRefs = options?.mentionedRefs;
    const includeRef = (ref: string) => (!mentionedRefs || mentionedRefs.size === 0 || mentionedRefs.has(ref));
    const sections: string[] = [];

    if (documents.length > 0) {
      const docSection = documents
        .filter(doc => includeRef(`doc:${doc.name}`))
        .map(doc => {
          const header = `${doc.name} (${doc.mimeType || 'unknown'}, ${formatSize(doc.size)})`;
          return `### Document: ${header}\n${doc.text || '[No text extracted]'}`;
        })
        .join('\n\n');
      if (docSection.trim()) {
        sections.push(`## Uploaded Documents\n${docSection}`);
      }
    }

    if (urls.length > 0) {
      const urlSection = urls
        .filter(url => includeRef(`url:${url}`))
        .map(url => `- ${url}`)
        .join('\n');
      if (urlSection.trim()) {
        sections.push(`## URL References\n${urlSection}`);
      }
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
    const detectedUrls = extractUrlsFromText(text);
    const combinedUrls = [...contextUrls];
    for (const url of detectedUrls) {
      if (!combinedUrls.includes(url)) combinedUrls.push(url);
    }
    if (combinedUrls.length !== contextUrls.length) {
      setContextUrls(combinedUrls);
    }

    const mentionCatalog = buildResourceMentions(documents, combinedUrls);
    const mentionMap = new Map(mentionCatalog.map(item => [item.mention, item.ref]));
    const mentionedRefs = new Set(
      extractMentionsFromText(text)
        .map(token => mentionMap.get(token))
        .filter((ref): ref is string => Boolean(ref))
    );

    const userMsg: FelixChatMessage = {
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

    const contextBlock = buildConsolidatedContext(snippetsForContext, {
      urls: combinedUrls,
      mentionedRefs,
    });
    const selectedDocs = documents
      .filter(doc => mentionedRefs.size === 0 || mentionedRefs.has(`doc:${doc.name}`))
      .map(doc => `doc:${doc.name}`);
    const selectedUrls = combinedUrls
      .filter(url => mentionedRefs.size === 0 || mentionedRefs.has(`url:${url}`))
      .map(url => `url:${url}`);
    const contextRefs = [
      ...(diagnosticReportId ? [`diagnostic:${diagnosticReportId}`] : []),
      ...selectedDocs,
      ...selectedUrls,
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

      const inferred = inferModelAndPolicy(text, images.length > 0, availableModelEndpoints, defaultModelEndpoint);
      const upsert = await addToKnowledgeGraph({
        content: contentForKnowledgeGraph,
        context: contextBlock,
        provider: inferred.provider,
        model: inferred.model,
        urls: combinedUrls,
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

    const inferred = inferModelAndPolicy(text, images.length > 0, availableModelEndpoints, defaultModelEndpoint);

    const assistantId = `${Date.now()}-assistant`;
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', proposals: [] }]);

    const apiMessages: FelixApiMessage[] = nextHistory.map(message => {
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
      const response = await sendStream(
        {
          messages: apiMessages,
          provider: inferred.provider,
          model: inferred.model,
          contextBlock,
          diagnosticReportId,
          mcpAdapters: activeConnectorIds,
          enabledConnectors: activeConnectorIds,
          policyMode: inferred.policyMode,
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
      const proposals = Array.isArray(response?.proposals)
        ? response.proposals.filter((item): item is AgentActionProposal => (
          Boolean(item)
          && typeof item === 'object'
          && String((item as any).action_type || '') !== ''
          && String((item as any).id || '') !== ''
        )).map(item => ({
          ...item,
          payload: typeof item.payload === 'object' && item.payload ? item.payload : {},
          result: typeof item.result === 'object' && item.result ? item.result : {},
          metadata: typeof item.metadata === 'object' && item.metadata ? item.metadata : {},
        }))
        : [];
      if (proposals.length > 0) {
        setMessages(prev => prev.map(message => (
          message.id === assistantId
            ? { ...message, proposals }
            : message
        )));
      }
    } catch (error) {
      const message = formatFelixError(error);
      toast({ title: 'Fix-it Felix error', description: message, variant: 'destructive' });
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
    availableModelEndpoints,
    defaultModelEndpoint,
    intent,
    contextUrls,
    activeConnectorIds,
    sendStream,
    toast,
    documents,
    diagnosticReportId,
    mcpAdapters,
  ]);

  const updateProposalInMessage = useCallback((messageId: string, proposal: AgentActionProposal) => {
    setMessages(prev => prev.map(message => {
      if (message.id !== messageId || !Array.isArray(message.proposals)) return message;
      return {
        ...message,
        proposals: message.proposals.map(existing => (existing.id === proposal.id ? proposal : existing)),
      };
    }));
  }, [setMessages]);

  const handleProposalApprove = useCallback(async (messageId: string, proposalId: string) => {
    setProposalBusy(prev => ({ ...prev, [proposalId]: true }));
    try {
      const updated = await aiAgentApi.approveAgentAction(proposalId);
      updateProposalInMessage(messageId, updated);
      if (updated.action_type === 'create_ticket' && updated.status === 'executed') {
        const ticketUuid = String(updated.result?.local_ticket_uuid || '').trim();
        const ticketRef = String(updated.result?.local_ticket_id || '').trim();
        toast({
          title: 'Ticket created',
          description: ticketRef ? `Created ${ticketRef}.` : 'Ticket proposal executed successfully.',
        });
        if (ticketUuid) {
          navigate(`/tickets/${ticketUuid}`);
        }
      } else if (updated.action_type === 'update_ticket' && updated.status === 'executed') {
        const ticketRef = String(updated.payload?.ticket_id || updated.payload?.ticket_ref || '').trim();
        toast({
          title: 'Ticket updated',
          description: ticketRef ? `Updated ${ticketRef}.` : 'Ticket update executed successfully.',
        });
      } else {
        toast({ title: 'Proposal approved', description: 'Action executed successfully.' });
      }
    } catch (error) {
      toast({
        title: 'Approval failed',
        description: error instanceof Error ? error.message : 'Could not approve this proposal.',
        variant: 'destructive',
      });
    } finally {
      setProposalBusy(prev => ({ ...prev, [proposalId]: false }));
    }
  }, [navigate, toast, updateProposalInMessage]);

  const handleProposalReject = useCallback(async (messageId: string, proposalId: string) => {
    setProposalBusy(prev => ({ ...prev, [proposalId]: true }));
    try {
      const updated = await aiAgentApi.rejectAgentAction(proposalId, 'Rejected from chat panel');
      updateProposalInMessage(messageId, updated);
      toast({ title: 'Proposal rejected' });
    } catch (error) {
      toast({
        title: 'Rejection failed',
        description: error instanceof Error ? error.message : 'Could not reject this proposal.',
        variant: 'destructive',
      });
    } finally {
      setProposalBusy(prev => ({ ...prev, [proposalId]: false }));
    }
  }, [toast, updateProposalInMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 sm:-m-6">
      {/* Chat Session Panel */}
      <ChatSessionPanel open={sessionPanelOpen} onOpenChange={setSessionPanelOpen} />

      {/* Header with session controls - always visible */}
      <div className="flex items-center justify-between gap-1 px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => setSessionPanelOpen(true)}
          >
            <PanelLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sessions</span>
            {sessions.length > 0 && (
              <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5">
                {sessions.length}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-primary hover:text-primary"
            onClick={startNewChat}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {isTechnician && (
            <>
              <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">History</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 max-h-[320px] overflow-y-auto p-0" align="end">
                  <div className="p-2 border-b border-border font-medium text-sm">Chat history</div>
                  {history.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No past conversations yet.</div>
                  ) : (
                    <ul className="p-2 space-y-1">
                      {history.map((entry) => (
                        <li key={entry.id} className="flex items-center gap-2 group">
                          <button
                            type="button"
                            className="flex-1 text-left text-sm truncate rounded px-2 py-1.5 hover:bg-accent"
                            onClick={() => {
                              loadFromHistory(entry.id);
                              setHistoryOpen(false);
                            }}
                          >
                            {entry.title}
                          </button>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => removeFromHistory(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="p-2 border-t border-border space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Open shared conversation</div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste shared link or ID"
                        value={sharedLinkInput}
                        onChange={(e) => setSharedLinkInput(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={() => {
                          const raw = sharedLinkInput.trim();
                          let shareId = raw;
                          if (raw.includes('shared=')) {
                            try {
                              const url = new URL(raw.startsWith('http') ? raw : `https://x?${raw.split('?')[1] || ''}`);
                              shareId = url.searchParams.get('shared') || raw;
                            } catch {
                              const q = raw.includes('?') ? raw.split('?')[1] : raw;
                              shareId = new URLSearchParams(q).get('shared') || raw;
                            }
                          }
                          if (shareId) {
                            const shared = loadSharedConversation(shareId);
                            if (shared?.length) {
                              setMessages(shared);
                              setHistoryOpen(false);
                              setSharedLinkInput('');
                              toast({ title: 'Shared conversation loaded' });
                            } else {
                              toast({ title: 'Invalid or expired link', variant: 'destructive' });
                            }
                          }
                        }}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={() => {
                  const url = shareConversation();
                  if (url) {
                    navigator.clipboard.writeText(url);
                    toast({ title: 'Link copied', description: 'Share this link with another technician to open this conversation.' });
                  } else {
                    toast({ title: 'Nothing to share', variant: 'destructive' });
                  }
                }}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </>
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              onClick={startNewChat}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-full w-full max-w-3xl mx-auto gap-6 text-center py-8">
            {/* Session info hint when user has sessions */}
            {sessions.length > 1 && (
              <div className="text-xs text-muted-foreground">
                <button
                  className="hover:text-foreground underline underline-offset-2"
                  onClick={() => setSessionPanelOpen(true)}
                >
                  {sessions.length} chat sessions saved
                </button>
              </div>
            )}
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Hi, I'm Fix-it Felix</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your breakthru AI assistant. Ask about diagnostics, parts, and procedures, or attach visuals and context files.
              </p>
            </div>

            {/* Technicians: show their most recent assigned tickets above the suggestions (compact cards) */}
            {isTechnician && tickets.length > 0 && (
              <div className="w-full flex flex-col items-center text-center">
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-primary" /> Your recent tickets
                </h3>

                <div className="mt-3 w-full">
                  <div className="grid gap-2 sm:grid-cols-2 max-w-2xl mx-auto">
                    {tickets.map(t => (
                      <Button
                        key={t.id}
                        variant="outline"
                        className="flex flex-col items-start gap-1.5 p-2 h-auto text-left border-border hover:border-primary/40 hover:bg-accent/30"
                        onClick={() => navigate(`/tickets/${t.id}`)}
                      >
                        <div className="flex items-start w-full gap-2">
                          {/* Left column: ID + title + customer/location */}
                          <div className="min-w-0 flex-1">
                            <span className="block text-[10px] font-mono text-primary font-semibold truncate">
                              {t.ticket_id}
                            </span>
                            <span className="block text-xs font-medium text-foreground truncate">
                              {t.title || 'Untitled ticket'}
                            </span>
                            <span className="block text-[10px] text-muted-foreground truncate">
                              {t.customer || 'Unknown customer'}
                            </span>
                            <span className="block text-[10px] text-muted-foreground truncate">
                              {t.city || 'Unknown location'}
                            </span>
                          </div>

                          {/* Right wrapper: vertical divider tight to the right column */}
                          <div className="flex items-stretch gap-0.5 flex-shrink-0">
                            <div className="h-[70%] w-px bg-border self-center" />
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] text-muted-foreground">
                                {t.created_at
                                  ? new Date(t.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                              <div className="flex flex-col items-end gap-0.5 text-[9px]">
                                <span
                                  className={cn(
                                    'inline-flex items-center font-medium',
                                    SEVERITY_BADGE_CLASS[t.severity] ?? SEVERITY_BADGE_CLASS[1]
                                  )}
                                >
                                  <span className="mr-1 text-[9px] text-muted-foreground">Severity</span>
                                  {SEVERITY_LABEL[t.severity] ?? `Sev ${t.severity}`}
                                </span>
                                <span
                                  className={cn(
                                    'inline-flex items-center font-medium',
                                    PRIORITY_TEXT_CLASS[t.priority] ?? PRIORITY_TEXT_CLASS[1]
                                  )}
                                >
                                  <span className="mr-1 text-[9px] text-muted-foreground">Priority</span>
                                  {PRIORITY_LABEL_CARD[t.priority] ?? `P${t.priority}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-[10px] text-primary h-6 px-2"
                  onClick={() => navigate('/tickets')}
                >
                  ({totalTicketCount}) View all
                </Button>
              </div>
            )}

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
              {msg.role === 'assistant' && Array.isArray(msg.proposals) && msg.proposals
                .filter(proposal => proposal.action_type === 'create_ticket')
                .map(proposal => {
                  const ticketTitle = String(proposal.payload?.title || 'Proposed Service Ticket');
                  const ticketDescription = String(proposal.payload?.description || '');
                  const diagnosticRef = String(proposal.payload?.diagnostic_report_id || '').trim();
                  const diagnosticPayload = (
                    proposal.payload?.diagnostic_payload && typeof proposal.payload.diagnostic_payload === 'object'
                      ? proposal.payload.diagnostic_payload as Record<string, unknown>
                      : {}
                  );
                  const diagnosticComponent = String(diagnosticPayload.component_name || '').trim();
                  const diagnosticFault = String(diagnosticPayload.fault_code || '').trim();
                  const diagnosticParts = Array.isArray(diagnosticPayload.part_names)
                    ? diagnosticPayload.part_names.map(part => String(part || '').trim()).filter(Boolean).slice(0, 3)
                    : [];
                  const checklistPreview = Array.isArray(proposal.payload?.checklist_preview)
                    ? proposal.payload.checklist_preview as string[]
                    : [];
                  const missingFields = Array.isArray(proposal.payload?.missing_fields)
                    ? proposal.payload.missing_fields as string[]
                    : [];
                  const isBusy = Boolean(proposalBusy[proposal.id]);
                  const statusLabel = String(proposal.status || 'pending').replace(/_/g, ' ');
                  return (
                    <Card key={proposal.id} className="border-border bg-card/80">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TicketIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                            <p className="text-xs font-semibold truncate">{ticketTitle}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">{statusLabel}</Badge>
                        </div>
                        {ticketDescription && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{ticketDescription}</p>
                        )}
                        {(diagnosticRef || diagnosticComponent || diagnosticFault || diagnosticParts.length > 0) && (
                          <p className="text-[11px] text-muted-foreground">
                            Diagnostic source
                            {diagnosticRef ? ` ${diagnosticRef}` : ''}:
                            {' '}
                            {[diagnosticComponent, diagnosticFault, diagnosticParts.join(', ')].filter(Boolean).join(' · ') || 'structured report context'}
                          </p>
                        )}
                        {missingFields.length > 0 && (
                          <p className="text-[11px] text-primary">
                            Missing: {missingFields.join(', ')}
                          </p>
                        )}
                        {checklistPreview.length > 0 && (
                          <div className="rounded-md border border-border bg-background p-2 space-y-1">
                            <p className="text-[10px] font-medium text-muted-foreground">Checklist Preview</p>
                            {checklistPreview.slice(0, 3).map((step, idx) => (
                              <p key={`${proposal.id}-step-${idx}`} className="text-[11px] text-foreground/90">
                                {idx + 1}. {step}
                              </p>
                            ))}
                          </div>
                        )}
                        {proposal.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-[11px] gap-1"
                              onClick={() => handleProposalApprove(msg.id, proposal.id)}
                              disabled={isBusy}
                            >
                              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              {isBusy ? 'Creating...' : 'Confirm'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1"
                              onClick={() => handleProposalReject(msg.id, proposal.id)}
                              disabled={isBusy}
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        ) : proposal.status === 'executed' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1 bg-muted/50 cursor-default"
                              disabled
                            >
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              Ticket Created
                            </Button>
                            {(proposal.result?.local_ticket_uuid || proposal.result?.local_ticket_id) && (
                              <Button
                                size="sm"
                                variant="link"
                                className="h-7 text-[11px] gap-1 text-primary"
                                onClick={() => {
                                  const ticketUuid = String(proposal.result?.local_ticket_uuid || '').trim();
                                  const ticketRef = String(proposal.result?.local_ticket_id || '').trim();
                                  if (ticketUuid) {
                                    navigate(`/tickets/${ticketUuid}`);
                                  } else if (ticketRef) {
                                    toast({
                                      title: 'Ticket Reference',
                                      description: `Ticket ${ticketRef} was created but navigation is not available.`,
                                    });
                                  }
                                }}
                              >
                                <Eye className="h-3 w-3" />
                                {String(proposal.result?.local_ticket_id || 'View Ticket')}
                              </Button>
                            )}
                          </div>
                        ) : proposal.status === 'rejected' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1 bg-muted/50 cursor-default text-muted-foreground"
                              disabled
                            >
                              <XCircle className="h-3 w-3" />
                              Rejected
                            </Button>
                          </div>
                        ) : proposal.status === 'failed' ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1 bg-destructive/10 cursor-default text-destructive"
                                disabled
                              >
                                <AlertCircle className="h-3 w-3" />
                                Failed
                              </Button>
                            </div>
                            {proposal.error && (
                              <p className="text-[10px] text-destructive">{proposal.error}</p>
                            )}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              {msg.role === 'assistant' && Array.isArray(msg.proposals) && msg.proposals
                .filter(proposal => proposal.action_type === 'update_ticket')
                .map(proposal => {
                  const ticketRef = String(proposal.payload?.ticket_id || proposal.payload?.ticket_ref || '').trim();
                  const updateFields = proposal.payload?.updates && typeof proposal.payload.updates === 'object'
                    ? proposal.payload.updates as Record<string, unknown>
                    : {};
                  const updateSummary = Object.entries(updateFields)
                    .filter(([, value]) => value !== undefined && value !== null && value !== '')
                    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${String(value)}`)
                    .slice(0, 5);
                  const reason = String(proposal.payload?.reason || '').trim();
                  const isBusy = Boolean(proposalBusy[proposal.id]);
                  const statusLabel = String(proposal.status || 'pending').replace(/_/g, ' ');
                  return (
                    <Card key={proposal.id} className="border-border bg-card/80">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Edit2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <p className="text-xs font-semibold truncate">
                              Update Ticket {ticketRef || '(no reference)'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">{statusLabel}</Badge>
                        </div>
                        {reason && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{reason}</p>
                        )}
                        {updateSummary.length > 0 && (
                          <div className="rounded-md border border-border bg-background p-2 space-y-1">
                            <p className="text-[10px] font-medium text-muted-foreground">Proposed Changes</p>
                            {updateSummary.map((change, idx) => (
                              <p key={`${proposal.id}-change-${idx}`} className="text-[11px] text-foreground/90 capitalize">
                                {change}
                              </p>
                            ))}
                          </div>
                        )}
                        {proposal.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-[11px] gap-1"
                              onClick={() => handleProposalApprove(msg.id, proposal.id)}
                              disabled={isBusy}
                            >
                              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              {isBusy ? 'Updating...' : 'Apply Update'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1"
                              onClick={() => handleProposalReject(msg.id, proposal.id)}
                              disabled={isBusy}
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        ) : proposal.status === 'executed' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1 bg-muted/50 cursor-default"
                              disabled
                            >
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              Ticket Updated
                            </Button>
                            {(proposal.result?.local_ticket_uuid || ticketRef) && (
                              <Button
                                size="sm"
                                variant="link"
                                className="h-7 text-[11px] gap-1 text-primary"
                                onClick={() => {
                                  const ticketUuid = String(proposal.result?.local_ticket_uuid || '').trim();
                                  if (ticketUuid) {
                                    navigate(`/tickets/${ticketUuid}`);
                                  } else if (ticketRef) {
                                    toast({
                                      title: 'Ticket Updated',
                                      description: `Ticket ${ticketRef} was updated successfully.`,
                                    });
                                  }
                                }}
                              >
                                <Eye className="h-3 w-3" />
                                {ticketRef || 'View Ticket'}
                              </Button>
                            )}
                          </div>
                        ) : proposal.status === 'rejected' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1 bg-muted/50 cursor-default text-muted-foreground"
                              disabled
                            >
                              <XCircle className="h-3 w-3" />
                              Rejected
                            </Button>
                          </div>
                        ) : proposal.status === 'failed' ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1 bg-destructive/10 cursor-default text-destructive"
                                disabled
                              >
                                <AlertCircle className="h-3 w-3" />
                                Failed
                              </Button>
                            </div>
                            {proposal.error && (
                              <p className="text-[10px] text-destructive">{proposal.error}</p>
                            )}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
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

        {(resourceMentions.length > 0 || knowledgeIngestionStatus) && (
          <div className="mb-2 space-y-1.5">
            {resourceMentions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {resourceMentions.map(resource => (
                  <button
                    key={resource.ref}
                    type="button"
                    onClick={() => {
                      setInput(prev => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${resource.mention} `);
                      textareaRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                    title={resource.label}
                  >
                    <AtSign className="h-3 w-3" />
                    {resource.mention}
                  </button>
                ))}
              </div>
            ) : null}
            {knowledgeIngestionStatus ? (
              <div
                className={cn(
                  'rounded-md border px-2 py-1 text-[10px]',
                  knowledgeIngestionStatus.failed > 0 || knowledgeIngestionStatus.rechunkFailed > 0
                    ? 'border-destructive/40 text-destructive'
                    : 'border-primary/30 text-muted-foreground'
                )}
              >
                {`KB ingest: ${knowledgeIngestionStatus.succeeded} ok · ${knowledgeIngestionStatus.failed} failed · ${knowledgeIngestionStatus.skipped} skipped`}
              </div>
            ) : null}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex gap-1 flex-shrink-0">
            <Popover open={resourcesOpen} onOpenChange={setResourcesOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  title="Resources"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,28rem)] p-3 space-y-3">
                <p className="text-xs font-semibold text-foreground">Resources</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Agent Studio</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => navigate('/ai-agents?tab=connectors')}
                  >
                    Open
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => docInputRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Upload docs
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={ingestToKnowledgeBase}
                    disabled={isIngestingKnowledge || (documents.length === 0 && contextUrls.length === 0)}
                  >
                    {isIngestingKnowledge ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                    Ingest
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
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
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addContextUrl}>
                    Add
                  </Button>
                </div>

                {resourceMentions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {resourceMentions.map(resource => (
                      <span
                        key={resource.ref}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px]"
                        title={resource.label}
                      >
                        @{resource.mention}
                        {resource.ref.startsWith('doc:') ? (
                          <button
                            type="button"
                            onClick={() => {
                              const name = resource.ref.slice(4);
                              setDocuments(prev => prev.filter(item => item.name !== name));
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const url = resource.ref.slice(4);
                              setContextUrls(prev => prev.filter(item => item !== url));
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-1.5 border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={attachKnowledge}
                      onCheckedChange={checked => setAttachKnowledge(Boolean(checked))}
                      id="attach-knowledge"
                    />
                    <label htmlFor="attach-knowledge" className="text-xs text-muted-foreground">
                      Attach KB snippets
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                      type="button"
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

                {knowledgeSnippets.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {knowledgeSnippets.map(snippet => {
                      const checked = selectedSnippetIds.includes(snippet.id);
                      return (
                        <label key={snippet.id} className="flex gap-2 p-2 rounded-md border border-border bg-background cursor-pointer">
                          <Checkbox checked={checked} onCheckedChange={value => toggleSnippet(snippet.id, Boolean(value))} />
                          <span className="text-[11px] leading-relaxed text-muted-foreground">
                            <strong className="text-foreground">{snippet.title}</strong>
                            {' '}
                            {snippet.content}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Fix-it Felix anything… (Enter to send, Shift+Enter for new line)"
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
          Fix-it Felix can make mistakes. Always verify critical information.
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
