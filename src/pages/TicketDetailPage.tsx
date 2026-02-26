import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ticketApi, Ticket } from '@/services/ticketApi';
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
import RepairChecklist, { RepairStep } from '@/components/RepairChecklist';
import FloatingFelix from '@/components/FloatingFelix';
import {
  ArrowLeft, Search as SearchIcon, User, MapPin, Building,
  Cpu, Wrench, BookOpen, ShieldAlert, Clock, FileText, Save,
  Play, Package, CheckCircle2, Loader2, ExternalLink, AlertTriangle,
  ListChecks, ChevronRight, ChevronDown, Eye, Plus,
  Cog, Hammer, Settings,
} from 'lucide-react';

const STATUS_CLASSES: Record<string, string> = {
  open: 'status-open', assigned: 'status-open', in_progress: 'status-in-progress',
  awaiting_parts: 'status-in-progress', awaiting_approval: 'status-urgent', completed: 'status-closed',
};
const PRIORITY_CLASSES: Record<string, string> = {
  low: 'text-muted-foreground bg-muted/50 border border-border',
  medium: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20',
  high: 'text-orange-400 bg-orange-400/10 border border-orange-400/20',
  severe: 'text-primary bg-primary/10 border border-primary/20',
};

function stockIndicator(status: string, qty: number) {
  if (status === 'out_of_stock' || qty === 0) return { icon: '❌', label: 'Out of Stock', cls: 'text-primary bg-primary/10', detail: 'Est. delivery: 3-5 days' };
  if (status === 'low_stock' || qty <= 3) return { icon: '⚠', label: `Limited Stock (${qty} remaining)`, cls: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10', detail: '' };
  return { icon: '✅', label: `In Stock (${qty} available)`, cls: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10', detail: '' };
}

function generateRepairSteps(ticket: Ticket, diag: Diagnostic | null): RepairStep[] {
  const steps: RepairStep[] = [];
  let id = 1;
  steps.push({ id: id++, label: 'Verify ticket details and review diagnostic report', detail: 'Confirm fault code matches onsite conditions.', required: true });
  steps.push({ id: id++, label: 'Gather required PPE and safety equipment', detail: 'Hard hat, safety glasses, gloves, steel-toe boots.', required: true });
  if (diag) {
    steps.push({ id: id++, label: `Confirm fault code ${diag.fault_code} on equipment`, detail: `Use diagnostic scanner to verify ${diag.fault_code} is active.`, required: true });
    if (diag.recommended_actions) {
      diag.recommended_actions.split('.').filter(s => s.trim()).forEach(s => {
        steps.push({ id: id++, label: s.trim(), required: true });
      });
    }
  } else {
    steps.push({ id: id++, label: `Inspect ${ticket.category || 'system'} for reported issue`, required: true });
    steps.push({ id: id++, label: 'Run diagnostic scan to identify fault codes', required: true });
  }
  steps.push({ id: id++, label: 'Test affected components after repair', detail: 'Run system for 15 minutes under load.', required: true });
  steps.push({ id: id++, label: 'Verify system operates within normal parameters', required: true });
  steps.push({ id: id++, label: 'Clean work area and return tools', required: false });
  steps.push({ id: id++, label: 'Take before/after photos', detail: 'Document equipment condition post-repair.', required: false });
  steps.push({ id: id++, label: 'Log repair notes, parts used, and time spent', required: true });
  steps.push({ id: id++, label: 'Update ticket status to completed', required: true });
  return steps;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const isTech = isRole('engine_technician', 'electrical_technician');

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

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id);
    Promise.all([
      ticketApi.getById(numId),
      diagnosticsApi.getAll(),
      manualApi.getAll(),
      partApi.getAll(),
      componentApi.getAll(),
    ]).then(([t, diags, mans, pts, comps]) => {
      setTicket(t);
      setDiagnostics(diags.filter(d => d.title.toLowerCase().includes(t.category.toLowerCase()) || d.component_name.toLowerCase().includes(t.category.toLowerCase())));
      setManuals(mans.filter(m => m.category.toLowerCase() === t.category.toLowerCase() || m.tags.some(tag => tag.name.toLowerCase() === t.category.toLowerCase())));
      setParts(pts);
      setComponents(comps);
    }).catch(() => {
      toast({ title: 'Error', description: 'Ticket not found.', variant: 'destructive' });
      navigate(-1);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = async (newStatus: Ticket['status']) => {
    if (!ticket) return;
    setSaving(true);
    try {
      const updated = await ticketApi.update(ticket.id, { status: newStatus });
      setTicket(prev => prev ? { ...prev, ...updated, status: newStatus } : null);
      toast({ title: 'Status Updated', description: `Ticket marked as ${newStatus.replace(/_/g, ' ')}.` });
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

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const diag = diagnostics[0] || null;
  const relatedParts = parts.filter(p =>
    p.category.toLowerCase() === ticket.category.toLowerCase() ||
    p.components_name.some(cn => cn.toLowerCase().includes(ticket.category.toLowerCase()))
  );
  const relatedComponents = components.filter(c =>
    c.group.toLowerCase() === ticket.category.toLowerCase() ||
    c.name.toLowerCase().includes(ticket.category.toLowerCase())
  );
  const repairSteps = generateRepairSteps(ticket, diag);

  // ── Summary view (before clicking "View Full Repair") ──
  if (!showFullDetail) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-primary text-sm font-semibold">{ticket.ticket_id}</span>
              <Badge className={`text-[10px] ${STATUS_CLASSES[ticket.status]}`}>{ticket.status.replace(/_/g, ' ')}</Badge>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full capitalize ${PRIORITY_CLASSES[ticket.priority]}`}>
                {ticket.priority === 'severe' ? 'Critical' : ticket.priority}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-foreground mt-1">{ticket.title}</h1>
          </div>
        </div>

        {/* Ticket Summary */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <InfoRow label="Category" value={ticket.category} icon={Wrench} />
              <InfoRow label="Product ID" value={ticket.product_id} icon={Cpu} />
              <InfoRow label="Created" value={new Date(ticket.created_at).toLocaleDateString()} icon={Clock} />
              <InfoRow label="Assets" value={ticket.assets || 'N/A'} icon={Cpu} />
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Issue Description</p>
              <p className="text-xs text-foreground/80 bg-muted/30 border border-border rounded-lg p-3 leading-relaxed">
                {ticket.issue_description || ticket.description || 'No description provided.'}
              </p>
            </div>

            {/* Diagnostic alert - clickable */}
            {diag && (
              <div
                className="bg-primary/5 border border-primary/20 rounded-lg p-3 cursor-pointer hover:bg-primary/10 transition-colors group"
                onClick={() => setDiagModal(diag)}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">Diagnostic Alert</p>
                  <span className="text-[9px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                    <Eye className="h-3 w-3" /> View Full Report
                  </span>
                </div>
                <p className="text-xs text-foreground/80">
                  Fault Code: <span className="font-mono font-semibold text-primary">{diag.fault_code}</span> · Confidence: {diag.confidence_score}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">{diag.probable_cause}</p>
              </div>
            )}

            {/* Collapsible customer info */}
            <Collapsible open={customerExpanded} onOpenChange={setCustomerExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                  <User className="h-3.5 w-3.5" />
                  <span>Customer Information</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${customerExpanded ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid sm:grid-cols-2 gap-3 pt-2 pb-1">
                  <InfoRow label="Customer" value={ticket.customer} icon={User} />
                  <InfoRow label="Created By" value={ticket.created_by} icon={User} />
                  {diag && (
                    <>
                      <InfoRow label="Company" value={diag.company_name} icon={Building} />
                      <InfoRow label="Location" value={`${diag.customer_city}, ${diag.customer_state}`} icon={MapPin} />
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {isTech && ticket.status !== 'completed' && (
          <div className="flex gap-2 flex-wrap">
            {ticket.status !== 'in_progress' && (
              <Button size="sm" className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/80 text-white" onClick={() => handleStatusUpdate('in_progress')} disabled={saving}>
                <Play className="h-3.5 w-3.5" /> Start Work
              </Button>
            )}
            {ticket.status !== 'awaiting_parts' && (
              <Button size="sm" variant="outline" className="gap-2" onClick={() => handleStatusUpdate('awaiting_parts')} disabled={saving}>
                <Package className="h-3.5 w-3.5" /> Waiting for Parts
              </Button>
            )}
            <Button size="sm" className="gap-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/80 text-white" onClick={() => handleStatusUpdate('completed')} disabled={saving}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
            </Button>
          </div>
        )}

        {/* View Full Details */}
        <Button className="w-full gap-2 bg-primary hover:bg-primary/90 h-12 text-sm" onClick={() => setShowFullDetail(true)}>
          <ListChecks className="h-4 w-4" /> View Full Repair Details & Checklist
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Diagnostic Modal */}
        <DiagnosticReportModal diagnostic={diagModal} open={!!diagModal} onClose={() => setDiagModal(null)} />

        {/* Floating Felix */}
        <FloatingFelix ticketContext={`Ticket ${ticket.ticket_id}: ${ticket.title}`} componentContext={ticket.category} />
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
            <Badge className={`text-[9px] ${STATUS_CLASSES[ticket.status]}`}>{ticket.status.replace(/_/g, ' ')}</Badge>
            <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full capitalize ${PRIORITY_CLASSES[ticket.priority]}`}>
              {ticket.priority === 'severe' ? 'Critical' : ticket.priority}
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
          <RepairChecklist steps={repairSteps} />

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
                    <p className="text-[11px] text-muted-foreground text-center py-3">No manuals found for this category.</p>
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

      {/* Floating Felix */}
      <FloatingFelix ticketContext={`Ticket ${ticket.ticket_id}: ${ticket.title}`} componentContext={ticket.category} />
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
