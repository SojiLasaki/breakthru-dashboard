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
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import PdfViewer from '@/components/PdfViewer';
import {
  ArrowLeft, Search as SearchIcon, User, MapPin, Building,
  Cpu, Wrench, BookOpen, ShieldAlert, Clock, FileText, Save,
  Play, Package, CheckCircle2, Loader2, ExternalLink, AlertTriangle,
  ListChecks, ChevronRight,
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
const STOCK_CLASSES: Record<string, { label: string; cls: string }> = {
  in_stock: { label: 'In Stock', cls: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' },
  low_stock: { label: 'Low Stock', cls: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10' },
  out_of_stock: { label: 'Out of Stock', cls: 'text-primary bg-primary/10' },
};

// Generate repair steps from diagnostic + manual data
function generateRepairSteps(ticket: Ticket, diag: Diagnostic | null, manual: Manual | null): string[] {
  const steps: string[] = [];
  steps.push('Verify ticket details and review diagnostic report');
  steps.push('Gather required PPE and safety equipment');
  if (diag) {
    steps.push(`Confirm fault code ${diag.fault_code} on equipment`);
    if (diag.recommended_actions) {
      diag.recommended_actions.split('.').filter(s => s.trim()).forEach(s => steps.push(s.trim()));
    }
  } else {
    steps.push(`Inspect ${ticket.category || 'system'} for reported issue`);
    steps.push('Run diagnostic scan to identify fault codes');
  }
  steps.push('Test affected components after repair');
  steps.push('Verify system operates within normal parameters');
  steps.push('Clean work area and return tools');
  steps.push('Log repair notes, parts used, and time spent');
  steps.push('Update ticket status to completed');
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

  // Technician actions
  const [repairNotes, setRepairNotes] = useState('');
  const [timeSpent, setTimeSpent] = useState('');
  const [pdfModal, setPdfModal] = useState<Manual | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

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
      const completedCount = Object.values(checkedSteps).filter(Boolean).length;
      const desc = `${ticket.description}\n\n--- Technician Notes (${new Date().toLocaleString()}) ---\n${repairNotes}${timeSpent ? `\nTime logged: ${timeSpent} hrs` : ''}\nChecklist: ${completedCount} steps completed`;
      await ticketApi.update(ticket.id, { description: desc });
      setTicket(prev => prev ? { ...prev, description: desc } : null);
      setRepairNotes('');
      setTimeSpent('');
      toast({ title: 'Notes Saved', description: 'Repair notes have been logged.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save notes.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
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
  const repairSteps = generateRepairSteps(ticket, diag, manuals[0] || null);
  const completedSteps = Object.values(checkedSteps).filter(Boolean).length;
  const progress = repairSteps.length > 0 ? Math.round((completedSteps / repairSteps.length) * 100) : 0;

  // ── Initial summary view ──
  if (!showFullDetail) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
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

        {/* Ticket Summary Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <InfoRow label="Customer" value={ticket.customer} icon={User} />
              <InfoRow label="Category" value={ticket.category} icon={Wrench} />
              <InfoRow label="Product ID" value={ticket.product_id} icon={Cpu} />
              <InfoRow label="Created" value={new Date(ticket.created_at).toLocaleDateString()} icon={Clock} />
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Issue Description</p>
              <p className="text-xs text-foreground/80 bg-muted/30 border border-border rounded-lg p-3 leading-relaxed">
                {ticket.issue_description || ticket.description || 'No description provided.'}
              </p>
            </div>

            {diag && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">Diagnostic Alert</p>
                <p className="text-xs text-foreground/80">
                  Fault Code: <span className="font-mono font-semibold text-primary">{diag.fault_code}</span> · Confidence: {diag.confidence_score}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">{diag.probable_cause}</p>
              </div>
            )}
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

        {/* View Full Details Button */}
        <Button
          className="w-full gap-2 bg-primary hover:bg-primary/90"
          onClick={() => setShowFullDetail(true)}
        >
          <ListChecks className="h-4 w-4" /> View Full Repair Details & Checklist
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ── Full detail view with checklist ──
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setShowFullDetail(false)} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-primary text-sm font-semibold">{ticket.ticket_id}</span>
            <Badge className={`text-[10px] ${STATUS_CLASSES[ticket.status]}`}>{ticket.status.replace(/_/g, ' ')}</Badge>
          </div>
          <h1 className="text-lg font-semibold text-foreground mt-1">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Repair Checklist */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" /> Repair Checklist
                </CardTitle>
                <span className="text-xs text-muted-foreground">{completedSteps}/{repairSteps.length} · {progress}%</span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {repairSteps.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${checkedSteps[i] ? 'bg-[hsl(var(--success))]/5' : 'hover:bg-muted/30'}`}
                  onClick={() => toggleStep(i)}
                >
                  <Checkbox
                    checked={!!checkedSteps[i]}
                    onCheckedChange={() => toggleStep(i)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className={`text-xs ${checkedSteps[i] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      <span className="font-semibold text-primary mr-1.5">Step {i + 1}.</span>
                      {step}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Diagnostic Information */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <SearchIcon className="h-4 w-4 text-primary" /> Diagnostic Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diag ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoRow label="Diagnostic ID" value={diag.diagnostic_id} />
                    <InfoRow label="Fault Code" value={diag.fault_code} />
                    <InfoRow label="Confidence" value={`${diag.confidence_score}%`} />
                    <InfoRow label="Specialization" value={diag.specialization} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">AI Summary</p>
                    <p className="text-xs text-foreground/80 bg-muted/30 border border-border rounded-lg p-3 leading-relaxed">{diag.ai_summary}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Probable Cause</p>
                    <p className="text-xs text-foreground/80">{diag.probable_cause}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Recommended Actions</p>
                    <p className="text-xs text-foreground/80">{diag.recommended_actions}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No diagnostic data linked to this ticket.</p>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diag ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <InfoRow label="Name" value={`${diag.customer_first_name} ${diag.customer_last_name}`} icon={User} />
                  <InfoRow label="Company" value={diag.company_name} icon={Building} />
                  <InfoRow label="Address" value={`${diag.customer_street_address}, ${diag.customer_city}, ${diag.customer_state}`} icon={MapPin} />
                  <InfoRow label="Equipment" value={diag.component_name} icon={Cpu} />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  <InfoRow label="Customer" value={ticket.customer} icon={User} />
                  <InfoRow label="Product ID" value={ticket.product_id} icon={Cpu} />
                  <InfoRow label="Assets" value={ticket.assets || 'N/A'} icon={Cpu} />
                  <InfoRow label="Created By" value={ticket.created_by} icon={User} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Components & Parts */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Components & Parts Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatedComponents.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Component Groups</p>
                  <div className="space-y-2">
                    {relatedComponents.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-muted/20 border border-border rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-medium">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.component_number} · {c.group}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{c.parts_count} parts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {relatedParts.length > 0 ? (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Parts Needed</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 pr-3">Part</th><th className="text-left py-2 pr-3">Part #</th><th className="text-center py-2 pr-3">Qty</th><th className="text-right py-2">Stock</th></tr></thead>
                      <tbody>
                        {relatedParts.map(p => {
                          const stock = STOCK_CLASSES[p.status] || STOCK_CLASSES.in_stock;
                          return (
                            <tr key={p.id} className="border-b border-border/50">
                              <td className="py-2 pr-3 font-medium">{p.name}</td>
                              <td className="py-2 pr-3 font-mono text-muted-foreground">{p.part_number}</td>
                              <td className="py-2 pr-3 text-center">{p.quantity_available}</td>
                              <td className="py-2 text-right"><span className={`text-[10px] px-2 py-0.5 rounded-full ${stock.cls}`}>{stock.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2 text-center">No parts data available.</p>
              )}
            </CardContent>
          </Card>

          {/* Manuals */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Repair Manuals & Guides
              </CardTitle>
            </CardHeader>
            <CardContent>
              {manuals.length > 0 ? (
                <div className="space-y-3">
                  {manuals.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-muted/20 border border-border rounded-lg px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{m.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{m.category} · {m.version}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-3">
                        {m.file && (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setPdfModal(m)}>
                              <FileText className="h-3 w-3" /> Preview
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => window.open(m.file!, '_blank')}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {manuals[0]?.content && (
                    <div className="mt-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Manual Content</p>
                      <div className="text-xs text-foreground/80 bg-muted/30 border border-border rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
                        {manuals[0].content}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No manuals found for this category.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Details */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Ticket Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Ticket ID" value={ticket.ticket_id} />
              <InfoRow label="Category" value={ticket.category} />
              <InfoRow label="Customer" value={ticket.customer} />
              <InfoRow label="Created" value={new Date(ticket.created_at).toLocaleDateString()} icon={Clock} />
              <InfoRow label="Updated" value={new Date(ticket.updated_at).toLocaleDateString()} icon={Clock} />
            </CardContent>
          </Card>

          {/* Technician Actions */}
          {isTech && ticket.status !== 'completed' && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" /> Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Update Status</p>
                  <div className="grid grid-cols-1 gap-2">
                    {ticket.status !== 'in_progress' && (
                      <Button size="sm" className="w-full gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/80 text-white" onClick={() => handleStatusUpdate('in_progress')} disabled={saving}>
                        <Play className="h-3.5 w-3.5" /> Start Work
                      </Button>
                    )}
                    {ticket.status !== 'awaiting_parts' && (
                      <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleStatusUpdate('awaiting_parts')} disabled={saving}>
                        <Package className="h-3.5 w-3.5" /> Waiting for Parts
                      </Button>
                    )}
                    <Button size="sm" className="w-full gap-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/80 text-white" onClick={() => handleStatusUpdate('completed')} disabled={saving}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Complete Ticket
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Repair Notes</Label>
                  <Textarea placeholder="Describe the work performed..." value={repairNotes} onChange={e => setRepairNotes(e.target.value)} rows={3} className="bg-background resize-none text-xs" />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Time Spent (hours)</Label>
                  <input type="number" step="0.25" min="0" placeholder="e.g. 2.5" value={timeSpent} onChange={e => setTimeSpent(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>

                <Button className="w-full gap-2 bg-primary hover:bg-primary/90" size="sm" onClick={handleSaveNotes} disabled={saving || (!repairNotes.trim() && !timeSpent)}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Notes
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Safety */}
          <Card className="bg-card border-border border-[hsl(var(--warning))]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[hsl(var(--warning))]">
                <ShieldAlert className="h-4 w-4" /> Safety Precautions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-[hsl(var(--warning))] mt-0.5">•</span> Disconnect battery before electrical work</li>
                <li className="flex items-start gap-2"><span className="text-[hsl(var(--warning))] mt-0.5">•</span> Use appropriate PPE at all times</li>
                <li className="flex items-start gap-2"><span className="text-[hsl(var(--warning))] mt-0.5">•</span> Ensure engine is cool before coolant work</li>
                <li className="flex items-start gap-2"><span className="text-[hsl(var(--warning))] mt-0.5">•</span> Follow lockout/tagout procedures</li>
                <li className="flex items-start gap-2"><span className="text-[hsl(var(--warning))] mt-0.5">•</span> Report any unsafe conditions immediately</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PDF Modal */}
      <Dialog open={!!pdfModal} onOpenChange={open => { if (!open) setPdfModal(null); }}>
        <DialogContent className="max-w-4xl h-[80vh] bg-card p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-border">
            <DialogTitle className="text-sm">{pdfModal?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4" style={{ height: 'calc(80vh - 60px)' }}>
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
        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
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
