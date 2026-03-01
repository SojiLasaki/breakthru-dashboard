import { useState } from 'react';
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
  id: number;
  label: string;
  detail?: string;
  required: boolean;
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
  ticketContext?: string;
  componentContext?: string;
}

export default function RepairChecklist({ steps, ticketContext, componentContext }: Props) {
  const navigate = useNavigate();
  const [states, setStates] = useState<Record<number, StepState>>(
    () => Object.fromEntries(
      steps.map(s => [s.id, {
        checked: false,
        note: '',
        flagged: false,
        photos: [],
        timeMinutes: 0,
      }]),
    ),
  );

  const update = (id: number, patch: Partial<StepState>) => {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const completed = Object.values(states).filter(s => s.checked).length;
  const total = steps.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handlePhoto = (stepId: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) update(stepId, { photos: [...(states[stepId]?.photos || []), file.name] });
    };
    input.click();
  };

  const handleUpload = (stepId: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) update(stepId, { photos: [...(states[stepId]?.photos || []), file.name] });
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
            <span className={`text-[10px] font-bold ${progress === 100 ? 'text-[hsl(var(--success))]' : 'text-primary'}`}>{progress}%</span>
          </div>
        </div>
        <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-[hsl(var(--success))]' : 'bg-primary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-1 pb-4">
        {steps.map((step, idx) => {
          const s = states[step.id] || {
            checked: false,
            note: '',
            flagged: false,
            photos: [],
            timeMinutes: 0,
          };
          return (
            <Collapsible key={step.id}>
              <div className={`rounded-xl border transition-all ${
                s.checked ? 'bg-[hsl(var(--success))]/5 border-[hsl(var(--success))]/20'
                  : s.flagged ? 'bg-primary/5 border-primary/20'
                    : 'border-border hover:border-border/80 hover:bg-muted/20'
              }`}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <Checkbox
                    checked={s.checked}
                    onCheckedChange={() => {
                      const nowChecked = !s.checked;
                      if (nowChecked) {
                        const patch: Record<number, StepState> = {};
                        for (let i = 0; i <= idx; i++) {
                          const sid = steps[i].id;
                          patch[sid] = { ...states[sid], checked: true };
                        }
                        setStates(prev => ({ ...prev, ...patch }));
                      } else {
                        update(step.id, { checked: false });
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
                        📝 {s.note}
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
                      <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1.5 px-3" onClick={() => handlePhoto(step.id)}>
                        <Camera className="h-3 w-3" /> Take Photo
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1.5 px-3" onClick={() => handleUpload(step.id)}>
                        <Paperclip className="h-3 w-3" /> Upload Image
                      </Button>
                      <Button
                        variant={s.flagged ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 text-[10px] gap-1.5 px-3 ${s.flagged ? 'bg-primary hover:bg-primary/90' : ''}`}
                        onClick={() => update(step.id, { flagged: !s.flagged })}
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
                        <MessageSquare className="h-3 w-3" /> Open in Fix it Felix
                      </Button>
                    </div>

                    <div>
                      <Textarea
                        placeholder="Add a note for this step..."
                        value={s.note}
                        onChange={e => update(step.id, { note: e.target.value })}
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
                        onChange={e => update(step.id, { timeMinutes: parseInt(e.target.value, 10) || 0 })}
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

        {progress === 100 && (
          <div className="flex items-center gap-2 justify-center py-3 text-[hsl(var(--success))]">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">All steps completed!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
