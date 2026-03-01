import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AgentActionProposal,
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
import { useToast } from '@/hooks/use-toast';
import {
  Bot,
  BrainCircuit,
  Cable,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Wrench,
} from 'lucide-react';

const ACTIVE_STATUSES = new Set(['open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_approval']);
type StudioTab = 'runtime' | 'learning' | 'prompt-studio' | 'connectors' | 'approvals';

const AGENT_CAPABILITIES = [
  'Ticket triage and resolution sequencing',
  'Summaries for faster technician handoff',
  'Repair learning extraction from completed jobs',
  'Knowledge-grounded suggestions with domain guardrails',
];

type PromptDraft = {
  system_prompt: string;
  domain_guardrail_prompt: string;
};

const avg = (values: number[]) => {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const isStudioTab = (value: string | null): value is StudioTab => (
  value === 'runtime'
  || value === 'learning'
  || value === 'prompt-studio'
  || value === 'connectors'
  || value === 'approvals'
);

export default function AiAgentsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<StudioTab>(isStudioTab(requestedTab) ? requestedTab : 'runtime');
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [mcpAdapters, setMcpAdapters] = useState<AgentMcpAdapter[]>([]);
  const [agentActions, setAgentActions] = useState<AgentActionProposal[]>([]);
  const [promptDraft, setPromptDraft] = useState<PromptDraft>({
    system_prompt: '',
    domain_guardrail_prompt: '',
  });

  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingMcp, setSavingMcp] = useState(false);
  const [togglingMcpId, setTogglingMcpId] = useState<string | null>(null);
  const [testingMcpId, setTestingMcpId] = useState<string | null>(null);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  const [startingOauthMcpId, setStartingOauthMcpId] = useState<string | null>(null);
  const [oauthPendingByAdapter, setOauthPendingByAdapter] = useState<Record<string, boolean>>({});
  const [connectionResults, setConnectionResults] = useState<Record<string, McpConnectionTestResult>>({});
  const [oauthLinks, setOauthLinks] = useState<Record<string, string>>({});

  const [mcpDraft, setMcpDraft] = useState<CreateMcpAdapterPayload>({
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

  const syncTabToUrl = (tab: StudioTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'runtime') {
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
      setMcpAdapters(adapters);
      setAgentActions(actions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeTickets = useMemo(
    () => tickets.filter(ticket => ACTIVE_STATUSES.has(ticket.status)),
    [tickets]
  );

  const completedTickets = useMemo(
    () => tickets.filter(ticket => ticket.status === 'completed'),
    [tickets]
  );

  const criticalActive = useMemo(
    () => activeTickets.filter(ticket => ticket.priority >= 4),
    [activeTickets]
  );

  const avgEta = useMemo(
    () => avg(activeTickets.map(ticket => Number(ticket.estimated_resolution_time_minutes || 0)).filter(value => value > 0)),
    [activeTickets]
  );

  const avgActual = useMemo(
    () => avg(completedTickets.map(ticket => Number(ticket.actual_resolution_time_minutes || 0)).filter(value => value > 0)),
    [completedTickets]
  );

  const learningHighlights = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const ticket of completedTickets) {
      const key = (ticket.specialization || 'general').toLowerCase();
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }
    return [...grouped.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [completedTickets]);

  const pendingActions = useMemo(
    () => agentActions.filter(action => action.status === 'pending'),
    [agentActions]
  );

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
      toast({
        title: 'Prompts updated',
        description: 'Felix runtime prompts are saved.',
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

  const createMcpAdapter = async () => {
    const name = mcpDraft.name.trim();
    const baseUrl = mcpDraft.base_url.trim();
    if (!name || !baseUrl) {
      toast({
        title: 'Missing MCP fields',
        description: 'Adapter name and base URL are required.',
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
        description: 'Provide a bearer token for bearer-auth MCP adapters.',
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
        description: 'Provide OAuth client ID for OAuth 2.0 adapters.',
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
      setMcpDraft({
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
      toast({
        title: 'MCP adapter added',
        description: `${created.name} is now available in Fix it Felix.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to add MCP adapter',
        description: error instanceof Error ? error.message : 'Could not create adapter.',
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
        title: result.ok ? 'MCP connection successful' : 'MCP connection failed',
        description: result.ok
          ? `${adapter.name} responded with HTTP ${result.status_code}.`
          : (result.hint || result.error || `HTTP ${result.status_code}`),
        variant: result.ok ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'MCP test failed',
        description: error instanceof Error ? error.message : 'Could not validate adapter connectivity.',
        variant: 'destructive',
      });
    } finally {
      setTestingMcpId(null);
    }
  };

  const toggleMcpAdapter = async (adapter: AgentMcpAdapter, enabled: boolean) => {
    setTogglingMcpId(adapter.id);
    try {
      const updated = await aiAgentApi.setMcpAdapterEnabled(adapter.id, enabled);
      setMcpAdapters(prev => prev.map(item => (item.id === adapter.id ? updated : item)));
    } catch (error) {
      toast({
        title: 'Failed to update MCP adapter',
        description: error instanceof Error ? error.message : 'Could not update adapter state.',
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
        description: 'Proposal executed through configured connectors.',
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
        description: 'Proposal moved out of execution queue.',
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

  const openCopilotWithTask = (task: string) => {
    navigate(`/ask-ai?q=${encodeURIComponent(task)}`);
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
            Configure Fix it Felix behavior, connector integrations, and approval-gated automation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => navigate('/ask-ai')}>
            <Sparkles className="h-4 w-4" />
            Open Fix it Felix
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value => {
          if (!isStudioTab(value)) return;
          setActiveTab(value);
          syncTabToUrl(value);
        }}
      >
        <TabsList className="grid w-full grid-cols-5 md:w-[820px]">
          <TabsTrigger value="runtime">Runtime</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="prompt-studio">Prompt Studio</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
        </TabsList>

        <TabsContent value="runtime" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                What Agent Studio Is
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Prompt controls: define Felix system behavior and domain guardrails.</p>
              <p>2. Connector controls: register external systems for supply, ticketing, and workforce data.</p>
              <p>3. Automation queue: review and approve high-impact actions before execution.</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                ReAct Agent Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {AGENT_CAPABILITIES.map(item => (
                  <div key={item} className="text-xs rounded-md border border-border bg-muted/20 px-3 py-2">
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => openCopilotWithTask('Generate a high-priority ticket triage summary for today')}>
                  Generate Triage Summary
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => openCopilotWithTask('What are the top repeated failures from completed tickets and how should we prevent them?')}>
                  Generate Learning Summary
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Tickets</p>
                <p className="text-2xl font-semibold mt-1">{activeTickets.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Critical Active</p>
                <p className="text-2xl font-semibold mt-1 text-primary">{criticalActive.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg ETA (min)</p>
                <p className="text-2xl font-semibold mt-1 flex items-center gap-1">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  {avgEta || '—'}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Actual (min)</p>
                <p className="text-2xl font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  {avgActual || '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                Learning Loop Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {learningHighlights.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed ticket patterns available yet.</p>
              ) : (
                <div className="space-y-2">
                  {learningHighlights.map(([specialization, count]) => (
                    <div key={specialization} className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
                      <div className="text-sm capitalize">{specialization}</div>
                      <div className="text-xs text-muted-foreground">{count} completed ticket(s)</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt-studio" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                Prompt Studio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                These prompts are sent to the backend AI runtime and control Felix behavior.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">System Prompt (Felix Agent)</Label>
                <Textarea
                  value={promptDraft.system_prompt}
                  onChange={event => setPromptDraft(prev => ({ ...prev, system_prompt: event.target.value }))}
                  rows={6}
                  className="bg-background text-sm"
                  placeholder="Define how the agent structures ticket resolution responses."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Domain Guardrail Prompt</Label>
                <Textarea
                  value={promptDraft.domain_guardrail_prompt}
                  onChange={event => setPromptDraft(prev => ({ ...prev, domain_guardrail_prompt: event.target.value }))}
                  rows={4}
                  className="bg-background text-sm"
                  placeholder="Define out-of-domain refusal and redirect behavior."
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={savePromptConfig} className="gap-2 bg-primary hover:bg-primary/90" disabled={savingPrompt || loading}>
                  {savingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Prompts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connectors" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cable className="h-4 w-4 text-primary" />
                Add Integration Connector
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Register external connectors here. They become selectable in Fix it Felix chat immediately.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Adapter Name</Label>
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
                      placeholder="ghp_... or provider token"
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
                      <Label className="text-xs">OAuth Client Secret (optional)</Label>
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

              <div className="flex justify-end">
                <Button variant="outline" onClick={seedDemoConnectors} disabled={savingMcp} className="gap-2">
                  {savingMcp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Seed Demo Connectors
                </Button>
                <Button onClick={createMcpAdapter} disabled={savingMcp} className="gap-2 bg-primary hover:bg-primary/90 ml-2">
                  {savingMcp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Connector
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Cable className="h-4 w-4 text-primary" />
                  Configured Connectors
                </span>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate('/ask-ai')}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in Chat
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mcpAdapters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No connectors yet. Add your first connector above.</p>
              ) : (
                <div className="space-y-2">
                  {mcpAdapters.map(adapter => {
                    const testResult = connectionResults[adapter.id];
                    return (
                      <div
                        key={adapter.id}
                        className="rounded-md border border-border bg-muted/20 px-3 py-3 flex flex-col gap-2"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{adapter.name}</p>
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{adapter.transport}</Badge>
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">auth:{adapter.auth_type}</Badge>
                              <Badge variant={adapter.is_enabled ? 'default' : 'secondary'} className="text-[10px]">
                                {adapter.is_enabled ? 'enabled' : 'disabled'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{adapter.base_url}</p>
                            {adapter.description ? (
                              <p className="text-xs text-muted-foreground">{adapter.description}</p>
                            ) : null}
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
                              Test Connection
                            </Button>
                            {togglingMcpId === adapter.id ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
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

                        {adapter.auth_type === 'oauth2' ? (
                          <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
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
                                {oauthPendingByAdapter[adapter.id] ? 'Waiting for authorization...' : 'Connect OAuth'}
                              </Button>
                              {oauthLinks[adapter.id] ? (
                                <a
                                  href={oauthLinks[adapter.id]}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary underline underline-offset-2"
                                >
                                  Open authorization URL
                                </a>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              This opens the provider sign-in page and stores tokens automatically after callback.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Approval-Gated Actions
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {pendingActions.length} pending
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No agent actions yet. Ask Fix it Felix to create or route a ticket and proposals will appear here.
                </p>
              ) : (
                <div className="space-y-3">
                  {agentActions.map(action => (
                    <div key={action.id} className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium capitalize">{action.action_type.replace('_', ' ')}</p>
                          <Badge variant={action.status === 'executed' ? 'default' : 'outline'} className="text-[10px] uppercase">
                            {action.status}
                          </Badge>
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                Learning Loop Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {learningHighlights.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed ticket patterns available yet.</p>
              ) : (
                <div className="space-y-2">
                  {learningHighlights.map(([specialization, count]) => (
                    <div key={specialization} className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
                      <div className="text-sm capitalize">{specialization}</div>
                      <div className="text-xs text-muted-foreground">{count} completed ticket(s)</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Agent Learning Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Use these prompts to generate repeatable fixes and transfer knowledge to technicians faster.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => openCopilotWithTask('Summarize repeat failure signatures from completed tickets and suggested preventive checks by specialization.')}>
                  Generate Pattern Summary
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => openCopilotWithTask('Create a technician handoff checklist from the top completed ticket resolutions this week.')}>
                  Generate Handoff Checklist
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
