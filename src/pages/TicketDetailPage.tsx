import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ticketApi, Ticket, TicketChecklistProgress, TicketChecklistStep } from '@/services/ticketApi';
import { scheduleApi, Schedule, formatDuration } from '@/services/scheduleApi';
import { diagnosticsApi, Diagnostic } from '@/services/diagnosticsApi';
import { manualApi, Manual } from '@/services/manualApi';
import { partApi, Part } from '@/services/partApi';
import { componentApi, Component } from '@/services/componentApi';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfViewer from '@/components/PdfViewer';
import DiagnosticReportModal from '@/components/DiagnosticReportModal';
import RepairChecklist, { RepairStep, RepairStepProgress } from '@/components/RepairChecklist';
import { ticketPriorityBadgeClass, ticketPriorityLabel, ticketStatusBadgeClass } from '@/lib/ticketBadges';
import {
  ArrowLeft, Search as SearchIcon, User, MapPin, Building,
  Cpu, Wrench, BookOpen, ShieldAlert, Clock, FileText, Save,
  Play, Package, CheckCircle2, Loader2, ExternalLink, AlertTriangle,
  ListChecks, ChevronRight, ChevronDown, Eye, Plus,
  Cog, Hammer, Settings, CalendarDays,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  awaiting_parts: 'Awaiting Parts', awaiting_approval: 'Escalated', completed: 'Completed',
};

