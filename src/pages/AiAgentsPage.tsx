import { useEffect, useState } from 'react';
import { aiAgentApi, AiAgent, AiRecommendation } from '@/services/aiAgentApi';
import { useAiTutor } from '@/context/AiTutorContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Bot, Zap, Calendar, Star, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const AGENT_TYPE_CONFIG = {
  diagnostic:     { label: 'Diagnostic',     class: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  predictive:     { label: 'Predictive',     class: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  scheduling:     { label: 'Scheduling',     class: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  recommendation: { label: 'Recommendation', class: 'text-green-400 bg-green-400/10 border-green-400/20' },
};

const AGENT_STATUS_CONFIG = {
  active:     { label: 'Active',     dot: 'bg-green-400',  pulse: true  },
  idle:       { label: 'Idle',       dot: 'bg-yellow-400', pulse: false },
  processing: { label: 'Processing', dot: 'bg-blue-400',   pulse: true  },
  offline:    { label: 'Offline',    dot: 'bg-muted-foreground', pulse: false },
};

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      class: 'text-muted-foreground bg-muted/50 border border-border', icon: null },
  medium:   { label: 'Medium',   class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', icon: null },
  high:     { label: 'High',     class: 'text-orange-400 bg-orange-400/10 border border-orange-400/20', icon: AlertTriangle },
  critical: { label: 'Critical', class: 'text-primary bg-primary/10 border border-primary/20', icon: AlertTriangle },
};

export default function AiAgentsPage() {
  const { openTutor } = useAiTutor();
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [recs, setRecs] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      aiAgentApi.getAgents().then(setAgents),
      aiAgentApi.getRecommendations().then(setRecs),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRec = async (id: number, status: 'accepted' | 'dismissed') => {
    await aiAgentApi.updateRecommendation(id, status);
    setRecs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const pending = recs.filter(r => r.status === 'pending');
  const resolved = recs.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">AI Agents</h1>
          <p className="text-muted-foreground text-sm">Autonomous agents monitoring, diagnosing, and recommending actions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => openTutor(undefined, 'General guidance')}>
            <Bot className="h-4 w-4" /> Open AI Tutor
          </Button>
        </div>
      </div>

      {/* Agent cards */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active Agents</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map(agent => {
              const statusCfg = AGENT_STATUS_CONFIG[agent.status];
              const typeCfg = AGENT_TYPE_CONFIG[agent.type];
              return (
                <Card key={agent.id} className="bg-card border-border card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${statusCfg.dot} ${statusCfg.pulse ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] text-muted-foreground">{statusCfg.label}</span>
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-foreground">{agent.name}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeCfg.class} mt-1 inline-block`}>{typeCfg.label}</span>
                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">{agent.description}</p>
                    <div className="mt-3 pt-3 border-t border-border space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Tickets analysed</span>
                        <span className="font-medium">{agent.tickets_analyzed}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Recommendations</span>
                        <span className="font-medium">{agent.recommendations_generated}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="font-medium text-green-400">{agent.accuracy_percent}%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Last run</span>
                        <span className="text-muted-foreground">{formatDistanceToNow(new Date(agent.last_run), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending recommendations */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pending Recommendations <span className="ml-1 bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{pending.length}</span>
          </p>
          <div className="space-y-3">
            {pending.map(rec => {
              const pri = PRIORITY_CONFIG[rec.priority];
              const PriIcon = pri.icon;
              return (
                <div key={rec.id} className="bg-card border border-border rounded-lg p-4 flex gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${rec.priority === 'critical' || rec.priority === 'high' ? 'bg-primary/15' : 'bg-muted/50'}`}>
                    {PriIcon ? <PriIcon className={`h-4 w-4 ${rec.priority === 'critical' ? 'text-primary' : 'text-orange-400'}`} /> : <Star className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">{rec.title}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${pri.class}`}>{pri.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Bot className="h-3 w-3" />{rec.agent_name}</span>
                      {rec.ticket_id && <span className="text-primary font-mono">{rec.ticket_id}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 items-start">
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-green-400 border-green-400/30 hover:bg-green-400/10" onClick={() => handleRec(rec.id, 'accepted')}>
                      <CheckCircle className="h-3.5 w-3.5" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-muted-foreground border-border hover:bg-muted/50" onClick={() => handleRec(rec.id, 'dismissed')}>
                      <XCircle className="h-3.5 w-3.5" /> Dismiss
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resolved</p>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {resolved.map((rec, i) => (
              <div key={rec.id} className={`flex items-center gap-3 px-4 py-3 ${i < resolved.length - 1 ? 'border-b border-border' : ''} ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                {rec.status === 'accepted' ? <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{rec.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{rec.agent_name}{rec.ticket_id ? ` · ${rec.ticket_id}` : ''}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${rec.status === 'accepted' ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-muted-foreground bg-muted/50 border border-border'}`}>{rec.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
