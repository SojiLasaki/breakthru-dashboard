import { api } from './apiClient';

export interface AiAgent {
  id: number;
  name: string;
  type: 'diagnostic' | 'predictive' | 'scheduling' | 'recommendation';
  status: 'active' | 'idle' | 'processing' | 'offline';
  last_run: string;
  tickets_analyzed: number;
  recommendations_generated: number;
  accuracy_percent: number;
  description: string;
}

export interface AiRecommendation {
  id: number;
  agent_name: string;
  ticket_id?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

const MOCK_AGENTS: AiAgent[] = [
  { id: 1, name: 'DiagnostIQ',       type: 'diagnostic',      status: 'active',     last_run: '2024-02-15T11:00:00Z', tickets_analyzed: 142, recommendations_generated: 89,  accuracy_percent: 94, description: 'Real-time fault code analysis and root cause identification for engine anomalies.' },
  { id: 2, name: 'PredictPro',       type: 'predictive',      status: 'processing', last_run: '2024-02-15T10:30:00Z', tickets_analyzed: 98,  recommendations_generated: 61,  accuracy_percent: 88, description: 'Predictive maintenance scheduling based on engine runtime, telemetry, and historical data.' },
  { id: 3, name: 'ScheduleBot',      type: 'scheduling',      status: 'idle',       last_run: '2024-02-14T18:00:00Z', tickets_analyzed: 0,   recommendations_generated: 34,  accuracy_percent: 91, description: 'Optimizes technician scheduling and workload balancing across open tickets.' },
  { id: 4, name: 'PartAdvisor',      type: 'recommendation',  status: 'active',     last_run: '2024-02-15T09:45:00Z', tickets_analyzed: 76,  recommendations_generated: 110, accuracy_percent: 86, description: 'Suggests optimal parts based on fault type, inventory levels, and supplier lead times.' },
];

const MOCK_RECOMMENDATIONS: AiRecommendation[] = [
  { id: 1, agent_name: 'PredictPro',  ticket_id: 'TK-001', priority: 'critical', title: 'Immediate Coolant Flush Required',         message: 'Engine runtime data shows coolant degradation. Risk of overheating within 50 hours.',                  created_at: '2024-02-15T10:30:00Z', status: 'pending' },
  { id: 2, agent_name: 'DiagnostIQ', ticket_id: 'TK-004', priority: 'high',     title: 'Oil Pump Wear Detected',                   message: 'Fault pattern matches oil pump bearing wear. Recommend immediate inspection before failure.',            created_at: '2024-02-15T09:00:00Z', status: 'pending' },
  { id: 3, agent_name: 'PartAdvisor',              priority: 'medium',   title: 'Reorder: Oil Filter Assembly',             message: 'Stock at 3 units, below reorder threshold of 10. Lead time is 5 days.',                               created_at: '2024-02-14T16:00:00Z', status: 'accepted' },
  { id: 4, agent_name: 'ScheduleBot', ticket_id: 'TK-003', priority: 'low',      title: 'Assign Bob Wilson to TK-003',              message: 'Bob Wilson has lowest workload (1 ticket) and electrical specialization matches ticket requirements.',   created_at: '2024-02-14T14:00:00Z', status: 'accepted' },
  { id: 5, agent_name: 'PredictPro',  ticket_id: 'TK-006', priority: 'medium',   title: 'Generator Load Test Due',                  message: 'Annual maintenance window detected. Schedule load test within 2 weeks to stay compliant.',               created_at: '2024-02-13T11:00:00Z', status: 'dismissed' },
];

export const aiAgentApi = {
  getAgents: async (): Promise<AiAgent[]> => {
    try {
      const { data } = await api.get('/ai_service/agents/');
      return data.results || data;
    } catch {
      return MOCK_AGENTS;
    }
  },
  getRecommendations: async (): Promise<AiRecommendation[]> => {
    try {
      const { data } = await api.get('/ai_service/recommendations/');
      return data.results || data;
    } catch {
      return MOCK_RECOMMENDATIONS;
    }
  },
  updateRecommendation: async (id: number, status: AiRecommendation['status']): Promise<void> => {
    try {
      await api.patch(`/ai_service/recommendations/${id}/`, { status });
    } catch {
      console.log('Updated recommendation (mock):', id, status);
    }
  },
};
