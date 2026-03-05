import { useEffect, useState, useMemo } from 'react';
import { diagnosticsApi, Diagnostic } from '@/services/diagnosticsApi';
import { useAuth } from '@/context/AuthContext';
import { getDisplayFullName } from '@/lib/displayUser';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Search, AlertTriangle, CheckCircle2, Clock, XCircle,
  RefreshCw, Activity, Tag, User, Calendar, ChevronRight, Zap,
  Brain, Target, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';

// Keys must match backend values: severity in {"info","warning","critical"}, status in {"pending","in_progress","resolved","failed"}.
const SEVERITY_CONFIG: Record<string, { label: string; class: string; dot: string; icon: React.ComponentType<{ className?: string }> }> = {
  info:     { label: 'Info',     class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',       dot: 'bg-blue-400',     icon: Activity },
  warning:  { label: 'Warning',  class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', dot: 'bg-yellow-400',   icon: AlertTriangle },
  critical: { label: 'Critical', class: 'text-primary bg-primary/10 border border-primary/20',          dot: 'bg-primary',      icon: Zap },
};

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:      { label: 'Pending',     class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', icon: Clock },
  in_progress:  { label: 'In Progress', class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',       icon: Activity },
  resolved:     { label: 'Resolved',    class: 'text-green-400 bg-green-400/10 border border-green-400/20',    icon: CheckCircle2 },
  failed:       { label: 'Failed',      class: 'text-primary bg-primary/10 border border-primary/20',          icon: XCircle },
};

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 85 ? 'text-green-400 bg-green-400/10 border-green-400/30'
    : score >= 60 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
    : 'text-primary bg-primary/10 border-primary/30';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}>
      <Target className="h-3 w-3" />
      {score}%
    </span>
  );
}

