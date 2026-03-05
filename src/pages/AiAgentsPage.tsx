import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AgentActionProposal,
  AgentActionType,
  AgentMcpAdapter,
  CreateMcpAdapterPayload,
  McpAuthType,
  McpConnectionTestResult,
  McpTransport,
  aiAgentApi,
} from '@/services/aiAgentApi';
import { ticketApi, Ticket } from '@/services/ticketApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Bot,
  Cable,
  CircleAlert,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';

const ACTIVE_STATUSES = new Set(['open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_approval']);
const POLICY_STORAGE_KEY = 'felix_default_policy_mode_v1';

type StudioTab = 'overview' | 'actions' | 'settings';
type ActionView = 'pending' | 'history';
type RiskLevel = 'all' | 'low' | 'medium' | 'high';
type PolicyMode = 'manual' | 'semi_auto' | 'auto';

type PromptDraft = {
  system_prompt: string;
  domain_guardrail_prompt: string;
};

const DEFAULT_POLICY: PolicyMode = 'manual';

const avg = (values: number[]) => {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const toTimestamp = (value?: string): number => {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const getRiskLevel = (action: AgentActionProposal): 'low' | 'medium' | 'high' => {
  const risk = String(action.metadata?.risk_level || '').toLowerCase();
  if (risk === 'low' || risk === 'medium' || risk === 'high') return risk;
  return 'medium';
};

const riskWeight: Record<'low' | 'medium' | 'high', number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const hasOAuthToken = (adapter: AgentMcpAdapter): boolean => {
  const config = (adapter.auth_config || {}) as Record<string, unknown>;
  const accessToken = typeof config.access_token === 'string' ? config.access_token : '';
  const token = typeof config.token === 'string' ? config.token : '';
  return Boolean(accessToken || token);
};

const getActionTitle = (actionType: AgentActionType): string => {
  if (actionType === 'create_ticket') return 'Create Ticket';
  if (actionType === 'assign_employee') return 'Assign Employee';
  return 'Order Part';
};

const mapRequestedTab = (value: string | null): StudioTab => {
  if (value === 'overview' || value === 'actions' || value === 'settings') return value;
  if (value === 'approvals') return 'actions';
  if (value === 'connectors' || value === 'prompt-studio') return 'settings';
  if (value === 'runtime' || value === 'learning') return 'overview';
  return 'overview';
};

const emptyMcpDraft = (): CreateMcpAdapterPayload => ({
  name: '',
  base_url: '',
  transport: 'http',
  auth_type: 'none',
  auth_token: '',
  api_key_header: 'X-API-Key',
  api_key_value: '',
  oauth_client_id: '',
  oauth_client_secret: '',
  oauth_scopes: '',
  oauth_authorize_url: '',
  oauth_token_url: '',
  oauth_issuer_url: '',
  description: '',
});

export default function AiAgentsPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<StudioTab>(mapRequestedTab(requestedTab));
  const [actionView, setActionView] = useState<ActionView>('pending');
  const [actionTypeFilter, setActionTypeFilter] = useState<'all' | AgentActionType>('all');
  const [riskFilter, setRiskFilter] = useState<RiskLevel>('all');
  const [actionSearch, setActionSearch] = useState('');
  const [connectorSearch, setConnectorSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [mcpAdapters, setMcpAdapters] = useState<AgentMcpAdapter[]>([]);
  const [agentActions, setAgentActions] = useState<AgentActionProposal[]>([]);

  const [promptDraft, setPromptDraft] = useState<PromptDraft>({
    system_prompt: '',
    domain_guardrail_prompt: '',
  });
  const [promptUpdatedAt, setPromptUpdatedAt] = useState('');

  const [policyDraft, setPolicyDraft] = useState<PolicyMode>(() => {
    const stored = (localStorage.getItem(POLICY_STORAGE_KEY) || '').trim().toLowerCase();
    if (stored === 'manual' || stored === 'semi_auto' || stored === 'auto') return stored;
    return DEFAULT_POLICY;
  });

  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savingMcp, setSavingMcp] = useState(false);
  const [togglingMcpId, setTogglingMcpId] = useState<string | null>(null);
  const [testingMcpId, setTestingMcpId] = useState<string | null>(null);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  const [startingOauthMcpId, setStartingOauthMcpId] = useState<string | null>(null);
  const [oauthPendingByAdapter, setOauthPendingByAdapter] = useState<Record<string, boolean>>({});
  const [connectionResults, setConnectionResults] = useState<Record<string, McpConnectionTestResult>>({});
  const [oauthLinks, setOauthLinks] = useState<Record<string, string>>({});

  const [isAddConnectorOpen, setIsAddConnectorOpen] = useState(false);
  const [mcpDraft, setMcpDraft] = useState<CreateMcpAdapterPayload>(emptyMcpDraft());

  const syncTabToUrl = (tab: StudioTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'overview') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  };

  const load = async () => {
    setLoading(true);
    try {
      const [allTickets, promptConfig, adapters, actions] = await Promise.all([
        ticketApi.getAll(),
        aiAgentApi.getPromptConfig(),
        aiAgentApi.getMcpAdapters().catch(() => []),
        aiAgentApi.getAgentActions().catch(() => []),
      ]);
      setTickets(allTickets);
      setPromptDraft({
        system_prompt: promptConfig.system_prompt,
        domain_guardrail_prompt: promptConfig.domain_guardrail_prompt,
      });
      setPromptUpdatedAt(promptConfig.updated_at || '');
      setMcpAdapters(adapters);
      setAgentActions(actions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setActiveTab(mapRequestedTab(requestedTab));
  }, [requestedTab]);

  const activeTickets = useMemo(
    () => tickets.filter(ticket => ACTIVE_STATUSES.has(ticket.status)),
    [tickets]
  );

  const criticalActive = useMemo(
    () => activeTickets.filter(ticket => ticket.priority >= 4),
    [activeTickets]
  );

  const completedTickets = useMemo(
    () => tickets.filter(ticket => ticket.status === 'completed'),
    [tickets]
  );

  const avgEta = useMemo(
    () => avg(activeTickets.map(ticket => Number(ticket.estimated_resolution_time_minutes || 0)).filter(value => value > 0)),
    [activeTickets]
  );

  const avgActual = useMemo(
    () => avg(completedTickets.map(ticket => Number(ticket.actual_resolution_time_minutes || 0)).filter(value => value > 0)),
    [completedTickets]
  );

  const pendingActions = useMemo(
    () => agentActions.filter(action => action.status === 'pending'),
    [agentActions]
  );

  const historyActions = useMemo(
    () => agentActions.filter(action => action.status !== 'pending'),
    [agentActions]
  );

  const enabledConnectorsCount = useMemo(
    () => mcpAdapters.filter(adapter => adapter.is_enabled).length,
    [mcpAdapters]
  );

  const oauthNeedsAuthCount = useMemo(
    () => mcpAdapters.filter(adapter => adapter.auth_type === 'oauth2' && !hasOAuthToken(adapter)).length,
    [mcpAdapters]
  );

  const failingConnectorCount = useMemo(
    () => mcpAdapters.filter(adapter => connectionResults[adapter.id] && !connectionResults[adapter.id].ok).length,
    [mcpAdapters, connectionResults]
  );

  const highRiskPendingActions = useMemo(
    () => pendingActions.filter(action => getRiskLevel(action) === 'high').slice(0, 5),
    [pendingActions]
  );

  const filteredConnectors = useMemo(() => {
    const query = connectorSearch.trim().toLowerCase();
    if (!query) return mcpAdapters;
    return mcpAdapters.filter(adapter => {
      const haystack = [adapter.name, adapter.base_url, adapter.description || '', adapter.auth_type]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [mcpAdapters, connectorSearch]);

  const filteredActions = useMemo(() => {
    const source = actionView === 'pending' ? pendingActions : historyActions;
    const query = actionSearch.trim().toLowerCase();

    const filtered = source.filter(action => {
      if (actionTypeFilter !== 'all' && action.action_type !== actionTypeFilter) return false;
      if (riskFilter !== 'all' && getRiskLevel(action) !== riskFilter) return false;
      if (!query) return true;

      const payload = JSON.stringify(action.payload || {}).toLowerCase();
      const sourceQuery = (action.source_query || '').toLowerCase();
      const actionTypeLabel = getActionTitle(action.action_type).toLowerCase();
      return payload.includes(query) || sourceQuery.includes(query) || actionTypeLabel.includes(query);
    });

    return filtered.sort((a, b) => {
      if (actionView === 'pending') {
        const riskDiff = riskWeight[getRiskLevel(b)] - riskWeight[getRiskLevel(a)];
        if (riskDiff !== 0) return riskDiff;
        return toTimestamp(a.created_at) - toTimestamp(b.created_at);
      }
      const aTs = toTimestamp(a.executed_at) || toTimestamp(a.approved_at) || toTimestamp(a.created_at);
      const bTs = toTimestamp(b.executed_at) || toTimestamp(b.approved_at) || toTimestamp(b.created_at);
      return bTs - aTs;
    });
  }, [actionView, actionSearch, actionTypeFilter, riskFilter, pendingActions, historyActions]);

  const savePromptConfig = async () => {
    if (!promptDraft.system_prompt.trim() || !promptDraft.domain_guardrail_prompt.trim()) {
      toast({
        title: 'Prompt fields are required',
        description: 'System prompt and domain guardrail prompt cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setSavingPrompt(true);
    try {
      const saved = await aiAgentApi.savePromptConfig(promptDraft);
      setPromptDraft({
        system_prompt: saved.system_prompt,
        domain_guardrail_prompt: saved.domain_guardrail_prompt,
      });
      setPromptUpdatedAt(saved.updated_at || new Date().toISOString());
      toast({
        title: 'Prompts updated',
        description: 'Fix it Felix runtime prompts are saved.',
      });
    } catch (error) {
      toast({
        title: 'Prompt save failed',
        description: error instanceof Error ? error.message : 'Could not save prompt settings.',
        variant: 'destructive',
      });
    } finally {
      setSavingPrompt(false);
    }
  };

  const savePolicyConfig = async () => {
    setSavingPolicy(true);
    try {
      localStorage.setItem(POLICY_STORAGE_KEY, policyDraft);
      toast({
        title: 'Policy updated',
        description: `Default execution policy set to ${policyDraft.replace('_', ' ')}.`,
      });
    } finally {
      setSavingPolicy(false);
    }
  };

  const createMcpAdapter = async () => {
    const name = mcpDraft.name.trim();
    const baseUrl = mcpDraft.base_url.trim();
    if (!name || !baseUrl) {
      toast({
        title: 'Missing connector fields',
        description: 'Connector name and base URL are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      new URL(baseUrl);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid absolute base URL.',
        variant: 'destructive',
      });
      return;
    }

    if (mcpDraft.auth_type === 'bearer' && !mcpDraft.auth_token?.trim()) {
      toast({
        title: 'Bearer token required',
        description: 'Provide a bearer token for bearer-auth connectors.',
        variant: 'destructive',
      });
      return;
    }

    if (mcpDraft.auth_type === 'api_key') {
      if (!mcpDraft.api_key_header?.trim() || !mcpDraft.api_key_value?.trim()) {
        toast({
          title: 'API key settings required',
          description: 'Provide both header name and API key value.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (mcpDraft.auth_type === 'oauth2' && !mcpDraft.oauth_client_id?.trim()) {
      toast({
        title: 'OAuth client ID required',
        description: 'Provide OAuth client ID for OAuth 2.0 connectors.',
        variant: 'destructive',
      });
      return;
    }

    setSavingMcp(true);
    try {
      const created = await aiAgentApi.createMcpAdapter({
        name,
        base_url: baseUrl,
        transport: mcpDraft.transport,
        auth_type: mcpDraft.auth_type,
        auth_token: mcpDraft.auth_token,
        api_key_header: mcpDraft.api_key_header,
        api_key_value: mcpDraft.api_key_value,
        oauth_client_id: mcpDraft.oauth_client_id,
        oauth_client_secret: mcpDraft.oauth_client_secret,
        oauth_scopes: mcpDraft.oauth_scopes,
        oauth_authorize_url: mcpDraft.oauth_authorize_url,
        oauth_token_url: mcpDraft.oauth_token_url,
        oauth_issuer_url: mcpDraft.oauth_issuer_url,
        description: mcpDraft.description?.trim(),
      });
      setMcpAdapters(prev => [created, ...prev]);
      setMcpDraft(emptyMcpDraft());
      setIsAddConnectorOpen(false);
      toast({
        title: 'Connector added',
        description: `${created.name} is ready for Fix it Felix runtime.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to add connector',
        description: error instanceof Error ? error.message : 'Could not create connector.',
        variant: 'destructive',
      });
    } finally {
      setSavingMcp(false);
    }
  };

  const testMcpAdapter = async (adapter: AgentMcpAdapter) => {
    setTestingMcpId(adapter.id);
    try {
      const result = await aiAgentApi.testMcpAdapterConnection(adapter.id);
      setConnectionResults(prev => ({ ...prev, [adapter.id]: result }));
      toast({
        title: result.ok ? 'Connector healthy' : 'Connector check failed',
        description: result.ok
          ? `${adapter.name} responded with HTTP ${result.status_code}.`
          : (result.hint || result.error || `HTTP ${result.status_code}`),
        variant: result.ok ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Connector test failed',
        description: error instanceof Error ? error.message : 'Could not validate connector.',
        variant: 'destructive',
      });
    } finally {
      setTestingMcpId(null);
    }
  };

  const testEnabledConnectors = async () => {
    const enabled = mcpAdapters.filter(adapter => adapter.is_enabled);
    if (enabled.length === 0) {
      toast({ title: 'No enabled connectors', description: 'Enable at least one connector to run health checks.' });
      return;
    }
    for (const adapter of enabled) {
      // Intentionally sequential to avoid flooding external services.
      // eslint-disable-next-line no-await-in-loop
      await testMcpAdapter(adapter);
    }
  };

  const toggleMcpAdapter = async (adapter: AgentMcpAdapter, enabled: boolean) => {
    setTogglingMcpId(adapter.id);
    try {
      const updated = await aiAgentApi.setMcpAdapterEnabled(adapter.id, enabled);
      setMcpAdapters(prev => prev.map(item => (item.id === adapter.id ? updated : item)));
    } catch (error) {
      toast({
        title: 'Failed to update connector',
        description: error instanceof Error ? error.message : 'Could not update connector state.',
        variant: 'destructive',
      });
    } finally {
      setTogglingMcpId(null);
    }
  };

  const seedDemoConnectors = async () => {
    setSavingMcp(true);
    try {
      const result = await aiAgentApi.seedDemoMcpAdapters();
      setMcpAdapters(result.adapters);
      toast({
        title: 'Demo connectors ready',
        description: `Created ${result.created}, updated ${result.updated}.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to seed connectors',
        description: error instanceof Error ? error.message : 'Could not create demo connector set.',
        variant: 'destructive',
      });
    } finally {
      setSavingMcp(false);
    }
  };

  const approveAction = async (id: string) => {
    setUpdatingActionId(id);
    try {
      const updated = await aiAgentApi.approveAgentAction(id);
      setAgentActions(prev => prev.map(item => (item.id === id ? updated : item)));
      toast({
        title: 'Action approved',
        description: 'Proposal approved and executed through configured connectors.',
      });
    } catch (error) {
      toast({
        title: 'Approval failed',
        description: error instanceof Error ? error.message : 'Could not approve action.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingActionId(null);
    }
  };

  const rejectAction = async (id: string) => {
    setUpdatingActionId(id);
    try {
      const updated = await aiAgentApi.rejectAgentAction(id, 'Rejected from Agent Studio queue.');
      setAgentActions(prev => prev.map(item => (item.id === id ? updated : item)));
      toast({
        title: 'Action rejected',
        description: 'Proposal removed from execution queue.',
      });
    } catch (error) {
      toast({
        title: 'Rejection failed',
        description: error instanceof Error ? error.message : 'Could not reject action.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingActionId(null);
    }
  };

  const pollMcpOAuthStatus = async (adapter: AgentMcpAdapter, state: string, attempt = 0) => {
    const MAX_ATTEMPTS = 100;
    const POLL_DELAY_MS = 1500;
    const result = await aiAgentApi.getMcpAdapterOAuthStatus(adapter.id, state);

    if (result.status === 'success' && result.has_access_token) {
      const refreshed = await aiAgentApi.getMcpAdapters().catch(() => []);
      setMcpAdapters(refreshed);
      setOauthPendingByAdapter(prev => ({ ...prev, [adapter.id]: false }));
      toast({
        title: 'OAuth connected',
        description: `${adapter.name} is now authorized.`,
      });
      return;
    }

    if (result.status === 'error' || result.status === 'expired') {
      setOauthPendingByAdapter(prev => ({ ...prev, [adapter.id]: false }));
      throw new Error(result.error || 'OAuth authorization failed.');
    }

    if (attempt >= MAX_ATTEMPTS) {
      setOauthPendingByAdapter(prev => ({ ...prev, [adapter.id]: false }));
      throw new Error('OAuth authorization timed out. Start again.');
    }

    window.setTimeout(() => {
      pollMcpOAuthStatus(adapter, state, attempt + 1).catch(error => {
        toast({
          title: 'OAuth did not complete',
          description: error instanceof Error ? error.message : 'OAuth flow ended with an error.',
          variant: 'destructive',
        });
      });
    }, POLL_DELAY_MS);
  };

  const startMcpOAuth = async (adapter: AgentMcpAdapter) => {
    setStartingOauthMcpId(adapter.id);
    try {
      const result = await aiAgentApi.startMcpAdapterOAuth(adapter.id);
      if (!result.ok || !result.authorization_url || !result.state) {
        throw new Error(result.hint || result.error || 'Could not start OAuth.');
      }
      setOauthLinks(prev => ({ ...prev, [adapter.id]: result.authorization_url }));
      setOauthPendingByAdapter(prev => ({ ...prev, [adapter.id]: true }));
      window.open(result.authorization_url, '_blank', 'noopener,noreferrer');
      toast({
        title: 'OAuth started',
        description: 'Complete provider login in the popup. Authorization will sync automatically.',
      });
      pollMcpOAuthStatus(adapter, result.state).catch(error => {
        toast({
          title: 'OAuth did not complete',
          description: error instanceof Error ? error.message : 'OAuth flow ended with an error.',
          variant: 'destructive',
        });
      });
    } catch (error) {
      toast({
        title: 'OAuth start failed',
        description: error instanceof Error ? error.message : 'Could not start OAuth flow.',
        variant: 'destructive',
      });
      setOauthPendingByAdapter(prev => ({ ...prev, [adapter.id]: false }));
    } finally {
      setStartingOauthMcpId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Agent Studio</h1>
          <p className="text-muted-foreground text-sm">
            Admin operations center for approvals, connector health, prompts, and runtime defaults.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value => {
          if (value !== 'overview' && value !== 'actions' && value !== 'settings') return;
          setActiveTab(value);
          syncTabToUrl(value);
        }}
      >
        <TabsList className="grid w-full grid-cols-3 md:w-[520px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="settings">Integrations & Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-semibold mt-1">{pendingActions.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Enabled Connectors</p>
                <p className="text-2xl font-semibold mt-1">{enabledConnectorsCount}/{mcpAdapters.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">OAuth Needs Auth</p>
                <p className="text-2xl font-semibold mt-1 text-primary">{oauthNeedsAuthCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Connector Failures</p>
                <p className="text-2xl font-semibold mt-1 text-destructive">{failingConnectorCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CircleAlert className="h-4 w-4 text-primary" />
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">High-risk pending actions</p>
                  {highRiskPendingActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No high-risk pending actions.</p>
                  ) : (
                    <div className="space-y-2">
                      {highRiskPendingActions.map(action => (
                        <div key={action.id} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{getActionTitle(action.action_type)}</p>
                            <Badge className="text-[10px]" variant="outline">risk: {getRiskLevel(action)}</Badge>
                          </div>
                          {action.source_query ? (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{action.source_query}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Connector status</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="text-sm">Failing last health check</span>
                      <span className="text-sm font-medium">{failingConnectorCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="text-sm">OAuth connectors awaiting auth</span>
                      <span className="text-sm font-medium">{oauthNeedsAuthCount}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  Operations Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active tickets</p>
                    <p className="text-xl font-semibold mt-1">{activeTickets.length}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Critical active</p>
                    <p className="text-xl font-semibold mt-1 text-primary">{criticalActive.length}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg ETA (min)</p>
                    <p className="text-xl font-semibold mt-1">{avgEta || '—'}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg actual (min)</p>
                    <p className="text-xl font-semibold mt-1">{avgActual || '—'}</p>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Last prompt update: {promptUpdatedAt ? new Date(promptUpdatedAt).toLocaleString() : 'Not available'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => { setActiveTab('actions'); syncTabToUrl('actions'); }}>
                    Review pending approvals
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={testEnabledConnectors}>
                    Run connector health checks
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => { setActiveTab('settings'); syncTabToUrl('settings'); }}>
                    Open settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Agent Action Queue
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {pendingActions.length} pending
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={actionView === 'pending' ? 'default' : 'outline'}
                  className="text-xs"
                  onClick={() => setActionView('pending')}
                >
                  Pending
                </Button>
                <Button
                  size="sm"
                  variant={actionView === 'history' ? 'default' : 'outline'}
                  className="text-xs"
                  onClick={() => setActionView('history')}
                >
                  History
                </Button>
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                <div className="md:col-span-1">
                  <Select value={actionTypeFilter} onValueChange={value => setActionTypeFilter(value as 'all' | AgentActionType)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Action type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All action types</SelectItem>
                      <SelectItem value="create_ticket">Create Ticket</SelectItem>
                      <SelectItem value="assign_employee">Assign Employee</SelectItem>
                      <SelectItem value="order_part">Order Part</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1">
                  <Select value={riskFilter} onValueChange={value => setRiskFilter(value as RiskLevel)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Risk level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All risk levels</SelectItem>
                      <SelectItem value="high">High risk</SelectItem>
                      <SelectItem value="medium">Medium risk</SelectItem>
                      <SelectItem value="low">Low risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    className="h-8 text-xs pl-8"
                    placeholder="Search by source query or payload"
                    value={actionSearch}
                    onChange={event => setActionSearch(event.target.value)}
                  />
                </div>
              </div>

              {filteredActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No actions match current filters.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredActions.map(action => {
                    const risk = getRiskLevel(action);
                    const requiresApproval = Boolean(action.metadata?.requires_approval ?? true);
                    return (
                      <div key={action.id} className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{getActionTitle(action.action_type)}</p>
                            <Badge variant={action.status === 'executed' ? 'default' : 'outline'} className="text-[10px] uppercase">
                              {action.status}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] uppercase">risk: {risk}</Badge>
                            <Badge variant="outline" className="text-[10px] uppercase">{requiresApproval ? 'approval required' : 'auto'}</Badge>
                          </div>
                          {action.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => approveAction(action.id)}
                                disabled={updatingActionId === action.id}
                              >
                                {updatingActionId === action.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                Approve & Execute
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => rejectAction(action.id)}
                                disabled={updatingActionId === action.id}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        {action.source_query ? (
                          <p className="text-xs text-muted-foreground line-clamp-2">From chat: {action.source_query}</p>
                        ) : null}

                        <p className="text-xs text-muted-foreground">
                          Created {action.created_at ? new Date(action.created_at).toLocaleString() : 'just now'}
                          {action.approved_by_username ? ` · Reviewed by ${action.approved_by_username}` : ''}
                        </p>

                        {action.error ? (
                          <p className="text-xs text-destructive">{action.error}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Cable className="h-4 w-4 text-primary" />
                  Connectors
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={seedDemoConnectors} disabled={savingMcp}>
                    {savingMcp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Seed demo
                  </Button>
                  <Button size="sm" className="gap-1 text-xs bg-primary hover:bg-primary/90" onClick={() => setIsAddConnectorOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add connector
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    className="h-8 text-xs pl-8"
                    placeholder="Search connectors"
                    value={connectorSearch}
                    onChange={event => setConnectorSearch(event.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={testEnabledConnectors}>
                  Test enabled connectors
                </Button>
              </div>

              {filteredConnectors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No connectors found for current filters.</p>
              ) : (
                <div className="space-y-2">
                  {filteredConnectors.map(adapter => {
                    const testResult = connectionResults[adapter.id];
                    const oauthConnected = adapter.auth_type !== 'oauth2' || hasOAuthToken(adapter);
                    return (
                      <div key={adapter.id} className="rounded-md border border-border bg-muted/20 px-3 py-3 flex flex-col gap-2">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{adapter.name}</p>
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{adapter.transport}</Badge>
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">auth:{adapter.auth_type}</Badge>
                              <Badge variant={adapter.is_enabled ? 'default' : 'secondary'} className="text-[10px]">
                                {adapter.is_enabled ? 'enabled' : 'disabled'}
                              </Badge>
                              {adapter.auth_type === 'oauth2' ? (
                                <Badge variant={oauthConnected ? 'default' : 'outline'} className="text-[10px]">
                                  {oauthConnected ? 'oauth connected' : 'oauth pending'}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{adapter.base_url}</p>
                            {adapter.description ? <p className="text-xs text-muted-foreground">{adapter.description}</p> : null}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              onClick={() => testMcpAdapter(adapter)}
                              disabled={testingMcpId === adapter.id}
                            >
                              {testingMcpId === adapter.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                              Test
                            </Button>

                            {adapter.auth_type === 'oauth2' ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => startMcpOAuth(adapter)}
                                disabled={startingOauthMcpId === adapter.id || oauthPendingByAdapter[adapter.id]}
                              >
                                {startingOauthMcpId === adapter.id || oauthPendingByAdapter[adapter.id]
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : null}
                                {oauthPendingByAdapter[adapter.id] ? 'Authorizing...' : (oauthConnected ? 'Reconnect OAuth' : 'Connect OAuth')}
                              </Button>
                            ) : null}

                            <Label className="text-xs">Enabled</Label>
                            <Switch
                              checked={adapter.is_enabled}
                              onCheckedChange={checked => toggleMcpAdapter(adapter, Boolean(checked))}
                              disabled={togglingMcpId === adapter.id}
                            />
                          </div>
                        </div>

                        {testResult ? (
                          <p className={`text-xs ${testResult.ok ? 'text-emerald-500' : 'text-destructive'}`}>
                            {testResult.ok
                              ? `Connection OK (HTTP ${testResult.status_code})`
                              : `Connection failed (HTTP ${testResult.status_code || 0})${testResult.hint ? ` · ${testResult.hint}` : (testResult.error ? ` · ${testResult.error}` : '')}`}
                          </p>
                        ) : null}

                        {adapter.auth_type === 'oauth2' && oauthLinks[adapter.id] ? (
                          <a
                            href={oauthLinks[adapter.id]}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline underline-offset-2"
                          >
                            Open latest authorization URL
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  Prompt & Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">System Prompt</Label>
                  <Textarea
                    value={promptDraft.system_prompt}
                    onChange={event => setPromptDraft(prev => ({ ...prev, system_prompt: event.target.value }))}
                    rows={6}
                    className="bg-background text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Domain Guardrail Prompt</Label>
                  <Textarea
                    value={promptDraft.domain_guardrail_prompt}
                    onChange={event => setPromptDraft(prev => ({ ...prev, domain_guardrail_prompt: event.target.value }))}
                    rows={4}
                    className="bg-background text-sm"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Last updated: {promptUpdatedAt ? new Date(promptUpdatedAt).toLocaleString() : 'Not available'}
                  </p>
                  <Button onClick={savePromptConfig} className="gap-2 bg-primary hover:bg-primary/90" disabled={savingPrompt || loading}>
                    {savingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save prompts
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  Automation Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Default Execution Policy</Label>
                  <Select value={policyDraft} onValueChange={value => setPolicyDraft(value as PolicyMode)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual approvals</SelectItem>
                      <SelectItem value="semi_auto">Semi-auto</SelectItem>
                      <SelectItem value="auto">Auto (high-risk gated)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2 text-xs text-muted-foreground">
                  <p><strong>Manual:</strong> every proposal requires review.</p>
                  <p><strong>Semi-auto:</strong> low-risk actions can auto-run, medium/high require approval.</p>
                  <p><strong>Auto:</strong> only high-risk actions require approval.</p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={savePolicyConfig} className="gap-2" disabled={savingPolicy}>
                    {savingPolicy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save policy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddConnectorOpen} onOpenChange={setIsAddConnectorOpen}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle>Add Connector</DialogTitle>
            <DialogDescription>
              Register a new external connector for Fix it Felix runtime.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Connector Name</Label>
              <Input
                value={mcpDraft.name}
                onChange={event => setMcpDraft(prev => ({ ...prev, name: event.target.value }))}
                placeholder="ServiceDesk MCP"
                className="h-9"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Base URL</Label>
              <Input
                value={mcpDraft.base_url}
                onChange={event => setMcpDraft(prev => ({ ...prev, base_url: event.target.value }))}
                placeholder="https://mcp.example.com"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transport</Label>
              <Select
                value={mcpDraft.transport}
                onValueChange={value => setMcpDraft(prev => ({ ...prev, transport: value as McpTransport }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="sse">SSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Auth Type</Label>
              <Select
                value={mcpDraft.auth_type}
                onValueChange={value => setMcpDraft(prev => ({ ...prev, auth_type: value as McpAuthType }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="api_key">API Key Header</SelectItem>
                  <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={mcpDraft.description}
                onChange={event => setMcpDraft(prev => ({ ...prev, description: event.target.value }))}
                placeholder="Ticketing and asset enrichment"
                className="h-9"
              />
            </div>

            {mcpDraft.auth_type === 'bearer' ? (
              <div className="space-y-1 md:col-span-3">
                <Label className="text-xs">Bearer Token</Label>
                <Input
                  type="password"
                  value={mcpDraft.auth_token}
                  onChange={event => setMcpDraft(prev => ({ ...prev, auth_token: event.target.value }))}
                  placeholder="provider token"
                  className="h-9"
                />
              </div>
            ) : null}

            {mcpDraft.auth_type === 'api_key' ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">API Key Header</Label>
                  <Input
                    value={mcpDraft.api_key_header}
                    onChange={event => setMcpDraft(prev => ({ ...prev, api_key_header: event.target.value }))}
                    placeholder="X-API-Key"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">API Key Value</Label>
                  <Input
                    type="password"
                    value={mcpDraft.api_key_value}
                    onChange={event => setMcpDraft(prev => ({ ...prev, api_key_value: event.target.value }))}
                    placeholder="api-key-value"
                    className="h-9"
                  />
                </div>
              </>
            ) : null}

            {mcpDraft.auth_type === 'oauth2' ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">OAuth Client ID</Label>
                  <Input
                    value={mcpDraft.oauth_client_id || ''}
                    onChange={event => setMcpDraft(prev => ({ ...prev, oauth_client_id: event.target.value }))}
                    placeholder="client-id"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">OAuth Client Secret</Label>
                  <Input
                    type="password"
                    value={mcpDraft.oauth_client_secret || ''}
                    onChange={event => setMcpDraft(prev => ({ ...prev, oauth_client_secret: event.target.value }))}
                    placeholder="client-secret"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Issuer URL (optional)</Label>
                  <Input
                    value={mcpDraft.oauth_issuer_url || ''}
                    onChange={event => setMcpDraft(prev => ({ ...prev, oauth_issuer_url: event.target.value }))}
                    placeholder="https://issuer.example.com"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Authorization URL (optional)</Label>
                  <Input
                    value={mcpDraft.oauth_authorize_url || ''}
                    onChange={event => setMcpDraft(prev => ({ ...prev, oauth_authorize_url: event.target.value }))}
                    placeholder="https://issuer.example.com/oauth/authorize"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Token URL (optional)</Label>
                  <Input
                    value={mcpDraft.oauth_token_url || ''}
                    onChange={event => setMcpDraft(prev => ({ ...prev, oauth_token_url: event.target.value }))}
                    placeholder="https://issuer.example.com/oauth/token"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label className="text-xs">Scopes (optional)</Label>
                  <Input
                    value={mcpDraft.oauth_scopes || ''}
                    onChange={event => setMcpDraft(prev => ({ ...prev, oauth_scopes: event.target.value }))}
                    placeholder="repo read:user"
                    className="h-9"
                  />
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddConnectorOpen(false);
                setMcpDraft(emptyMcpDraft());
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={createMcpAdapter} disabled={savingMcp} className="gap-2 bg-primary hover:bg-primary/90">
              {savingMcp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add connector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
