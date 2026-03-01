import axios from 'axios';
import { api } from './apiClient';

export interface AgentPromptConfig {
  system_prompt: string;
  domain_guardrail_prompt: string;
  updated_at: string;
}

export type McpTransport = 'http' | 'https' | 'sse';
export type McpAuthType = 'none' | 'bearer' | 'api_key' | 'oauth2' | 'custom';

export interface AgentMcpAdapter {
  id: string;
  name: string;
  transport: McpTransport;
  base_url: string;
  auth_type: McpAuthType;
  auth_config?: Record<string, unknown>;
  is_enabled: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMcpAdapterPayload {
  name: string;
  base_url: string;
  transport: McpTransport;
  auth_type: McpAuthType;
  auth_token?: string;
  api_key_header?: string;
  api_key_value?: string;
  oauth_client_id?: string;
  oauth_client_secret?: string;
  oauth_scopes?: string;
  oauth_authorize_url?: string;
  oauth_token_url?: string;
  oauth_issuer_url?: string;
  description?: string;
}

export interface McpConnectionTestResult {
  ok: boolean;
  status_code: number;
  error?: string;
  hint?: string;
}

export interface McpOAuthStartResult {
  ok: boolean;
  authorization_url: string;
  state: string;
  expires_in: number;
  status?: string;
  has_access_token?: boolean;
  error?: string;
  hint?: string;
}

export type AgentActionType = 'create_ticket' | 'assign_employee' | 'order_part';
export type AgentActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

export interface AgentActionProposal {
  id: string;
  action_type: AgentActionType;
  status: AgentActionStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error?: string;
  source_query?: string;
  metadata?: Record<string, unknown>;
  created_by_username?: string;
  approved_by_username?: string;
  created_at?: string;
  approved_at?: string;
  executed_at?: string;
}

const DEFAULT_PROMPT_CONFIG: AgentPromptConfig = {
  system_prompt:
    'You are Fix it Felix, an expert Cummins repair copilot. Prioritize fast ticket resolution, clear summaries, and actionable steps.',
  domain_guardrail_prompt:
    'Only answer Cummins diagnostics, repair, maintenance, parts, and service workflow questions. Refuse non-domain topics with a brief redirect.',
  updated_at: new Date().toISOString(),
};

const PROMPT_STORAGE_KEY = 'felix_agent_prompt_config_v1';

const toPromptConfig = (value: unknown): AgentPromptConfig | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const systemPrompt = typeof data.system_prompt === 'string' ? data.system_prompt.trim() : '';
  const guardrail = typeof data.domain_guardrail_prompt === 'string' ? data.domain_guardrail_prompt.trim() : '';
  const updatedAt = typeof data.updated_at === 'string' ? data.updated_at : new Date().toISOString();
  if (!systemPrompt || !guardrail) return null;
  return {
    system_prompt: systemPrompt,
    domain_guardrail_prompt: guardrail,
    updated_at: updatedAt,
  };
};

const loadLocalPromptConfig = (): AgentPromptConfig => {
  try {
    const raw = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (!raw) return DEFAULT_PROMPT_CONFIG;
    const parsed = JSON.parse(raw);
    return toPromptConfig(parsed) || DEFAULT_PROMPT_CONFIG;
  } catch {
    return DEFAULT_PROMPT_CONFIG;
  }
};

const saveLocalPromptConfig = (config: AgentPromptConfig) => {
  localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(config));
};

const toMcpAdapter = (value: unknown): AgentMcpAdapter | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const id = data.id != null ? String(data.id) : '';
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const baseUrl = typeof data.base_url === 'string' ? data.base_url.trim() : '';
  const transportRaw = typeof data.transport === 'string' ? data.transport.trim().toLowerCase() : '';
  const transport = (transportRaw === 'http' || transportRaw === 'https' || transportRaw === 'sse')
    ? transportRaw
    : 'http';
  const metadata = typeof data.metadata === 'object' && data.metadata ? data.metadata as Record<string, unknown> : {};
  const authTypeRaw = typeof data.auth_type === 'string' ? data.auth_type.trim().toLowerCase() : '';
  const auth_type: McpAuthType = (
    authTypeRaw === 'none' ||
    authTypeRaw === 'bearer' ||
    authTypeRaw === 'api_key' ||
    authTypeRaw === 'oauth2' ||
    authTypeRaw === 'custom'
  ) ? authTypeRaw : 'none';
  const auth_config = typeof data.auth_config === 'object' && data.auth_config
    ? data.auth_config as Record<string, unknown>
    : {};
  if (!id || !name || !baseUrl) return null;
  return {
    id,
    name,
    base_url: baseUrl,
    transport,
    auth_type,
    auth_config,
    is_enabled: Boolean(data.is_enabled ?? true),
    description: typeof metadata.description === 'string' ? metadata.description : '',
    created_at: typeof data.created_at === 'string' ? data.created_at : undefined,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : undefined,
  };
};

