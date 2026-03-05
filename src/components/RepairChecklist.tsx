import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ListChecks,
  ChevronDown,
  Camera,
  Paperclip,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';

export interface RepairStep {
  id: string;
  label: string;
  detail?: string;
  required: boolean;
}

export interface RepairStepProgress {
  item_id: string;
  done: boolean;
  note?: string;
  flagged?: boolean;
  photos?: string[];
  time_minutes?: number;
}

interface StepState {
  checked: boolean;
  note: string;
  flagged: boolean;
  photos: string[];
  timeMinutes: number;
}

interface Props {
  steps: RepairStep[];
  progress?: RepairStepProgress[];
  ticketContext?: string;
  componentContext?: string;
  onProgressChange?: (progress: RepairStepProgress[]) => void;
  saving?: boolean;
}

const emptyState = (): StepState => ({
  checked: false,
  note: '',
  flagged: false,
  photos: [],
  timeMinutes: 0,
});

const toStateMap = (steps: RepairStep[], progress: RepairStepProgress[]): Record<string, StepState> => {
  const progressMap = new Map(progress.map(item => [String(item.item_id), item]));
  return Object.fromEntries(
    steps.map(step => {
      const row = progressMap.get(String(step.id));
      return [
        String(step.id),
        {
          checked: Boolean(row?.done),
          note: String(row?.note || ''),
          flagged: Boolean(row?.flagged),
          photos: Array.isArray(row?.photos) ? row!.photos! : [],
          timeMinutes: Number.isFinite(Number(row?.time_minutes)) ? Number(row?.time_minutes) : 0,
        } satisfies StepState,
      ];
    }),
  );
};

const toProgressRows = (states: Record<string, StepState>): RepairStepProgress[] =>
  Object.entries(states).map(([itemId, state]) => ({
    item_id: itemId,
    done: state.checked,
    note: state.note,
    flagged: state.flagged,
    photos: state.photos,
    time_minutes: state.timeMinutes,
  }));

export default function RepairChecklist({
  steps,
  progress = [],
  ticketContext,
  componentContext,
  onProgressChange,
  saving = false,
}: Props) {
  const navigate = useNavigate();
  const memoProgress = useMemo(() => progress, [progress]);
  const [states, setStates] = useState<Record<string, StepState>>(() => toStateMap(steps, memoProgress));

  useEffect(() => {
    setStates(toStateMap(steps, memoProgress));
  }, [steps, memoProgress]);

  const emit = (next: Record<string, StepState>) => {
    onProgressChange?.(toProgressRows(next));
  };

  const update = (id: string, patch: Partial<StepState>) => {
    setStates(prev => {
      const current = prev[id] || emptyState();
      const next = { ...prev, [id]: { ...current, ...patch } };
      emit(next);
      return next;
    });
  };

  const completed = Object.values(states).filter(s => s.checked).length;
  const total = steps.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleUpload = (stepId: string, useCamera = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (useCamera) input.capture = 'environment';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      const file = target?.files?.[0];
      if (file) {
        const existing = states[stepId]?.photos || [];
        update(stepId, { photos: [...existing, file.name] });
      }
    };
    input.click();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> Repair Checklist
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{completed}/{total}</span>
            <span className={`text-[10px] font-bold ${progressPct === 100 ? 'text-[hsl(var(--success))]' : 'text-primary'}`}>{progressPct}%</span>
          </div>
        </div>
        <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? 'bg-[hsl(var(--success))]' : 'bg-primary'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-1 pb-4">
        {steps.map((step, idx) => {
          const stepId = String(step.id);
          const s = states[stepId] || emptyState();
          return (
            <Collapsible key={stepId}>
              <div className={`rounded-xl border transition-all ${
                s.checked ? 'bg-[hsl(var(--success))]/5 border-[hsl(var(--success))]/20'
                  : s.flagged ? 'bg-primary/5 border-primary/20'
                    : 'border-border hover:border-border/80 hover:bg-muted/20'
              }`}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <Checkbox
                    checked={s.checked}
                    disabled={saving}
                    onCheckedChange={() => {
                      if (saving) return;
                      const nowChecked = !s.checked;
                      if (nowChecked) {
                        setStates(prev => {
                          const patch: Record<string, StepState> = {};
                          for (let i = 0; i <= idx; i += 1) {
                            const sid = String(steps[i].id);
                            patch[sid] = { ...(prev[sid] || emptyState()), checked: true };
                          }
                          const next = { ...prev, ...patch };
                          emit(next);
                          return next;
                        });
                      } else {
                        update(stepId, { checked: false });
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${s.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        <span className="text-primary font-bold mr-1">Step {idx + 1}.</span>
                        {step.label}
                      </span>
                      {!step.required && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Optional</Badge>}
                      {s.flagged && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Flagged
                        </Badge>
                      )}
                    </div>
                    {step.detail && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>
                    )}
                    {s.photos.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {s.photos.map((p, i) => (
                          <span key={i} className="text-[9px] bg-muted/50 border border-border rounded px-1.5 py-0.5 flex items-center gap-1">
                            <ImageIcon className="h-2.5 w-2.5" /> {p}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.note && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic bg-muted/20 rounded px-2 py-1">
                        Note: {s.note}
                      </p>
                    )}
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent>
                  <div className="px-4 pb-3 pt-1 border-t border-border/50 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1.5 px-3" onClick={() => handleUpload(stepId, true)}>
                        <Camera className="h-3 w-3" /> Take Photo
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1.5 px-3" onClick={() => handleUpload(stepId)}>
                        <Paperclip className="h-3 w-3" /> Upload Image
                      </Button>
                      <Button
                        variant={s.flagged ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 text-[10px] gap-1.5 px-3 ${s.flagged ? 'bg-primary hover:bg-primary/90' : ''}`}
                        onClick={() => update(stepId, { flagged: !s.flagged })}
                      >
                        <AlertTriangle className="h-3 w-3" /> {s.flagged ? 'Unflag' : 'Flag Issue'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] gap-1.5 px-3"
                        onClick={() => {
                          const prompt = `Help me with step ${idx + 1}: ${step.label}`;
                          const context = [ticketContext, componentContext].filter(Boolean).join(' | ');
                          const query = context ? `${prompt}. Context: ${context}` : prompt;
                          navigate(`/ask-ai?q=${encodeURIComponent(query)}`);
                        }}
                      >
                        <MessageSquare className="h-3 w-3" /> Open in Fix-it Felix
                      </Button>
                    </div>

                    <div>
                      <Textarea
                        placeholder="Add a note for this step..."
                        value={s.note}
                        onChange={e => update(stepId, { note: e.target.value })}
                        rows={2}
                        className="text-xs bg-background resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <input
                        type="number"
                        min="0"
                        step="5"
                        placeholder="Minutes"
                        value={s.timeMinutes || ''}
                        onChange={e => update(stepId, { timeMinutes: parseInt(e.target.value, 10) || 0 })}
                        className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <span className="text-[10px] text-muted-foreground">minutes</span>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {progressPct === 100 && (
          <div className="flex items-center gap-2 justify-center py-3 text-[hsl(var(--success))]">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">All steps completed!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