function stockIndicator(status: string, qty: number) {
  if (status === 'out_of_stock' || qty === 0) return { icon: '❌', label: 'Out of Stock', cls: 'text-primary bg-primary/10', detail: 'Est. delivery: 3-5 days' };
  if (status === 'low_stock' || qty <= 3) return { icon: '⚠', label: `Limited Stock (${qty} remaining)`, cls: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10', detail: '' };
  return { icon: '✅', label: `In Stock (${qty} available)`, cls: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10', detail: '' };
}

function generateFallbackRepairSteps(ticket: Ticket, diag: Diagnostic | null): RepairStep[] {
  const steps: RepairStep[] = [];
  let id = 1;
  const stepId = () => `fallback-${id++}`;
  steps.push({ id: stepId(), label: 'Verify ticket details and review diagnostic report', detail: 'Confirm fault code matches onsite conditions.', required: true });
  steps.push({ id: stepId(), label: 'Gather required PPE and safety equipment', detail: 'Hard hat, safety glasses, gloves, steel-toe boots.', required: true });
  if (diag) {
    steps.push({ id: stepId(), label: `Confirm fault code ${diag.fault_code} on equipment`, detail: `Use diagnostic scanner to verify ${diag.fault_code} is active.`, required: true });
    if (diag.recommended_actions) {
      diag.recommended_actions.split('.').filter(s => s.trim()).forEach(s => {
        steps.push({ id: stepId(), label: s.trim(), required: true });
      });
    }
  } else {
    steps.push({ id: stepId(), label: `Inspect ${ticket.specialization || 'system'} for reported issue`, required: true });
    steps.push({ id: stepId(), label: 'Run diagnostic scan to identify fault codes', required: true });
  }
  steps.push({ id: stepId(), label: 'Test affected components after repair', detail: 'Run system for 15 minutes under load.', required: true });
  steps.push({ id: stepId(), label: 'Verify system operates within normal parameters', required: true });
  steps.push({ id: stepId(), label: 'Clean work area and return tools', required: false });
  steps.push({ id: stepId(), label: 'Take before/after photos', detail: 'Document equipment condition post-repair.', required: false });
  steps.push({ id: stepId(), label: 'Log repair notes, parts used, and time spent', required: true });
  steps.push({ id: stepId(), label: 'Update ticket status to completed', required: true });
  return steps;
}

const mapChecklistSteps = (template: TicketChecklistStep[], ticket: Ticket, diag: Diagnostic | null): RepairStep[] => {
  if (!Array.isArray(template) || template.length === 0) {
    return generateFallbackRepairSteps(ticket, diag);
  }
  return template
    .map((item) => {
      const id = String(item?.id || '').trim();
      const title = String(item?.title || '').trim();
      if (!id || !title) return null;
      const detail = String(item?.instructions || '').trim();
      return {
        id,
        label: title,
        detail: detail || undefined,
        required: Boolean(item?.required ?? true),
      } satisfies RepairStep;
    })
    .filter((item): item is RepairStep => Boolean(item));
};

const normalizeChecklistProgress = (progress: TicketChecklistProgress[]): RepairStepProgress[] => {
  if (!Array.isArray(progress)) return [];
  return progress
    .map((item) => {
      const itemId = String(item?.item_id || '').trim();
      if (!itemId) return null;
      return {
        item_id: itemId,
        done: Boolean(item?.done),
        note: String(item?.note || ''),
        flagged: Boolean(item?.flagged),
        time_minutes: Number.isFinite(Number(item?.time_minutes)) ? Number(item?.time_minutes) : 0,
        photos: Array.isArray(item?.photos) ? item.photos : [],
      } satisfies RepairStepProgress;
    })
    .filter((item): item is RepairStepProgress => Boolean(item));
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const isTech = isRole('technician');

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFullDetail, setShowFullDetail] = useState(false);

  // Modal states
  const [diagModal, setDiagModal] = useState<Diagnostic | null>(null);
  const [pdfModal, setPdfModal] = useState<Manual | null>(null);

  // Technician actions
  const [repairNotes, setRepairNotes] = useState('');
  const [timeSpent, setTimeSpent] = useState('');
  const [customerExpanded, setCustomerExpanded] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [checklistProgress, setChecklistProgress] = useState<RepairStepProgress[]>([]);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [checklistDirtyTick, setChecklistDirtyTick] = useState(0);
  const checklistSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      ticketApi.getById(id),
      diagnosticsApi.getAll(),
      manualApi.getAll(),
      partApi.getAll(),
      componentApi.getAll(),
    ]).then(([t, diags, mans, pts, comps]) => {
      setTicket(t);
      const spec = (t.specialization || '').toLowerCase();
      setDiagnostics(diags.filter(d => (d.title || '').toLowerCase().includes(spec) || (d.component_name || '').toLowerCase().includes(spec)));
      setManuals(mans.filter(m => (m.category || '').toLowerCase() === spec || (m.tags || []).some(tag => (tag.name || '').toLowerCase() === spec)));
      setParts(pts);
      setComponents(comps);
    }).catch(() => {
      toast({ title: 'Error', description: 'Ticket not found.', variant: 'destructive' });
      navigate(-1);
    }).finally(() => setLoading(false));
  }, [id, navigate, toast]);

  // Schedules: use ticket.schedules if present, else fetch GET /api/tickets/{id}/schedules/
  useEffect(() => {
    if (!id) return;
    if (ticket?.schedules && ticket.schedules.length > 0) {
      setSchedules(ticket.schedules);
      return;
    }
    scheduleApi.getByTicketId(id).then(setSchedules).catch(() => setSchedules([]));
  }, [id, ticket?.schedules]);

  useEffect(() => {
    if (!ticket) return;
    setChecklistProgress(normalizeChecklistProgress(ticket.checklist_progress || []));
  }, [ticket?.id, ticket?.checklist_progress]);

  useEffect(() => {
    if (!ticket || checklistDirtyTick <= 0) return;
    if (checklistSaveTimer.current) clearTimeout(checklistSaveTimer.current);
    checklistSaveTimer.current = setTimeout(async () => {
      try {
        setSavingChecklist(true);
        const updated = await ticketApi.updateChecklistProgress(ticket.id, checklistProgress);
        setTicket(prev => prev ? { ...prev, checklist_progress: updated.checklist_progress } : prev);
      } catch {
        toast({ title: 'Checklist save failed', description: 'Could not persist checklist progress.', variant: 'destructive' });
      } finally {
        setSavingChecklist(false);
      }
    }, 700);
    return () => {
      if (checklistSaveTimer.current) clearTimeout(checklistSaveTimer.current);
    };
  }, [checklistDirtyTick, checklistProgress, ticket, toast]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!ticket) return;
    setSaving(true);
    try {
      const updated = await ticketApi.update(ticket.id, { status: newStatus });
      setTicket(prev => prev ? { ...prev, ...updated, status: newStatus } : null);
      toast({ title: 'Status Updated', description: `Ticket marked as ${STATUS_LABELS[newStatus] ?? newStatus.replace(/_/g, ' ')}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleSaveNotes = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      const desc = `${ticket.description}\n\n--- Technician Notes (${new Date().toLocaleString()}) ---\n${repairNotes}${timeSpent ? `\nTime logged: ${timeSpent} hrs` : ''}`;
      await ticketApi.update(ticket.id, { description: desc });
      setTicket(prev => prev ? { ...prev, description: desc } : null);
      setRepairNotes('');
      setTimeSpent('');
      toast({ title: 'Notes Saved', description: 'Repair notes have been logged.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save notes.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleManualAction = (action: string, manual: Manual) => {
    const payload = {
      action,
      manual_id: manual.id,
      manual_title: manual.title,
      component: manual.component.map(c => ({ id: c.id, name: c.name })),
      parts: manual.parts_needed.map(p => ({ id: p.id, name: p.name, part_number: p.part_number })),
      ticket_id: ticket?.ticket_id,
    };
    console.log(`Manual Action [${action}]:`, payload);
    toast({ title: `${action} Started`, description: `Sending ${action.toLowerCase()} data for ${manual.title}.` });
  };

  const handleChecklistProgressChange = (progress: RepairStepProgress[]) => {
    if (!ticket?.checklist_template?.length) return;
    setChecklistProgress(progress);
    setChecklistDirtyTick(Date.now());
  };

  const handleRegenerateChecklist = async () => {
    if (!ticket) return;
    setSavingChecklist(true);
    try {
      const updated = await ticketApi.regenerateChecklist(ticket.id);
      setTicket(prev => prev ? { ...prev, ...updated } : updated);
      setChecklistProgress(normalizeChecklistProgress(updated.checklist_progress || []));
      toast({ title: 'Checklist regenerated', description: 'Updated steps from knowledge context.' });
    } catch {
      toast({ title: 'Regenerate failed', description: 'Could not regenerate checklist.', variant: 'destructive' });
    } finally {
      setSavingChecklist(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-56 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
          <Skeleton className="h-[28rem] w-full rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 flex-1 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const diag = diagnostics[0] || null;
  const spec = (ticket.specialization || '').toLowerCase();
  const relatedParts = parts.filter(p =>
    (p.category || '').toLowerCase() === spec ||
    (p.components_name || []).some(cn => (cn || '').toLowerCase().includes(spec))
  );
  const relatedComponents = components.filter(c =>
    (c.group || '').toLowerCase() === spec ||
    (c.name || '').toLowerCase().includes(spec)
  );
  const hasServerChecklist = Array.isArray(ticket.checklist_template) && ticket.checklist_template.length > 0;
  const repairSteps = mapChecklistSteps(ticket.checklist_template || [], ticket, diag);

  // ── Summary view (before clicking "View Full Repair") ──
  if (!showFullDetail) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-primary text-sm font-semibold">{ticket.ticket_id}</span>
              <Badge className={`text-[10px] ${ticketStatusBadgeClass(ticket.status)}`}>{STATUS_LABELS[ticket.status] ?? ticket.status.replace(/_/g, ' ')}</Badge>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full capitalize ${ticketPriorityBadgeClass(ticket.priority)}`}>
                {ticketPriorityLabel(ticket.priority) || ticket.priority}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-foreground mt-1">{ticket.title}</h1>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <InfoRow label="Specialization" value={ticket.specialization} icon={Wrench} />
                  <InfoRow label="Severity" value={String(ticket.severity)} icon={Cpu} />
                  <InfoRow label="Created" value={new Date(ticket.created_at).toLocaleDateString()} icon={Clock} />
                  <InfoRow label="Assigned To" value={ticket.assigned_to || 'Unassigned'} icon={User} />
                  <InfoRow label="Customer" value={ticket.customer} icon={Building} />
                  <InfoRow label="Auto Assigned" value={ticket.auto_assigned ? 'Yes' : 'No'} icon={Cpu} />
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Issue Description</p>
                  <p className="text-xs text-foreground/80 bg-muted/30 border border-border rounded-lg p-3 leading-relaxed">
                    {ticket.issue_description || ticket.description || 'No description provided.'}
                  </p>
                </div>

                {/* Schedule */}
                {schedules.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> Schedule
                    </p>
                    <div className="space-y-2">
                      {schedules.map((s) => (
                        <div key={s.id} className="text-xs bg-muted/30 border border-border rounded-lg p-3 space-y-1">
                          <p><span className="text-muted-foreground">Starts:</span> {new Date(s.scheduled_time).toLocaleString()}</p>
                          {(s.estimated_end_time || s.estimated_duration_minutes != null) && (
                            <p>
                              <span className="text-muted-foreground">Estimated end:</span>{' '}
                              {s.estimated_end_time ? new Date(s.estimated_end_time).toLocaleString() : `+${s.estimated_duration_minutes} min`}
                            </p>
                          )}
                          <p><span className="text-muted-foreground">Duration:</span> {formatDuration(s.duration)}</p>
                          <p><span className="text-muted-foreground">Technician:</span> {s.technician_name || '—'}</p>
                          {s.description && <p className="text-muted-foreground mt-1">{s.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Info */}
                <Collapsible open={customerExpanded} onOpenChange={setCustomerExpanded}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                      <User className="h-3.5 w-3.5" />
                      <span>Customer Details</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${customerExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid sm:grid-cols-2 gap-3 pt-2 pb-1">
                      <InfoRow label="Created By" value={ticket.created_by} icon={User} />
                      {diag && (
                        <>
                          <InfoRow label="Company" value={diag.company_name} icon={Building} />
                          <InfoRow label="Address" value={`${diag.customer_street_address}${diag.customer_street_address_2 ? ', ' + diag.customer_street_address_2 : ''}`} icon={MapPin} />
                          <InfoRow label="City" value={`${diag.customer_city}, ${diag.customer_state} ${diag.customer_postal_code}`} icon={MapPin} />
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Diagnostic Report */}
            {diag && (
              <Card className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setDiagModal(diag)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary" /> Diagnostic Report
                    </CardTitle>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View Full Report
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-1 rounded">{diag.fault_code}</span>
                    <Badge variant="outline" className="text-[10px]">{diag.severity}</Badge>
                    <span className="text-[10px] text-muted-foreground">Confidence: {diag.confidence_score}%</span>
                  </div>
                  <p className="text-xs text-foreground/80">{diag.probable_cause}</p>
                  <p className="text-[10px] text-muted-foreground">{diag.ai_summary}</p>
                </CardContent>
              </Card>
            )}

            {/* View Full Repair button */}
            <Button className="w-full gap-2 bg-primary hover:bg-primary/90 h-12 text-sm" onClick={() => setShowFullDetail(true)}>
              <ListChecks className="h-4 w-4" /> View Full Repair Details & Checklist
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* ── RIGHT COLUMN: Map ── */}
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Route to Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {diag ? (
                <iframe
                  title="Route Map"
                  className="w-full h-[24rem] lg:h-[28rem] border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&destination=${encodeURIComponent(`${diag.customer_street_address}, ${diag.customer_city}, ${diag.customer_state} ${diag.customer_postal_code}`)}&origin=current+location&mode=driving`}
                  allowFullScreen
                />
              ) : (
                <div className="h-[24rem] lg:h-[28rem] flex items-center justify-center bg-muted/30">
                  <div className="text-center space-y-2">
                    <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">No customer address available for routing.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom action buttons */}
        {isTech && ticket.status !== 'completed' && (
          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 gap-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/80 text-white h-12 text-sm font-semibold"
              onClick={() => handleStatusUpdate('completed')}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Mark as Complete
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={`flex-1 gap-2 h-12 text-sm font-semibold ${ticket.status === 'awaiting_approval' ? 'border-primary/50 text-primary' : 'border-[hsl(var(--warning))]/50 text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/10'}`}
              onClick={() => handleStatusUpdate('awaiting_approval')}
              disabled={saving || ticket.status === 'awaiting_approval'}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {ticket.status === 'awaiting_approval' ? 'Escalated' : 'Escalate'}
            </Button>
          </div>
        )}

        {/* Diagnostic Modal */}
        <DiagnosticReportModal diagnostic={diagModal} open={!!diagModal} onClose={() => setDiagModal(null)} />

      </div>
    );
  }

  // ── Full detail split-panel view ──
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Compact header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => setShowFullDetail(false)} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-primary text-xs font-semibold">{ticket.ticket_id}</span>
            <Badge className={`text-[9px] ${ticketStatusBadgeClass(ticket.status)}`}>{STATUS_LABELS[ticket.status] ?? ticket.status.replace(/_/g, ' ')}</Badge>
            <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full capitalize ${ticketPriorityBadgeClass(ticket.priority)}`}>
              {ticketPriorityLabel(ticket.priority) || ticket.priority}
            </span>
          </div>
          <h1 className="text-sm font-semibold text-foreground truncate">{ticket.title}</h1>
        </div>
        {/* Quick status buttons */}
        {isTech && ticket.status !== 'completed' && (
          <div className="flex gap-1.5 flex-shrink-0">
            {ticket.status !== 'in_progress' && (
              <Button size="sm" className="h-8 text-[10px] gap-1 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/80 text-white" onClick={() => handleStatusUpdate('in_progress')} disabled={saving}>
                <Play className="h-3 w-3" /> Start
              </Button>
            )}
            <Button size="sm" className="h-8 text-[10px] gap-1 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/80 text-white" onClick={() => handleStatusUpdate('completed')} disabled={saving}>
              <CheckCircle2 className="h-3 w-3" /> Complete
            </Button>
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[10px] gap-1"
          onClick={handleRegenerateChecklist}
          disabled={savingChecklist}
        >
          {savingChecklist ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListChecks className="h-3 w-3" />}
          Regenerate Checklist
        </Button>
      </div>

      {/* Split panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: Primary work area ── */}
        <div className="flex-1 lg:flex-[2] overflow-y-auto p-4 lg:p-6 space-y-6">

          {/* Diagnostic Report (clickable) */}
          {diag && (
            <Card className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setDiagModal(diag)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <SearchIcon className="h-4 w-4 text-primary" /> Diagnostic Report
                  </CardTitle>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Tap for full report
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <MiniInfo label="Diagnostic" value={diag.diagnostic_id} />
                  <MiniInfo label="Fault Code" value={diag.fault_code} />
                  <MiniInfo label="Confidence" value={`${diag.confidence_score}%`} />
                  <MiniInfo label="Severity" value={diag.severity} />
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{diag.ai_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Repair Checklist */}
          <RepairChecklist
            steps={repairSteps}
            progress={checklistProgress}
            ticketContext={`Ticket ${ticket.ticket_id}: ${ticket.title}`}
            componentContext={ticket.specialization}
            onProgressChange={hasServerChecklist ? handleChecklistProgressChange : undefined}
            saving={savingChecklist}
          />

          {/* Technician Notes */}
          {isTech && ticket.status !== 'completed' && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Repair Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea placeholder="Describe the work performed..." value={repairNotes} onChange={e => setRepairNotes(e.target.value)} rows={3} className="bg-background resize-none text-xs" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Time (hrs)</Label>
                    <input type="number" step="0.25" min="0" placeholder="e.g. 2.5" value={timeSpent} onChange={e => setTimeSpent(e.target.value)} className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <Button className="gap-2 bg-primary hover:bg-primary/90" size="sm" onClick={handleSaveNotes} disabled={saving || (!repairNotes.trim() && !timeSpent)}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── RIGHT: Reference & Tools (independent scroll) ── */}
        <div className="hidden lg:flex lg:flex-[1] flex-col border-l border-border overflow-hidden bg-card/30">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">

              {/* Quick Actions */}
              {isTech && ticket.status !== 'completed' && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {ticket.status !== 'awaiting_parts' && (
                      <Button size="sm" variant="outline" className="w-full h-9 text-[11px] gap-2" onClick={() => handleStatusUpdate('awaiting_parts')} disabled={saving}>
                        <Package className="h-3.5 w-3.5" /> Waiting for Parts
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="w-full h-9 text-[11px] gap-2" onClick={() => handleStatusUpdate('completed')} disabled={saving}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Complete Ticket
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Parts */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-primary" /> Required Parts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {relatedParts.length > 0 ? (
                    <div className="space-y-2">
                      {relatedParts.map(p => {
                        const stock = stockIndicator(p.status, p.quantity_available);
                        return (
                          <div key={p.id} className="border border-border rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-medium">{p.name}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{p.part_number}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${stock.cls}`}>
                                {stock.icon} {stock.label}
                              </span>
                            </div>
                            {stock.detail && (
                              <p className="text-[9px] text-muted-foreground">{stock.detail}</p>
                            )}
                            <Button variant="outline" size="sm" className="w-full h-7 text-[10px] gap-1">
                              <Plus className="h-3 w-3" /> Add to Repair
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground text-center py-3">No parts matched.</p>
                  )}
                </CardContent>
              </Card>

              {/* Manuals */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-primary" /> Repair Manuals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {manuals.length > 0 ? manuals.map(m => (
                    <div key={m.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div>
                        <p className="text-xs font-medium">{m.title}</p>
                        <p className="text-[10px] text-muted-foreground">{m.category} · {m.version}</p>
                      </div>
                      {m.content && (
                        <p className="text-[10px] text-foreground/60 leading-relaxed line-clamp-3">{m.content}</p>
                      )}
                      <div className="flex gap-1.5 flex-wrap">
                        {m.file && (
                          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={(e) => { e.stopPropagation(); setPdfModal(m); }}>
                            <FileText className="h-2.5 w-2.5" /> Show PDF
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={() => handleManualAction('Assembly', m)}>
                          <Cog className="h-2.5 w-2.5" /> Assembly
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={() => handleManualAction('Disassembly', m)}>
                          <Hammer className="h-2.5 w-2.5" /> Disassembly
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={() => handleManualAction('Maintenance', m)}>
                          <Settings className="h-2.5 w-2.5" /> Maintenance
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[11px] text-muted-foreground text-center py-3">No manuals found for this specialization.</p>
                  )}
                </CardContent>
              </Card>

              {/* Safety */}
              <Card className="bg-card border-[hsl(var(--warning))]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold flex items-center gap-2 text-[hsl(var(--warning))]">
                    <ShieldAlert className="h-3.5 w-3.5" /> Safety
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-[10px] text-muted-foreground">
                    <li>• Disconnect battery before electrical work</li>
                    <li>• Use appropriate PPE at all times</li>
                    <li>• Ensure engine is cool before coolant work</li>
                    <li>• Follow lockout/tagout procedures</li>
                    <li>• Report unsafe conditions immediately</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Mobile: Parts & Manuals (shown below on small screens) */}
      <div className="lg:hidden">
        {/* These are in the left scroll on mobile */}
      </div>

      {/* Diagnostic Modal */}
      <DiagnosticReportModal diagnostic={diagModal} open={!!diagModal} onClose={() => setDiagModal(null)} />

      {/* PDF Modal */}
      <Dialog open={!!pdfModal} onOpenChange={open => { if (!open) setPdfModal(null); }}>
        <DialogContent className="max-w-4xl h-[85vh] bg-card p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-border">
            <DialogTitle className="text-sm">{pdfModal?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4" style={{ height: 'calc(85vh - 60px)' }}>
            {pdfModal?.file && <PdfViewer url={pdfModal.file} title={pdfModal.title} />}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {Icon && (
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-3 w-3 text-primary" />
        </div>
      )}
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value || 'N/A'}</p>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}