const toMcpAdapterList = (value: unknown): AgentMcpAdapter[] => {
  const items = Array.isArray(value)
    ? value
    : (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).results))
      ? (value as Record<string, unknown>).results as unknown[]
      : [];
  return items
    .map(toMcpAdapter)
    .filter((item): item is AgentMcpAdapter => Boolean(item));
};

const toAgentAction = (value: unknown): AgentActionProposal | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const id = data.id != null ? String(data.id) : '';
  const actionType = String(data.action_type || '').trim() as AgentActionType;
  const status = String(data.status || '').trim() as AgentActionStatus;
  if (!id || !actionType || !status) return null;
  return {
    id,
    action_type: actionType,
    status,
    payload: (typeof data.payload === 'object' && data.payload ? data.payload : {}) as Record<string, unknown>,
    result: (typeof data.result === 'object' && data.result ? data.result : {}) as Record<string, unknown>,
    error: typeof data.error === 'string' ? data.error : '',
    source_query: typeof data.source_query === 'string' ? data.source_query : '',
    metadata: (typeof data.metadata === 'object' && data.metadata ? data.metadata : {}) as Record<string, unknown>,
    created_by_username: typeof data.created_by_username === 'string' ? data.created_by_username : '',
    approved_by_username: typeof data.approved_by_username === 'string' ? data.approved_by_username : '',
    created_at: typeof data.created_at === 'string' ? data.created_at : undefined,
    approved_at: typeof data.approved_at === 'string' ? data.approved_at : undefined,
    executed_at: typeof data.executed_at === 'string' ? data.executed_at : undefined,
  };
};

const toAgentActionList = (value: unknown): AgentActionProposal[] => {
  const items = Array.isArray(value)
    ? value
    : (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).results))
      ? (value as Record<string, unknown>).results as unknown[]
      : [];
  return items
    .map(toAgentAction)
    .filter((item): item is AgentActionProposal => Boolean(item));
};