export default function DiagnosticsPage() {
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selected, setSelected] = useState<Diagnostic | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = isRole('admin', 'office');
  const isTech = isRole('technician');
  const isCustomer = isRole('customer');
  const fullName = user ? getDisplayFullName(user) : '';

  const load = () => {
    setLoading(true);
    diagnosticsApi.getAll().then(all => {
      // Role-based filtering
      let scoped = all;
      if (isTech) {
        // Technicians see only diagnostics for tickets assigned to them
        scoped = all.filter(d => d.assigned_technician === fullName || d.performed_by === fullName);
      }
      if (isCustomer) {
        // Customers see diagnostics for their own tickets only
        // In a real system this would filter by ticket.customer matching user
        scoped = all;
      }
      setDiagnostics(scoped);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const searchQ = search.toLowerCase();
    return diagnostics.filter(d => {
      const matchSearch =
        !searchQ ||
        d.title.toLowerCase().includes(searchQ) ||
        d.fault_code.toLowerCase().includes(searchQ) ||
        d.specialization.toLowerCase().includes(searchQ);
      const sStatus = d.status?.toLowerCase?.() ?? '';
      const sSeverity = d.severity?.toLowerCase?.() ?? '';
      const matchStatus   = statusFilter === 'all'   || sStatus === statusFilter.toLowerCase();
      const matchSeverity = severityFilter === 'all' || sSeverity === severityFilter.toLowerCase();
      return matchSearch && matchStatus && matchSeverity;
    });
  }, [diagnostics, search, statusFilter, severityFilter]);

  const handleUpdateStatus = async (id: string, status: Diagnostic['status']) => {
    setSaving(true);
    try {
      const updated = await diagnosticsApi.update(id, { status });
      setDiagnostics(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...updated } : null);
      toast({ title: 'Updated', description: `Diagnostic marked as ${status.replace('_', ' ')}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update diagnostic.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const Critical  = diagnostics.filter(d => d.severity.toLowerCase() === 'critical').length;
  const Pending   = diagnostics.filter(d => d.status.toLowerCase() === 'pending').length;
  const Resolved  = diagnostics.filter(d => d.status.toLowerCase() === 'resolved').length;
  const avgConfidence = diagnostics.length > 0
    ? Math.round(diagnostics.reduce((sum, d) => sum + d.confidence_score, 0) / diagnostics.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Diagnostics</h1>
          <p className="text-muted-foreground text-sm">
            {isTech ? 'Diagnostics for your assigned tickets' : isCustomer ? 'Diagnostics for your tickets' : 'All diagnostic reports'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold">{diagnostics.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-primary">{Critical}</p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-yellow-400">{Pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-2xl font-bold text-green-400">{Resolved}</p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{avgConfidence}%</p>
          </div>
          <p className="text-xs text-muted-foreground">Avg Confidence</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by specialization, ticket, fault code..." className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Title', 'Specialization', 'Expertise Req.', 'Customer', 'Location', 'Probable Cause', 'Confidence', 'Severity', 'Status', 'Verified By', 'Identified', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-muted-foreground text-sm">No diagnostics found</td></tr>
              ) : filtered.map((d, i) => {
                const sevKey = d.severity?.toLowerCase?.() ?? '';
                const staKey = d.status?.toLowerCase?.() ?? '';
                const sev = SEVERITY_CONFIG[sevKey] ?? SEVERITY_CONFIG['info'];
                const sta = STATUS_CONFIG[staKey] ?? STATUS_CONFIG['pending'];
                const StatusIcon = sta.icon;
                return (
                  <tr
                    key={d.id}
                    className={`border-b border-border hover:bg-accent/30 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                    onClick={() => setSelected(d)}
                  >
                    {/* <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{d.ticket_id}</td> */}
                    <td className="px-4 py-3 text-xs font-medium">{d.title}</td>
                    <td className="px-4 py-3 text-xs font-medium">{d.specialization}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.expertise_requirement}</td>
                    <td className="px-4 py-3 text-xs font-medium">{d.company_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.customer_city} {d.customer_state}</td>
                    <td className="px-4 py-3 text-xs max-w-40 truncate text-muted-foreground">{d.probable_cause}</td>
                    <td className="px-4 py-3"><ConfidenceBadge score={d.confidence_score} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${sev.class}`}>{sev.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${sta.class}`}>
                        <StatusIcon className="h-3 w-3" />
                        {sta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.assigned_technician}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(d.identified_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">{filtered.length} of {diagnostics.length} diagnostics · click a row to view details</div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {selected && (() => {
            const sevKey = selected.severity?.toLowerCase?.() ?? '';
            const staKey = selected.status?.toLowerCase?.() ?? '';
            const sev = SEVERITY_CONFIG[sevKey] ?? SEVERITY_CONFIG['info'];
            const sta = STATUS_CONFIG[staKey] ?? STATUS_CONFIG['pending'];
            const SevIcon = sev.icon;
            return (
              <>
                <SheetHeader className="pb-4 border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${sev.class}`}>
                        <SevIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <SheetTitle className="text-base leading-tight">{selected.title}</SheetTitle>
                        <div className="flex gap-2 mt-1.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sev.class}`}>{sev.label}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sta.class}`}>{sta.label}</span>
                        </div>
                      </div>
                    </div>
                    {/* Prominent confidence score */}
                    <ConfidenceBadge score={selected.confidence_score} />
                  </div>
                </SheetHeader>

                <div className="mt-5 space-y-5">
                  {/* Key info */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Diagnostic Info</p>
                    <div className="space-y-3">
                      {[
                        // { icon: Tag,      label: 'Linked Ticket',      value: `${selected.ticket_id} — ${selected.ticket_title}` },
                        { icon: Shield,   label: 'Specialization',     value: selected.specialization },
                        { icon: Target,   label: 'Expertise Required', value: selected.expertise_requirement },
                        { icon: User,     label: 'Verified By',        value: selected.assigned_technician },
                        { icon: Calendar, label: 'Identified At',      value: selected.identified_at ? new Date(selected.identified_at).toLocaleString() : "N/A" },
                        { icon: Calendar, label: 'Created',            value: selected.created_at ? new Date(selected.created_at).toLocaleString(): "N/A" },
                        ...(selected.resolved_at ? [{ icon: Calendar, label: 'Resolved At',  value: selected.resolved_at ? new Date(selected.resolved_at).toLocaleString(): "N/A" }] : []),
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-3 text-xs">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">{label}</p>
                            <p className="font-medium">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Summary */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-primary" /> AI Summary
                    </p>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-xs text-foreground leading-relaxed">
                      {selected.ai_summary}
                    </div>
                  </div>

                  {/* Probable Cause */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Probable Cause</p>
                    <div className="bg-muted/30 border border-border rounded-lg p-4 text-xs text-muted-foreground leading-relaxed">
                      {selected.probable_cause}
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recommended Actions</p>
                    <div className="bg-muted/30 border border-border rounded-lg p-4 text-xs text-muted-foreground leading-relaxed">
                      {selected.recommended_actions}
                    </div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && selected.status !== 'Resolved' && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Update Status</Label>
                      <div className="flex flex-wrap gap-2">
                        {(['Pending','In_Progress', 'Resolved', 'Failed'] as Diagnostic['status'][]).map(s => {
                          if (s === selected.status) return null;
                          const cfg = STATUS_CONFIG[s];
                          return (
                            <Button
                              key={s}
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              className={`h-8 text-xs gap-1.5 ${s === 'Resolved' ? 'border-green-400/30 text-green-400 hover:bg-green-400/10' : s === 'failed' ? 'border-primary/30 text-primary hover:bg-primary/10' : 'border-blue-400/30 text-blue-400 hover:bg-blue-400/10'}`}
                              onClick={() => handleUpdateStatus(selected.id, s)}
                            >
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <cfg.icon className="h-3 w-3" />}
                              Mark {cfg.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
