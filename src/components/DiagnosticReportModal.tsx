import { useState } from 'react';
import { Diagnostic } from '@/services/diagnosticsApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  ShieldAlert, Clock, Cpu, User, MapPin, Building,
  AlertTriangle, CheckCircle2, XCircle, Info,
} from 'lucide-react';

const SEVERITY_MAP: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  critical: { label: 'Critical', cls: 'bg-primary/10 text-primary border-primary/20', icon: XCircle },
  warning: { label: 'Warning', cls: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20', icon: AlertTriangle },
  info: { label: 'Info', cls: 'bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] border-[hsl(var(--info))]/20', icon: Info },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
  in_progress: { label: 'In Progress', cls: 'bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]' },
  resolved: { label: 'Resolved', cls: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
  failed: { label: 'Failed', cls: 'bg-primary/10 text-primary' },
};

interface Props {
  diagnostic: Diagnostic | null;
  open: boolean;
  onClose: () => void;
}

export default function DiagnosticReportModal({ diagnostic, open, onClose }: Props) {
  if (!diagnostic) return null;

  const sev = SEVERITY_MAP[diagnostic.severity] || SEVERITY_MAP.info;
  const stat = STATUS_MAP[diagnostic.status] || STATUS_MAP.pending;
  const SevIcon = sev.icon;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-card p-0 sm:rounded-2xl">
        {/* Fault Summary Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border p-5 pb-4">
          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-primary text-sm font-bold">{diagnostic.diagnostic_id}</span>
              <Badge className={`text-[10px] border ${sev.cls}`}>
                <SevIcon className="h-3 w-3 mr-1" />{sev.label}
              </Badge>
              <Badge className={`text-[10px] ${stat.cls}`}>{stat.label}</Badge>
              <span className="font-mono text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                {diagnostic.fault_code}
              </span>
            </div>
            <DialogTitle className="text-base font-semibold">{diagnostic.title}</DialogTitle>
          </DialogHeader>

          {/* Quick info bar */}
          <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3" /> {diagnostic.component_name}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {new Date(diagnostic.identified_at).toLocaleString()}
            </span>
            {diagnostic.assigned_technician && (
              <span className="flex items-center gap-1.5">
                <User className="h-3 w-3" /> {diagnostic.assigned_technician}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Building className="h-3 w-3" /> {diagnostic.company_name}
            </span>
            <span className="flex items-center gap-1.5">
              Confidence: <strong className="text-foreground">{diagnostic.confidence_score}%</strong>
            </span>
          </div>
        </div>

        {/* Expandable Sections */}
        <div className="p-5 pt-3">
          <Accordion type="multiple" defaultValue={['summary', 'root-cause', 'actions']} className="space-y-1">

            <AccordionItem value="summary" className="border rounded-lg px-4 bg-muted/10">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> AI Summary & Initial Complaint</span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-foreground/80 leading-relaxed mb-3">{diagnostic.ai_summary}</p>
                <div className="bg-muted/30 border border-border rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Initial Description</p>
                  <p className="text-xs text-foreground/80">{diagnostic.description}</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="root-cause" className="border rounded-lg px-4 bg-muted/10">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" /> Root Cause Analysis</span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-foreground/80 leading-relaxed">{diagnostic.probable_cause}</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <InfoChip label="Specialization" value={diagnostic.specialization} />
                  <InfoChip label="Expertise Required" value={diagnostic.expertise_requirement} />
                  <InfoChip label="Part Affected" value={diagnostic.part_name} />
                  <InfoChip label="Part ID" value={diagnostic.part_id} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="actions" className="border rounded-lg px-4 bg-muted/10">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" /> Recommended Actions</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {diagnostic.recommended_actions.split('.').filter(s => s.trim()).map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                      <span>{action.trim()}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="notes" className="border rounded-lg px-4 bg-muted/10">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2"><Info className="h-4 w-4 text-[hsl(var(--info))]" /> Notes & Recommendations</span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-foreground/80 leading-relaxed">{diagnostic.recommended_action}</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="timeline" className="border rounded-lg px-4 bg-muted/10">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Timeline</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <TimelineEntry label="Issue Identified" time={diagnostic.identified_at} by={diagnostic.performed_by} />
                  <TimelineEntry label="Report Created" time={diagnostic.created_at} by={diagnostic.performed_by} />
                  {diagnostic.resolved_at && (
                    <TimelineEntry label="Resolved" time={diagnostic.resolved_at} by={diagnostic.assigned_technician || 'Unknown'} />
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="customer" className="border rounded-lg px-4 bg-muted/10">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> Customer & Location</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  <InfoChip label="Customer" value={`${diagnostic.customer_first_name} ${diagnostic.customer_last_name}`} />
                  <InfoChip label="Company" value={diagnostic.company_name} />
                  <InfoChip label="Address" value={`${diagnostic.customer_street_address}, ${diagnostic.customer_city}, ${diagnostic.customer_state} ${diagnostic.customer_postal_code}`} />
                  <InfoChip label="Equipment" value={diagnostic.component_name} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 border border-border rounded-lg px-3 py-2 flex-1 min-w-[140px]">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-foreground mt-0.5">{value || 'N/A'}</p>
    </div>
  );
}

function TimelineEntry({ label, time, by }: { label: string; time: string; by: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(time).toLocaleString()} · {by}
        </p>
      </div>
    </div>
  );
}
