import { isAxiosError } from 'axios';
import { api } from '@/services/apiClient';
import type {
  KnowledgeDocumentIngestionInput,
  KnowledgeDocumentSourceType,
} from '@/lib/contextIngestion';

export type FelixRole = 'system' | 'user' | 'assistant';

export interface FelixMessagePart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface FelixChatMessage {
  role: FelixRole;
  content: string | FelixMessagePart[];
}

export interface FelixModelEndpoint {
  id: string;
  provider: string;
  model: string;
  label: string;
  active?: boolean;
}

export interface McpAdapterOption {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
}

export interface KnowledgeSnippet {
  id: string;
  title: string;
  content: string;
  source?: string;
  score?: number;
}

export interface StreamFelixChatRequest {
  messages: FelixChatMessage[];
  provider?: string;
  model?: string;
  contextBlock?: string;
  mcpAdapters?: string[];
  enabledConnectors?: string[];
  policyMode?: 'manual' | 'semi_auto' | 'auto';
  intent?: 'qa' | 'triage' | 'ticket_ops' | 'parts_ops' | 'assignment_ops';
  contextRefs?: string[];
  signal?: AbortSignal;
}

export interface FelixChatProposal {
  id: string;
  action_type: 'create_ticket' | 'assign_employee' | 'order_part';
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface StreamFelixChatResult {
  answer: string;
  proposals: FelixChatProposal[];
  telemetry?: Record<string, unknown>;
}

export interface StreamFelixChatHandlers {
  onDelta?: (delta: string, fullText: string) => void;
}

export interface EndpointResult<T> {
  data: T;
  source: 'backend' | 'fallback';
}

export interface KnowledgeGraphUpsertPayload {
  content: string;
  context?: string;
  provider?: string;
  model?: string;
  urls?: string[];
  mcp_adapters?: string[];
  snippets?: Array<Pick<KnowledgeSnippet, 'id' | 'title' | 'content' | 'source'>>;
}

export interface KnowledgeGraphUpsertResult {
  ok: boolean;
  endpoint?: string;
  error?: string;
}

export interface KnowledgeDocumentIngestionOptions {
  rechunkIfNeeded?: boolean;
  chunkSize?: number;
  overlap?: number;
}

export interface KnowledgeDocumentIngestionItemResult {
  clientRef: string;
  title: string;
  sourceType: KnowledgeDocumentSourceType;
  ok: boolean;
  endpoint?: string;
  documentId?: number;
  rechunked?: boolean;
  error?: string;
}

export interface KnowledgeDocumentBatchIngestionResult {
  attempted: number;
  succeeded: number;
  failed: number;
  rechunkAttempted: number;
  rechunkSucceeded: number;
  rechunkFailed: number;
  results: KnowledgeDocumentIngestionItemResult[];
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FELIX_CHAT_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/felix-chat` : '';
const PROMPT_STORAGE_KEY = 'felix_agent_prompt_config_v1';
const DEFAULT_DOMAIN_GUARDRAIL_PROMPT =
  'I can only help with Cummins diagnostics, repair, maintenance, parts, and service operations. Please ask a Cummins-related equipment question.';

const FALLBACK_MODELS: FelixModelEndpoint[] = [
  { id: 'langgraph:gpt-4o-mini', provider: 'langgraph', model: 'gpt-4o-mini', label: 'Backend AI Orchestrator · GPT-4o Mini', active: true },
  { id: 'google:gemini-3-flash-preview', provider: 'google', model: 'gemini-3-flash-preview', label: 'Google · Gemini 3 Flash Preview' },
  { id: 'openai:gpt-4.1-mini', provider: 'openai', model: 'gpt-4.1-mini', label: 'OpenAI · GPT-4.1 Mini' },
  { id: 'anthropic:claude-3-5-sonnet-latest', provider: 'anthropic', model: 'claude-3-5-sonnet-latest', label: 'Anthropic · Claude 3.5 Sonnet' },
  { id: 'ollama:llama3.1:8b', provider: 'ollama', model: 'llama3.1:8b', label: 'Ollama (Local) · Llama 3.1 8B' },
  { id: 'vllm:qwen2.5-7b-instruct', provider: 'vllm', model: 'Qwen/Qwen2.5-7B-Instruct', label: 'vLLM (Local) · Qwen2.5 7B' },
  { id: 'llamacpp:local-model', provider: 'llamacpp', model: 'local-model', label: 'llama.cpp (Local) · OpenAI-compatible' },
];

export class FelixChatError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'FelixChatError';
    this.status = status;
    this.details = details;
  }
}

const unwrapData = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const candidate = data as Record<string, unknown>;
  if (Array.isArray(candidate.results)) return candidate.results;
  if (Array.isArray(candidate.data)) return candidate.data;
  if (Array.isArray(candidate.items)) return candidate.items;
  if (Array.isArray(candidate.endpoints)) return candidate.endpoints;
  if (Array.isArray(candidate.adapters)) return candidate.adapters;
  if (Array.isArray(candidate.snippets)) return candidate.snippets;
  return [];
};

const toNonEmptyString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const toFiniteInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const readPromptOverrides = (): { system_prompt?: string; domain_guardrail_prompt?: string } => {
  try {
    const raw = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const systemPrompt = toNonEmptyString(parsed.system_prompt);
    const guardrailPrompt = toNonEmptyString(parsed.domain_guardrail_prompt);
    return {
      system_prompt: systemPrompt || undefined,
      domain_guardrail_prompt: guardrailPrompt || undefined,
    };
  } catch {
    return {};
  }
};

const DOMAIN_STRONG_KEYWORDS = new Set([
  'cummins',
  'diesel',
  'engine',
  'isx',
  'x15',
  'isb',
  'ism',
  'qsk',
  'aftertreatment',
  'dpf',
  'scr',
  'ecm',
  'injector',
  'injectors',
  'turbo',
  'turbocharger',
  'coolant',
  'oil',
  'fuel',
  'filter',
  'fault',
  'code',
  'diagnostic',
  'diagnostics',
  'maintenance',
  'service',
  'technician',
  'ticket',
  'tickets',
  'parts',
  'repair',
  'troubleshoot',
]);

const DOMAIN_WEAK_KEYWORDS = new Set([
  'replace',
  'inspection',
  'checklist',
  'procedure',
  'component',
  'assembly',
  'pump',
  'valve',
  'sensor',
  'relay',
  'wiring',
  'pressure',
  'temperature',
]);

const tokenizeDomainText = (value: string): string[] =>
  value.toLowerCase().match(/[a-z0-9_+-]+/g) || [];

const isLikelyDomainQuestion = (query: string, contextBlock?: string): boolean => {
  const queryTokens = tokenizeDomainText(query);
  if (queryTokens.length === 0) return false;

  const strongMatches = queryTokens.filter(token => DOMAIN_STRONG_KEYWORDS.has(token));
  if (strongMatches.length >= 1) return true;

  const weakMatches = queryTokens.filter(token => DOMAIN_WEAK_KEYWORDS.has(token));
  const hasTicketPattern = /\b(?:tk-\d+|spn\s*\d+|fmi\s*\d+|p\d{4})\b/i.test(query);
  if (hasTicketPattern || weakMatches.length >= 2) return true;

  if (weakMatches.length >= 1 && contextBlock) {
    const contextTokens = tokenizeDomainText(contextBlock);
    const contextStrongMatches = contextTokens.filter(token => DOMAIN_STRONG_KEYWORDS.has(token));
    if (contextStrongMatches.length >= 1) return true;
  }

  return false;
};

const appendContextToLastUserMessage = (
  messages: FelixChatMessage[],
  contextBlock?: string
): FelixChatMessage[] => {
  if (!contextBlock?.trim()) return messages;
  const updated = [...messages];
  let userIndex = -1;
  for (let i = updated.length - 1; i >= 0; i -= 1) {
    if (updated[i].role === 'user') {
      userIndex = i;
      break;
    }
  }
  if (userIndex === -1) return updated;

  const msg = updated[userIndex];
  if (typeof msg.content === 'string') {
    updated[userIndex] = { ...msg, content: `${msg.content}\n\n${contextBlock}` };
    return updated;
  }
  updated[userIndex] = {
    ...msg,
    content: [...msg.content, { type: 'text', text: `\n\n${contextBlock}` }],
  };
  return updated;
};

const extractLastUserText = (messages: FelixChatMessage[]): string => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== 'user') continue;
    if (typeof msg.content === 'string') {
      const text = msg.content.trim();
      if (text) return text;
      continue;
    }
    const parts = msg.content
      .filter(part => part.type === 'text' && typeof part.text === 'string')
      .map(part => (part.text || '').trim())
      .filter(Boolean);
    if (parts.length) return parts.join('\n');
  }
  return '';
};

const readErrorBody = async (resp: Response): Promise<{ message: string; details?: unknown }> => {
  try {
    const parsed = await resp.json();
    if (parsed && typeof parsed === 'object') {
      const message =
        (typeof parsed.error === 'string' && parsed.error) ||
        (typeof parsed.message === 'string' && parsed.message) ||
        `Request failed (${resp.status})`;
      return { message, details: parsed };
    }
    return { message: `Request failed (${resp.status})` };
  } catch {
    try {
      const text = await resp.text();
      return { message: text || `Request failed (${resp.status})`, details: text };
    } catch {
      return { message: `Request failed (${resp.status})` };
    }
  }
};

export const formatFelixError = (error: unknown): string => {
  if (error instanceof FelixChatError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Could not reach Fix-it Felix. Please try again.';
};

export const streamFelixChat = async (
  request: StreamFelixChatRequest,
  handlers: StreamFelixChatHandlers = {}
): Promise<StreamFelixChatResult> => {
  const provider = (request.provider || '').toLowerCase();
  const query = extractLastUserText(request.messages);
  const promptOverrides = readPromptOverrides();
  if (!isLikelyDomainQuestion(query, request.contextBlock)) {
    const refusal = promptOverrides.domain_guardrail_prompt || DEFAULT_DOMAIN_GUARDRAIL_PROMPT;
    handlers.onDelta?.(refusal, refusal);
    return { answer: refusal, proposals: [] };
  }

  const backendProviders = new Set(['langgraph', 'openai', 'openrouter', 'ollama', 'vllm', 'llamacpp', 'local']);
  if (backendProviders.has(provider)) {
    try {
      const { data } = await api.post('/ai/chat/', {
        query,
        messages: request.messages,
        context: {
          context_block: request.contextBlock || '',
          mcp_adapters: request.mcpAdapters || [],
          enabled_connectors: request.enabledConnectors || request.mcpAdapters || [],
          policy_mode: request.policyMode || 'manual',
          intent: request.intent || 'qa',
          context_refs: request.contextRefs || [],
          ...promptOverrides,
        },
        policy_mode: request.policyMode || 'manual',
        intent: request.intent || 'qa',
        context_refs: request.contextRefs || [],
        provider: provider === 'langgraph' ? 'openai' : provider,
        model: request.model || 'gpt-4o-mini',
        enabled_connectors: request.enabledConnectors || request.mcpAdapters || [],
        mcp_adapters: request.mcpAdapters || [],
      });
      const answer = typeof data?.answer === 'string' ? data.answer : '';
      const proposals = Array.isArray(data?.proposals) ? data.proposals as FelixChatProposal[] : [];
      const telemetry = data?.telemetry && typeof data.telemetry === 'object'
        ? data.telemetry as Record<string, unknown>
        : undefined;
      if (answer) handlers.onDelta?.(answer, answer);
      return { answer, proposals, telemetry };
    } catch (error: unknown) {
      const message = extractApiErrorMessage(error, 'Chat request failed');
      const status = isAxiosError(error) ? error.response?.status : undefined;
      const details = isAxiosError(error) ? error.response?.data : undefined;
      throw new FelixChatError(message, status, details);
    }
  }

  if (!FELIX_CHAT_URL) {
    throw new FelixChatError('Fix-it Felix is not configured.');
  }

  const body = {
    messages: appendContextToLastUserMessage(request.messages, request.contextBlock),
    provider,
    model: request.model,
    context: request.contextBlock,
    mcp_adapters: request.mcpAdapters,
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (SUPABASE_KEY) headers.Authorization = `Bearer ${SUPABASE_KEY}`;

  const resp = await fetch(FELIX_CHAT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: request.signal,
  });

  if (!resp.ok) {
    const err = await readErrorBody(resp);
    throw new FelixChatError(err.message, resp.status, err.details);
  }

  const reader = resp.body?.getReader();
  if (!reader) {
    throw new FelixChatError('Fix-it Felix returned an empty stream.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let done = false;

  while (!done) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;
      if (payload === '[DONE]') {
        done = true;
        break;
      }

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) {
          fullText += delta;
          handlers.onDelta?.(delta, fullText);
        }
      } catch {
        buffer = `${line}\n${buffer}`;
        break;
      }
    }
  }

  return { answer: fullText, proposals: [] };
};

const normalizeModelEndpoints = (raw: unknown): FelixModelEndpoint[] => {
  const entries = unwrapData(raw);
  const directObject = !entries.length && raw && typeof raw === 'object' ? [raw] : [];
  const combined = [...entries, ...directObject];
  const normalized = combined
    .map((item: any, idx) => {
      const provider = toNonEmptyString(item?.provider || item?.vendor || item?.endpoint_provider);
      const model = toNonEmptyString(
        item?.model || item?.model_name || item?.model_identifier || item?.slug || item?.name
      );
      if (!provider || !model) return null;
      const id = toNonEmptyString(item?.id) || `${provider}:${model}:${idx}`;
      const active = Boolean(item?.active ?? item?.is_active ?? item?.default ?? item?.is_default);
      const display = toNonEmptyString(item?.label || item?.display_name || item?.title);
      return {
        id,
        provider,
        model,
        label: display || `${provider} · ${model}`,
        active,
      } satisfies FelixModelEndpoint;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item)) as FelixModelEndpoint[];

  const deduped = normalized.filter((item, idx, all) => (
    all.findIndex(other => other.provider === item.provider && other.model === item.model) === idx
  ));

  return deduped;
};

export const getActiveModelEndpoints = async (): Promise<EndpointResult<FelixModelEndpoint[]>> => {
  try {
    const { data } = await api.get('/ai/model_endpoints/active/');
    const parsed = normalizeModelEndpoints(data);
    const hasLangGraph = parsed.some(model => model.provider === 'langgraph');
    if (!hasLangGraph) {
      parsed.unshift({
        id: 'langgraph:gpt-4o-mini',
        provider: 'langgraph',
        model: 'gpt-4o-mini',
        label: 'Backend AI Orchestrator · GPT-4o Mini',
        active: false,
      });
    }
    if (parsed.length > 0) {
      if (!parsed.some(model => model.active)) parsed[0].active = true;
      return { data: parsed, source: 'backend' };
    }
  } catch {
    // fall through to fallback
  }
  return { data: FALLBACK_MODELS, source: 'fallback' };
};

export const getDefaultModel = (options: FelixModelEndpoint[]): FelixModelEndpoint => {
  const preferredProvider = ['langgraph', 'openai'];
  for (const provider of preferredProvider) {
    const preferred = options.find(option => option.provider === provider);
    if (preferred) return preferred;
  }
  return options.find(option => option.active) || options[0] || FALLBACK_MODELS[0];
};

const normalizeMcpAdapters = (raw: unknown): McpAdapterOption[] => {
  return unwrapData(raw)
    .map((item: any, idx) => {
      const id = toNonEmptyString(item?.id || item?.slug || item?.adapter_id) || `adapter-${idx}`;
      const name = toNonEmptyString(item?.name || item?.adapter_name || item?.title || item?.slug);
      if (!name) return null;
      return {
        id,
        name,
        description: toNonEmptyString(item?.description),
        enabled: item?.enabled ?? item?.is_enabled ?? true,
      } satisfies McpAdapterOption;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item)) as McpAdapterOption[];
};

export const getMcpAdapters = async (): Promise<EndpointResult<McpAdapterOption[]>> => {
  try {
    const { data } = await api.get('/ai/mcp_adapters/');
    return { data: normalizeMcpAdapters(data), source: 'backend' };
  } catch {
    return { data: [], source: 'fallback' };
  }
};

const normalizeKnowledgeSnippets = (raw: unknown): KnowledgeSnippet[] => {
  return unwrapData(raw)
    .map((item: any, idx) => {
      const content = toNonEmptyString(item?.content || item?.snippet || item?.text || item?.body);
      if (!content) return null;
      const id = toNonEmptyString(item?.id) || `snippet-${idx}`;
      return {
        id,
        title: toNonEmptyString(item?.title || item?.name || item?.source || `Snippet ${idx + 1}`),
        content,
        source: toNonEmptyString(item?.source || item?.origin),
        score: typeof item?.score === 'number' ? item.score : undefined,
      } satisfies KnowledgeSnippet;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item)) as KnowledgeSnippet[];
};

const searchKnowledgeViaEndpoint = async (
  endpoint: string,
  query: string,
  limit: number
): Promise<KnowledgeSnippet[]> => {
  try {
    const { data } = await api.get(endpoint, { params: { q: query, query, limit } });
    const snippets = normalizeKnowledgeSnippets(data);
    if (snippets.length > 0) return snippets;
  } catch {
    // continue to post fallback
  }

  const { data } = await api.post(endpoint, { q: query, query, limit });
  return normalizeKnowledgeSnippets(data);
};

export const searchKnowledgeSnippets = async (query: string, limit = 5): Promise<KnowledgeSnippet[]> => {
  if (!query.trim()) return [];
  const candidates = [
    '/ai/knowledge_documents/search/',
    '/ai/knowledge/search/',
    '/ai/knowledge_base/search/',
    '/ai/search/',
  ];

  for (const endpoint of candidates) {
    try {
      const snippets = await searchKnowledgeViaEndpoint(endpoint, query, limit);
      if (snippets.length > 0) return snippets;
    } catch {
      // try next endpoint
    }
  }
  return [];
};

export const addToKnowledgeGraph = async (
  payload: KnowledgeGraphUpsertPayload
): Promise<KnowledgeGraphUpsertResult> => {
  const endpoints = [
    '/ai/knowledge_graph/expand/',
    '/ai/knowledge_graph/add/',
    '/ai/knowledge_graph/ingest/',
    '/ai/knowledge_graph/',
  ];

  for (const endpoint of endpoints) {
    try {
      await api.post(endpoint, {
        ...payload,
        text: payload.content,
      });
      return { ok: true, endpoint };
    } catch (error: unknown) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status && status !== 404 && status < 500) {
        const data = isAxiosError(error) ? error.response?.data : undefined;
        const message = isRecord(data)
          ? toNonEmptyString(data.error) || toNonEmptyString(data.message) || `Knowledge graph request failed (${status})`
          : `Knowledge graph request failed (${status})`;
        return { ok: false, endpoint, error: message };
      }
    }
  }

  return {
    ok: false,
    error: 'Knowledge graph endpoint is unavailable.',
  };
};

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (typeof payload === 'string' && payload.trim()) return payload.trim();
    if (isRecord(payload)) {
      const candidates = [payload.error, payload.message, payload.detail];
      for (const candidate of candidates) {
        const text = toNonEmptyString(candidate);
        if (text) return text;
      }
    }
    if (error.response?.status) return `${fallback} (${error.response.status})`;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

const createKnowledgeDocument = async (
  item: KnowledgeDocumentIngestionInput,
  options: KnowledgeDocumentIngestionOptions
): Promise<{ endpoint: string; documentId: number; chunkingManaged: boolean }> => {
  const createPayload = {
    source_type: item.sourceType,
    source_uri: item.sourceUri || '',
    title: item.title,
    content: item.content,
    metadata: item.metadata || {},
  };

  const ingestPayload: Record<string, unknown> = {
    title: item.title,
    content: item.content,
    metadata: item.metadata || {},
  };
  if (item.sourceType === 'url' && item.sourceUri) {
    ingestPayload.url = item.sourceUri;
  }
  if (typeof options.chunkSize === 'number' && Number.isFinite(options.chunkSize) && options.chunkSize > 0) {
    ingestPayload.chunk_size = Math.max(Math.trunc(options.chunkSize), 1);
  }
  if (typeof options.overlap === 'number' && Number.isFinite(options.overlap) && options.overlap >= 0) {
    ingestPayload.overlap = Math.max(Math.trunc(options.overlap), 0);
  }

  const ingestEndpoints = ['/ai/knowledge_documents/ingest/', '/ai/knowledge_documents/ingest'];
  for (const endpoint of ingestEndpoints) {
    try {
      const { data } = await api.post(endpoint, ingestPayload);
      const topId = isRecord(data) ? toFiniteInteger(data.id) : null;
      const nestedId = isRecord(data) && isRecord(data.document) ? toFiniteInteger(data.document.id) : null;
      const docId = topId || nestedId;
      if (!docId || docId <= 0) {
        throw new FelixChatError('Knowledge ingestion response did not include a valid document id.');
      }
      return { endpoint, documentId: docId, chunkingManaged: true };
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }

  const createEndpoints = ['/ai/knowledge_documents/', '/ai/knowledge_documents'];
  for (const endpoint of createEndpoints) {
    try {
      const { data } = await api.post(endpoint, createPayload);
      const docId = isRecord(data) ? toFiniteInteger(data.id) : null;
      if (!docId || docId <= 0) {
        throw new FelixChatError('Knowledge document response did not include a valid id.');
      }
      return { endpoint, documentId: docId, chunkingManaged: false };
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }

  throw new FelixChatError('Knowledge document endpoint is unavailable.');
};

const triggerKnowledgeDocumentRechunk = async (
  documentId: number,
  options: KnowledgeDocumentIngestionOptions
): Promise<{ ok: boolean; unsupported: boolean; endpoint?: string; error?: string }> => {
  const payload: Record<string, number> = {};
  if (typeof options.chunkSize === 'number' && Number.isFinite(options.chunkSize) && options.chunkSize > 0) {
    payload.chunk_size = Math.max(Math.trunc(options.chunkSize), 1);
  }
  if (typeof options.overlap === 'number' && Number.isFinite(options.overlap) && options.overlap >= 0) {
    payload.overlap = Math.max(Math.trunc(options.overlap), 0);
  }

  const endpoints = [
    `/ai/knowledge_documents/${documentId}/rechunk/`,
    `/ai/knowledge_documents/${documentId}/rechunk`,
  ];

  for (const endpoint of endpoints) {
    try {
      await api.post(endpoint, payload);
      return { ok: true, unsupported: false, endpoint };
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404) continue;
      if (status === 405) return { ok: false, unsupported: true, endpoint };
      return {
        ok: false,
        unsupported: false,
        endpoint,
        error: extractApiErrorMessage(error, 'Failed to rebuild chunks for knowledge document.'),
      };
    }
  }

  return {
    ok: false,
    unsupported: true,
  };
};

export const ingestKnowledgeDocuments = async (
  items: KnowledgeDocumentIngestionInput[],
  options: KnowledgeDocumentIngestionOptions = {}
): Promise<KnowledgeDocumentBatchIngestionResult> => {
  const results: KnowledgeDocumentIngestionItemResult[] = [];
  let succeeded = 0;
  let failed = 0;
  let rechunkAttempted = 0;
  let rechunkSucceeded = 0;
  let rechunkFailed = 0;
  const shouldRechunk = options.rechunkIfNeeded !== false;

  for (const item of items) {
    const result: KnowledgeDocumentIngestionItemResult = {
      clientRef: item.clientRef,
      title: item.title,
      sourceType: item.sourceType,
      ok: false,
    };

    try {
      const created = await createKnowledgeDocument(item, options);
      result.documentId = created.documentId;
      result.endpoint = created.endpoint;

      let itemOk = true;
      if (shouldRechunk && !created.chunkingManaged && item.content.trim()) {
        rechunkAttempted += 1;
        const rechunkResult = await triggerKnowledgeDocumentRechunk(created.documentId, options);
        if (rechunkResult.ok) {
          rechunkSucceeded += 1;
          result.rechunked = true;
          if (rechunkResult.endpoint) result.endpoint = rechunkResult.endpoint;
        } else if (rechunkResult.unsupported) {
          result.rechunked = false;
        } else {
          rechunkFailed += 1;
          itemOk = false;
          result.error = rechunkResult.error || 'Failed to rebuild chunks for knowledge document.';
          if (rechunkResult.endpoint) result.endpoint = rechunkResult.endpoint;
        }
      }

      result.ok = itemOk;
      if (itemOk) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      result.ok = false;
      result.error = extractApiErrorMessage(error, 'Knowledge document ingestion failed.');
      failed += 1;
    }

    results.push(result);
  }

  return {
    attempted: items.length,
    succeeded,
    failed,
    rechunkAttempted,
    rechunkSucceeded,
    rechunkFailed,
    results,
  };
};

export const fallbackModelEndpoints = FALLBACK_MODELS;
