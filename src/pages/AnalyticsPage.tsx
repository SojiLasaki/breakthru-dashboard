import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isInSameStation } from '@/lib/stationFilter';
import { ticketApi, type Ticket } from '@/services/ticketApi';
import { technicianApi, type Technician } from '@/services/technicianApi';
import { diagnosticsApi, type Diagnostic } from '@/services/diagnosticsApi';
import { partApi, type Part } from '@/services/partApi';
import { assetsApi, type Asset } from '@/services/assetsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import {
  Loader2,
  AlertTriangle,
  Ticket as TicketIcon,
  Activity,
  Users,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, addDays, addMonths, startOfDay, startOfWeek, startOfMonth, startOfYear, differenceInHours } from 'date-fns';

type AnalyticsPoint = {
  date: string;
  open: number;
  in_progress: number;
  completed: number;
  critical: number;
  high: number;
};

const chartConfig = {
  open: {
    label: 'Open',
    color: 'hsl(var(--warning))',
  },
  completed: {
    label: 'Completed',
    color: 'hsl(var(--success))',
  },
  critical: {
    label: 'Critical severity',
    color: 'hsl(var(--destructive))',
  },
} satisfies ChartConfig;

const GRANULARITY_OPTIONS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
] as const;

export default function AnalyticsPage() {
  const { user, isRole } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month' | 'year'>('day');

  // Admins and office staff can see analytics
  const isAnalyticsUser = isRole('admin', 'office');

  useEffect(() => {
    Promise.all([
      ticketApi.getAll(),
      diagnosticsApi.getAll(),
      partApi.getAll(),
      assetsApi.getAll(),
      technicianApi.getAll(),
    ])
      .then(([t, d, p, a, techs]) => {
        setTickets(t);
        setDiagnostics(d);
        setParts(p);
        setAssets(a);
        setTechnicians(techs);
      })
      .finally(() => setLoading(false));
  }, []);

  // Scope technicians to the logged-in user's station; if we can't resolve a station match,
  // fall back to all technicians so charts never stay empty just because of mapping.
  const techsInStation = useMemo(() => {
    if (!technicians.length) return technicians;
    if (!user) return technicians;
    const scoped = technicians.filter((t) => isInSameStation(t as { station?: string | null }, user));
    return scoped.length ? scoped : technicians;
  }, [technicians, user]);

  // Scope tickets to those handled by technicians in the same station (when station info is available).
  const ticketsInStation = useMemo(() => {
    if (!tickets.length) return [];
    if (!techsInStation.length) return tickets;

    const idSet = new Set<string>();
    const nameSet = new Set<string>();

    techsInStation.forEach((t) => {
      idSet.add(String(t.id));
      const name =
        `${t.first_name_display || t.first_name || ''} ${t.last_name_display || t.last_name || ''}`
          .trim()
          .toLowerCase();
      if (name) nameSet.add(name);
    });

    return tickets.filter((t) => {
      // Always keep completely unassigned tickets
      const hasAssignment = t.assigned_technician_id != null || (t.assigned_technician || t.assigned_to);
      if (!hasAssignment) return true;

      const idOk =
        t.assigned_technician_id != null && idSet.has(String(t.assigned_technician_id));
      const nameKey = (t.assigned_technician || t.assigned_to || '').trim().toLowerCase();
      const nameOk = !!nameKey && nameSet.has(nameKey);
      return idOk || nameOk;
    });
  }, [tickets, techsInStation]);

  const data: AnalyticsPoint[] = useMemo(() => {
    if (!ticketsInStation.length) return [];

    const today = new Date();

    // Daily: today only, grouped by hour (00–23)
    if (granularity === 'day') {
      const start = startOfDay(today);
      const end = addDays(start, 1);
      const buckets: AnalyticsPoint[] = Array.from({ length: 24 }, (_, hour) => ({
        date: `${String(hour).padStart(2, '0')}:00`,
        open: 0,
        in_progress: 0,
        completed: 0,
        critical: 0,
        high: 0,
      }));

      ticketsInStation.forEach((t) => {
        const created = new Date(t.created_at || t.updated_at || '');
        if (Number.isNaN(created.getTime()) || created < start || created >= end) return;
        const hour = created.getHours();
        if (hour < 0 || hour > 23) return;
        const bucket = buckets[hour];
        if (t.status === 'completed') bucket.completed += 1;
        else if (t.status === 'in_progress') bucket.in_progress += 1;
        else bucket.open += 1;
        if (t.severity >= 4) bucket.critical += 1;
        else if (t.severity === 3) bucket.high += 1;
      });

      return buckets;
    }

    // Weekly / Monthly: rolling window in days
    if (granularity === 'week' || granularity === 'month') {
      const windowDays = granularity === 'week' ? 7 : 30;
      const todayDay = startOfDay(today);
      const start = subDays(todayDay, windowDays - 1);

      const byTs = new Map<number, AnalyticsPoint>();

      ticketsInStation.forEach((t) => {
        const created = startOfDay(new Date(t.created_at || t.updated_at || ''));
        if (Number.isNaN(created.getTime()) || created < start || created > todayDay) return;
        const ts = created.getTime();
        const label = format(created, 'MMM d');
        if (!byTs.has(ts)) {
          byTs.set(ts, { date: label, open: 0, in_progress: 0, completed: 0, critical: 0, high: 0 });
        }
        const bucket = byTs.get(ts)!;
        if (t.status === 'completed') bucket.completed += 1;
        else if (t.status === 'in_progress') bucket.in_progress += 1;
        else bucket.open += 1;
        if (t.severity >= 4) bucket.critical += 1;
        else if (t.severity === 3) bucket.high += 1;
      });

      const ordered: AnalyticsPoint[] = [];
      for (let i = 0; i < windowDays; i++) {
        const d = addDays(start, i);
        const ts = d.getTime();
        const existing = byTs.get(ts);
        ordered.push(
          existing ?? {
            date: format(d, 'MMM d'),
            open: 0,
            in_progress: 0,
            completed: 0,
            critical: 0,
            high: 0,
          },
        );
      }
      return ordered;
    }

    // Yearly: last 12 months, grouped by month
    const startMonth = startOfMonth(addMonths(today, -11));
    const byMonth = new Map<number, AnalyticsPoint>();

    ticketsInStation.forEach((t) => {
      const created = new Date(t.created_at || t.updated_at || '');
      if (Number.isNaN(created.getTime()) || created < startMonth || created > today) return;
      const m = startOfMonth(created);
      const ts = m.getTime();
      const label = format(m, 'MMM yyyy');
      if (!byMonth.has(ts)) {
        byMonth.set(ts, { date: label, open: 0, in_progress: 0, completed: 0, critical: 0, high: 0 });
      }
      const bucket = byMonth.get(ts)!;
      if (t.status === 'completed') bucket.completed += 1;
      else if (t.status === 'in_progress') bucket.in_progress += 1;
      else bucket.open += 1;
      if (t.severity >= 4) bucket.critical += 1;
      else if (t.severity === 3) bucket.high += 1;
    });

    const yearly: AnalyticsPoint[] = [];
    for (let i = 0; i < 12; i++) {
      const m = startOfMonth(addMonths(startMonth, i));
      const ts = m.getTime();
      const existing = byMonth.get(ts);
      yearly.push(
        existing ?? {
          date: format(m, 'MMM yyyy'),
          open: 0,
          in_progress: 0,
          completed: 0,
          critical: 0,
          high: 0,
        },
      );
    }

    return yearly;
  }, [ticketsInStation, granularity]);

  // Technician workload by status (station-scoped + time-filtered)
  const technicianWorkload = useMemo(() => {
    if (!techsInStation.length || !ticketsInStation.length) return [];

    const now = new Date();
    let start: Date;
    switch (granularity) {
      case 'day':
        start = startOfDay(now);
        break;
      case 'week':
        start = subDays(startOfDay(now), 6);
        break;
      case 'month':
        start = subDays(startOfDay(now), 29);
        break;
      case 'year':
        start = startOfMonth(addMonths(now, -11));
        break;
      default:
        start = subDays(startOfDay(now), 29);
    }

    const map = new Map<string, { technician_name: string; open: number; in_progress: number; completed: number }>();

    // Seed all technicians so even zero-workload techs show up
    techsInStation.forEach((tech) => {
      const name =
        `${tech.first_name_display || tech.first_name || ''} ${tech.last_name_display || tech.last_name || ''}`.trim() ||
        tech.email_display ||
        tech.email ||
        'Unknown';
      if (!map.has(name)) {
        map.set(name, { technician_name: name, open: 0, in_progress: 0, completed: 0 });
      }
    });

    // Build a quick lookup from technician name to whether they are in station
    const allowedNames = new Set(
      Array.from(map.keys()).map((n) => n.trim().toLowerCase()),
    );

    // Aggregate ticket workload per technician, within time window and station
    ticketsInStation.forEach((t) => {
      const ts = new Date(t.created_at || t.updated_at || '');
      if (Number.isNaN(ts.getTime()) || ts < start || ts > now) return;

      const techNameRaw = t.assigned_technician || 'Unassigned';
      const techKey = techNameRaw.trim().toLowerCase();
      if (techKey !== 'unassigned' && !allowedNames.has(techKey)) return;

      const techName = techNameRaw || 'Unassigned';
      if (!map.has(techName)) {
        map.set(techName, { technician_name: techName, open: 0, in_progress: 0, completed: 0 });
      }
      const bucket = map.get(techName)!;
      if (t.status === 'completed') bucket.completed += 1;
      else if (t.status === 'in_progress') bucket.in_progress += 1;
      else bucket.open += 1;
    });

    return Array.from(map.values()).sort(
      (a, b) => b.open + b.in_progress + b.completed - (a.open + a.in_progress + a.completed),
    );
  }, [ticketsInStation, techsInStation, granularity]);

  // Average repair time (from predicted / estimated minutes)
  const avgRepairTimeData = useMemo(() => {
    const today = new Date();
    const days = 30;
    const start = subDays(today, days - 1);
    const buckets = new Map<number, { date: string; totalHours: number; n: number }>();

    ticketsInStation.forEach((t) => {
      const created = new Date(t.created_at || '');
      if (Number.isNaN(created.getTime()) || created < start || created > today) return;

      const minutes =
        typeof t.estimated_resolution_time_minutes === 'number' && t.estimated_resolution_time_minutes > 0
          ? t.estimated_resolution_time_minutes
          : typeof t.actual_resolution_time_minutes === 'number' && t.actual_resolution_time_minutes > 0
            ? t.actual_resolution_time_minutes
            : 0;
      const hours = minutes / 60;
      if (!hours) return;

      let bucketDate: Date;
      switch (granularity) {
        case 'week':
          bucketDate = startOfWeek(created);
          break;
        case 'month':
          bucketDate = startOfMonth(created);
          break;
        case 'year':
          bucketDate = startOfYear(created);
          break;
        default:
          bucketDate = startOfDay(created);
      }

      const ts = bucketDate.getTime();
      const label =
        granularity === 'year'
          ? format(bucketDate, 'yyyy')
          : granularity === 'month'
            ? format(bucketDate, 'MMM yyyy')
            : format(bucketDate, 'MMM d');

      if (!buckets.has(ts)) {
        buckets.set(ts, { date: label, totalHours: 0, n: 0 });
      }
      const bucket = buckets.get(ts)!;
      bucket.totalHours += Math.max(0, hours);
      bucket.n += 1;
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => ({
        date: v.date,
        avg_hours: v.n > 0 ? v.totalHours / v.n : 0,
      }));
  }, [ticketsInStation, granularity]);

  // Most common engine issues (by diagnostics.specialization)
  const engineIssuePieData = useMemo(() => {
    const map = new Map<string, number>();

    const now = new Date();
    let start: Date;
    switch (granularity) {
      case 'day':
        start = startOfDay(now);
        break;
      case 'week':
        start = subDays(startOfDay(now), 6);
        break;
      case 'month':
        start = subDays(startOfDay(now), 29);
        break;
      case 'year':
        start = startOfMonth(addMonths(now, -11));
        break;
      default:
        start = subDays(startOfDay(now), 29);
    }

    diagnostics.forEach((d) => {
      const ts = new Date(d.identified_at || d.created_at || '');
      if (Number.isNaN(ts.getTime()) || ts < start || ts > now) return;
      const key = d.specialization || 'General';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([issue_category, count]) => ({ issue_category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [diagnostics, granularity]);

  // Maintenance cost breakdown from technician hourly rate + part resale prices
  const maintenanceCostData = useMemo(() => {
    if (!ticketsInStation.length) return [];

    const now = new Date();
    let start: Date;
    switch (granularity) {
      case 'day':
        start = startOfDay(now);
        break;
      case 'week':
        start = subDays(startOfDay(now), 6);
        break;
      case 'month':
        start = subDays(startOfDay(now), 29);
        break;
      case 'year':
        start = startOfMonth(addMonths(now, -11));
        break;
      default:
        start = subDays(startOfDay(now), 29);
    }

    const techRateById = new Map<string, number>();
    const techRateByName = new Map<string, number>();
    technicians.forEach((t) => {
      const rate = typeof t.hourly_rate === 'number' && Number.isFinite(t.hourly_rate) ? t.hourly_rate : 0;
      const name =
        `${t.first_name_display || t.first_name || ''} ${t.last_name_display || t.last_name || ''}`.trim().toLowerCase();
      techRateById.set(String(t.id), rate);
      if (name) techRateByName.set(name, rate);
    });

    const partByKey = new Map<string, Part>();
    parts.forEach((p) => {
      partByKey.set(String(p.id), p);
      if (p.part_number) partByKey.set(String(p.part_number), p);
      if (p.name) partByKey.set(p.name.trim().toLowerCase(), p);
    });

    let partsCost = 0;
    let laborCost = 0;

    ticketsInStation.forEach((ticket) => {
      const created = new Date(ticket.created_at || ticket.updated_at || '');
      if (Number.isNaN(created.getTime()) || created < start || created > now) return;
      // Labor: use predicted / estimated minutes, fall back to actual if needed
      const minutes =
        typeof ticket.estimated_resolution_time_minutes === 'number' && ticket.estimated_resolution_time_minutes > 0
          ? ticket.estimated_resolution_time_minutes
          : typeof ticket.actual_resolution_time_minutes === 'number' && ticket.actual_resolution_time_minutes > 0
            ? ticket.actual_resolution_time_minutes
            : 0;
      const hours = minutes / 60;

      const rate =
        ticket.assigned_technician_id != null
          ? (techRateById.get(String(ticket.assigned_technician_id)) ?? 0)
          : techRateByName.get((ticket.assigned_technician || '').trim().toLowerCase()) ?? 0;
      laborCost += hours * rate;

      // Parts: sum part resale price * qty for each part used
      if (Array.isArray(ticket.parts)) {
        (ticket.parts as any[]).forEach((tp) => {
          if (!tp) return;
          const qty =
            typeof (tp as any).quantity === 'number' && Number.isFinite((tp as any).quantity)
              ? (tp as any).quantity
              : 1;

          const rawKey = (tp as any).part_id ?? (tp as any).id ?? (tp as any).part_number ?? (tp as any).name ?? tp;
          const key =
            typeof rawKey === 'string'
              ? rawKey.trim()
              : typeof rawKey === 'number'
                ? String(rawKey)
                : '';

          const part = partByKey.get(key) ?? partByKey.get(key.toLowerCase());
          if (!part) return;

          const resale =
            typeof part.resale_price === 'number' && Number.isFinite(part.resale_price) ? part.resale_price : 0;
          partsCost += resale * qty;
        });
      }
    });

    return [
      { cost_category: 'Parts', cost_total: partsCost },
      { cost_category: 'Labor', cost_total: laborCost },
    ].filter((b) => b.cost_total > 0);
  }, [ticketsInStation, technicians, parts, granularity]);

  // Parts usage forecast derived from tickets + parts used
  const partsUsageForecastData = useMemo(() => {
    if (!ticketsInStation.length) return [];
    const map = new Map<number, { date: string; historical_usage: number }>();

    const now = new Date();
    let start: Date;
    switch (granularity) {
      case 'day':
        start = startOfDay(now);
        break;
      case 'week':
        start = subDays(startOfDay(now), 6);
        break;
      case 'month':
        start = subDays(startOfDay(now), 29);
        break;
      case 'year':
        start = startOfMonth(addMonths(now, -11));
        break;
      default:
        start = subDays(startOfDay(now), 29);
    }

    ticketsInStation.forEach((t) => {
      if (!Array.isArray(t.parts) || t.parts.length === 0) return;
      const tsDate = startOfDay(new Date(t.updated_at || t.created_at || ''));
      if (Number.isNaN(tsDate.getTime()) || tsDate < start || tsDate > now) return;
      const ts = tsDate.getTime();
      if (!map.has(ts)) {
        map.set(ts, { date: format(tsDate, 'MMM d'), historical_usage: 0 });
      }
      const bucket = map.get(ts)!;

      // Each ticket part contributes at least 1 unit; support optional quantity field
      (t.parts as any[]).forEach((p) => {
        if (!p) return;
        const qty =
          typeof (p as any).quantity === 'number' && Number.isFinite((p as any).quantity)
            ? (p as any).quantity
            : 1;
        bucket.historical_usage += qty;
      });
    });

    const base = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);

    return base.map((p) => ({
      ...p,
      forecast_usage: p.historical_usage,
    }));
  }, [ticketsInStation, granularity]);

  // Engine model issue distribution derived from tickets + parts used
  const engineModelIssueData = useMemo(() => {
    if (!ticketsInStation.length || !parts.length) return [];

    const now = new Date();
    let start: Date;
    switch (granularity) {
      case 'day':
        start = startOfDay(now);
        break;
      case 'week':
        start = subDays(startOfDay(now), 6);
        break;
      case 'month':
        start = subDays(startOfDay(now), 29);
        break;
      case 'year':
        start = startOfMonth(addMonths(now, -11));
        break;
      default:
        start = subDays(startOfDay(now), 29);
    }

    const partById = new Map<string, Part>();
    parts.forEach((p) => {
      partById.set(String(p.id), p);
      if (p.part_number) {
        partById.set(String(p.part_number), p);
      }
    });

    const map = new Map<string, number>();
    ticketsInStation.forEach((t) => {
      if (!Array.isArray(t.parts) || t.parts.length === 0) return;
      const created = new Date(t.created_at || t.updated_at || '');
      if (Number.isNaN(created.getTime()) || created < start || created > now) return;

      (t.parts as any[]).forEach((tp) => {
        if (!tp) return;
        const rawId = (tp as any).part_id ?? (tp as any).id ?? tp;
        const key = rawId != null ? String(rawId) : '';
        const part = key ? partById.get(key) : undefined;
        if (!part) return;

        // Use first components_name entry as engine model label when available,
        // otherwise fall back to part.category or part.name.
        const engineModel =
          (Array.isArray(part.components_name) && part.components_name[0]) ||
          part.category ||
          part.name ||
          'Unknown model';

        map.set(engineModel, (map.get(engineModel) ?? 0) + 1);
      });
    });

    return Array.from(map.entries())
      .map(([engine_model, issue_count]) => ({ engine_model, issue_count }))
      .sort((a, b) => b.issue_count - a.issue_count)
      .slice(0, 8);
  }, [tickets, parts, granularity]);


  if (!isAnalyticsUser) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        Admin analytics are only available to administrators.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Service Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Ticket volume, severity, and completion trends over time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              {GRANULARITY_OPTIONS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <TicketIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total tickets in range</p>
              <p className="text-2xl font-bold">
                {data.reduce((sum, d) => sum + d.open + d.in_progress + d.completed, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[hsl(var(--destructive))]/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--destructive))]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Critical issues</p>
              <p className="text-2xl font-bold text-[hsl(var(--destructive))]">
                {data.reduce((sum, d) => sum + d.critical, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-[hsl(var(--success))]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completion rate</p>
              <p className="text-2xl font-bold text-[hsl(var(--success))]">
                {(() => {
                  const total = data.reduce((sum, d) => sum + d.open + d.in_progress + d.completed, 0);
                  const done = data.reduce((sum, d) => sum + d.completed, 0);
                  return total ? `${Math.round((done / total) * 100)}%` : '0%';
                })()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket trends over time */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Ticket trends by day</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 px-0">
          {data.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground text-sm">
              No ticket data available for the selected range.
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="w-full h-72 md:h-80">
              <ResponsiveContainer>
                <LineChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 8 }}>
                  <defs>
                    {/* 50% red on top, fading to transparent bottom */}
                    <linearGradient id="criticalLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                      <stop offset="50%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    wrapperStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="open"
                    stroke="var(--color-open)"
                    strokeWidth={1.5}
                    dot={false}
                    name="Open"
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="var(--color-completed)"
                    strokeWidth={1.5}
                    dot={false}
                    name="Completed"
                  />
                  <Line
                    type="monotone"
                    dataKey="critical"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                    name="Critical"
                    fill="url(#criticalLine)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Technician workload & average repair time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Technician workload
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {technicianWorkload.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No ticket workload data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={technicianWorkload}
                  margin={{ left: 12, right: 12, top: 8, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="technician_name"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    wrapperStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="open" stackId="tickets" fill="#f97316" />
                  <Bar dataKey="in_progress" stackId="tickets" fill="#eab308" />
                  <Bar dataKey="completed" stackId="tickets" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Average repair time (hours)</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {avgRepairTimeData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No completed tickets in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={avgRepairTimeData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals tickLine={false} axisLine={false} />
                  <Tooltip
                    wrapperStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_hours"
                    stroke="#0ea5e9"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engine issues & maintenance cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" />
              Most common engine issues
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {engineIssuePieData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No diagnostic data available.</p>
            ) : (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={engineIssuePieData}
                      dataKey="count"
                      nameKey="issue_category"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {engineIssuePieData.map((entry, idx) => (
                        <Cell
                          key={entry.issue_category}
                          fill={
                            ['#e11d48', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#ec4899'][idx % 6]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 8,
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" />
              Maintenance cost breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {maintenanceCostData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No cost data available.</p>
            ) : (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={maintenanceCostData}
                      dataKey="cost_total"
                      nameKey="cost_category"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {maintenanceCostData.map((entry, idx) => (
                        <Cell
                          key={entry.cost_category}
                          fill={
                            ['#0ea5e9', '#22c55e', '#f97316', '#e11d48', '#6366f1'][idx % 5]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 8,
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parts usage forecast & engine model distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Parts usage forecast</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {partsUsageForecastData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No usage data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={partsUsageForecastData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    wrapperStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="historical_usage"
                    stroke="#0ea5e9"
                    strokeWidth={1.5}
                    dot={false}
                    name="Historical"
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast_usage"
                    stroke="#6b7280"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="Forecast"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Engine model issue distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {engineModelIssueData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No engine model data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={engineModelIssueData}
                  margin={{ left: 16, right: 16, top: 8, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="engine_model"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    wrapperStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="issue_count"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}