export const aiAgentApi = {
  getPromptConfig: async (): Promise<AgentPromptConfig> => {
    try {
      const { data } = await api.get('/ai/agent_prompts/current/');
      const normalized = toPromptConfig(data);
      if (normalized) {
        saveLocalPromptConfig(normalized);
        return normalized;
      }
    } catch {
      // backend endpoint optional for now
    }
    return loadLocalPromptConfig();
  },

  savePromptConfig: async (payload: Pick<AgentPromptConfig, 'system_prompt' | 'domain_guardrail_prompt'>): Promise<AgentPromptConfig> => {
    const normalized: AgentPromptConfig = {
      system_prompt: payload.system_prompt.trim(),
      domain_guardrail_prompt: payload.domain_guardrail_prompt.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data } = await api.put('/ai/agent_prompts/current/', normalized);
      const fromServer = toPromptConfig(data);
      if (fromServer) {
        saveLocalPromptConfig(fromServer);
        return fromServer;
      }
    } catch {
      // backend endpoint optional for now
    }

    saveLocalPromptConfig(normalized);
    return normalized;
  },

  getMcpAdapters: async (): Promise<AgentMcpAdapter[]> => {
    const { data } = await api.get('/ai/mcp_adapters/');
    return toMcpAdapterList(data);
  },

  createMcpAdapter: async (payload: CreateMcpAdapterPayload): Promise<AgentMcpAdapter> => {
    const authConfig: Record<string, unknown> = {};
    if (payload.auth_type === 'bearer' && payload.auth_token?.trim()) {
      authConfig.token = payload.auth_token.trim();
    }
    if (payload.auth_type === 'api_key') {
      authConfig.header_name = (payload.api_key_header || 'X-API-Key').trim();
      authConfig.value = (payload.api_key_value || '').trim();
    }
    if (payload.auth_type === 'oauth2') {
      if (payload.oauth_client_id?.trim()) authConfig.client_id = payload.oauth_client_id.trim();
      if (payload.oauth_client_secret?.trim()) authConfig.client_secret = payload.oauth_client_secret.trim();
      if (payload.oauth_scopes?.trim()) authConfig.scopes = payload.oauth_scopes.trim();
      if (payload.oauth_authorize_url?.trim()) authConfig.authorize_url = payload.oauth_authorize_url.trim();
      if (payload.oauth_token_url?.trim()) authConfig.token_url = payload.oauth_token_url.trim();
      if (payload.oauth_issuer_url?.trim()) authConfig.issuer_url = payload.oauth_issuer_url.trim();
    }

    const body = {
      name: payload.name.trim(),
      base_url: payload.base_url.trim(),
      transport: payload.transport,
      auth_type: payload.auth_type,
      auth_config: authConfig,
      is_enabled: true,
      metadata: payload.description?.trim()
        ? { description: payload.description.trim() }
        : {},
    };

    const { data } = await api.post('/ai/mcp_adapters/', body);
    const normalized = toMcpAdapter(data);
    if (!normalized) throw new Error('MCP adapter creation returned invalid data.');
    return normalized;
  },

  seedDemoMcpAdapters: async (): Promise<{ created: number; updated: number; adapters: AgentMcpAdapter[] }> => {
    const { data } = await api.post('/ai/mcp_adapters/seed_demo/');
    return {
      created: Number(data?.created || 0),
      updated: Number(data?.updated || 0),
      adapters: toMcpAdapterList(data?.adapters || []),
    };
  },

  setMcpAdapterEnabled: async (id: string, is_enabled: boolean): Promise<AgentMcpAdapter> => {
    const { data } = await api.patch(`/ai/mcp_adapters/${id}/`, { is_enabled });
    const normalized = toMcpAdapter(data);
    if (!normalized) throw new Error('MCP adapter update returned invalid data.');
    return normalized;
  },

  testMcpAdapterConnection: async (id: string): Promise<McpConnectionTestResult> => {
    const { data } = await api.post(`/ai/mcp_adapters/${id}/test_connection/`);
    const statusCode = typeof data?.status_code === 'number' ? data.status_code : 0;
    return {
      ok: Boolean(data?.ok),
      status_code: statusCode,
      error: typeof data?.error === 'string' ? data.error : '',
      hint: typeof data?.hint === 'string' ? data.hint : '',
    };
  },

  startMcpAdapterOAuth: async (id: string): Promise<McpOAuthStartResult> => {
    try {
      const { data } = await api.post(`/ai/mcp_adapters/${id}/start_oauth/`);
      return {
        ok: Boolean(data?.ok),
        authorization_url: typeof data?.authorization_url === 'string' ? data.authorization_url : '',
        state: typeof data?.state === 'string' ? data.state : '',
        expires_in: typeof data?.expires_in === 'number' ? data.expires_in : 0,
        error: typeof data?.error === 'string' ? data.error : '',
        hint: typeof data?.hint === 'string' ? data.hint : '',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as Record<string, unknown> | undefined;
        return {
          ok: false,
          authorization_url: '',
          state: '',
          expires_in: 0,
          error: typeof data?.error === 'string' ? data.error : (error.message || 'OAuth start failed.'),
          hint: typeof data?.hint === 'string' ? data.hint : '',
        };
      }
      throw error;
    }
  },

  getMcpAdapterOAuthStatus: async (
    id: string,
    state: string
  ): Promise<McpOAuthStartResult> => {
    try {
      const { data } = await api.get(`/ai/mcp_adapters/${id}/oauth_status/`, {
        params: { state },
      });
      return {
        ok: Boolean(data?.ok),
        authorization_url: '',
        state,
        expires_in: 0,
        status: typeof data?.status === 'string' ? data.status : '',
        has_access_token: Boolean(data?.has_access_token),
        error: typeof data?.error === 'string' ? data.error : '',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as Record<string, unknown> | undefined;
        return {
          ok: false,
          authorization_url: '',
          state,
          expires_in: 0,
          status: typeof data?.status === 'string' ? data.status : '',
          has_access_token: Boolean(data?.has_access_token),
          error: typeof data?.error === 'string' ? data.error : (error.message || 'OAuth status check failed.'),
        };
      }
      throw error;
    }
  },

  saveMcpAdapterOAuthToken: async (
    id: string,
    payload: { access_token: string; refresh_token?: string }
  ): Promise<{ ok: boolean; id: string; has_access_token: boolean }> => {
    const body = {
      access_token: payload.access_token.trim(),
      refresh_token: (payload.refresh_token || '').trim(),
    };
    try {
      const { data } = await api.post(`/ai/mcp_adapters/${id}/oauth_token/`, body);
      return {
        ok: Boolean(data?.ok),
        id: String(data?.id || id),
        has_access_token: Boolean(data?.has_access_token),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as Record<string, unknown> | undefined;
        const message = typeof data?.error === 'string'
          ? data.error
          : typeof data?.detail === 'string'
            ? data.detail
            : error.message;
        throw new Error(message || 'OAuth token save failed.');
      }
      throw error;
    }
  },

  getAgentActions: async (status?: AgentActionStatus): Promise<AgentActionProposal[]> => {
    const { data } = await api.get('/ai/agent_actions/', {
      params: status ? { status } : {},
    });
    return toAgentActionList(data);
  },

  approveAgentAction: async (id: string): Promise<AgentActionProposal> => {
    const { data } = await api.post(`/ai/agent_actions/${id}/approve/`);
    const normalized = toAgentAction(data);
    if (!normalized) throw new Error('Approval returned invalid action response.');
    return normalized;
  },

  rejectAgentAction: async (id: string, reason = ''): Promise<AgentActionProposal> => {
    const { data } = await api.post(`/ai/agent_actions/${id}/reject/`, { reason });
    const normalized = toAgentAction(data);
    if (!normalized) throw new Error('Rejection returned invalid action response.');
    return normalized;
  },
};
