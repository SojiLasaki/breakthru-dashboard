import { useAiTutor } from '@/context/AiTutorContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, X, ChevronLeft, ChevronRight, Loader2, Ticket, Package, User, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Contextual quick-action suggestions based on current route
const ROUTE_SUGGESTIONS: Record<string, { label: string; task: string; icon: React.FC<{ className?: string }> }[]> = {
  '/tickets': [
    { label: 'Diagnose urgent ticket', task: 'Guide me through diagnosing and resolving an urgent ticket', icon: Ticket },
    { label: 'Assign to technician',   task: 'How do I assign a ticket to the right technician?', icon: User },
  ],
  '/technicians': [
    { label: 'Add new technician',     task: 'Walk me through adding a new technician profile', icon: User },
    { label: 'Assign tickets',         task: 'Best practice for assigning tickets to technicians', icon: Ticket },
  ],
  '/inventory': [
    { label: 'Low stock alert',        task: 'What should I do when inventory is running low?', icon: Package },
    { label: 'Order parts',            task: 'Guide me through creating a parts order', icon: Package },
  ],
  '/': [
    { label: 'Morning walkthrough',    task: 'Give me a morning status briefing and next actions', icon: Sparkles },
    { label: 'Handle urgent tickets',  task: 'Guide me through triaging urgent tickets', icon: Ticket },
  ],
};

const DEFAULT_SUGGESTIONS = [
  { label: 'General guidance',  task: 'Give me a general overview of what I should do next', icon: Sparkles },
  { label: 'Check my tickets',  task: 'Walk me through reviewing my open tickets', icon: Ticket },
];

export default function AiTutorPanel() {
  const { session, isOpen, loading, closeTutor, nextStep, prevStep, openTutor } = useAiTutor();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const currentStep = session?.steps[session?.currentStep ?? 0];
  const totalSteps  = session?.steps.length ?? 0;
  const stepIndex   = session?.currentStep ?? 0;
  const suggestions = ROUTE_SUGGESTIONS[location.pathname] ?? DEFAULT_SUGGESTIONS;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-primary/10 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">AI Tutor</p>
            {session?.ticketId ? (
              <p className="text-[10px] text-muted-foreground">Ticket #{session.ticketId}</p>
            ) : session?.task ? (
              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{session.task}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground">breakthru Assistant</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={closeTutor} className="h-7 w-7 hover:bg-primary/10">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Loading guidance...</span>
          </div>
        ) : !currentStep ? (
          /* No session yet — show contextual suggestions */
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              I'm your breakthru assistant. Pick a quick action or open any ticket to get step-by-step guidance.
            </p>

            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">
              Suggested for this page
            </p>

            <div className="space-y-2">
              {suggestions.map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    onClick={() => openTutor(undefined, s.task)}
                    className="w-full flex items-center gap-3 p-3 bg-muted/40 hover:bg-primary/10 border border-border hover:border-primary/30 rounded-lg text-left transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs text-foreground flex-1">{s.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                💡 Click <span className="text-primary font-medium">AI Guide</span> on any ticket row for contextual help.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="flex items-center gap-1 mb-3">
              {session?.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < stepIndex ? 'bg-primary/60' : i === stepIndex ? 'bg-primary' : 'bg-border'}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mb-3">
              Step {stepIndex + 1} of {totalSteps}
              {session?.task && <span className="ml-2 text-primary/60">· {session.task.length > 30 ? session.task.slice(0, 30) + '…' : session.task}</span>}
            </p>

            {/* Step card */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
              <p className="text-xs font-semibold text-foreground mb-1.5">{currentStep.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{currentStep.description}</p>
            </div>

            {/* Related items */}
            {currentStep.relatedParts && currentStep.relatedParts.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Package className="h-3 w-3" /> Parts needed
                </p>
                <div className="flex flex-wrap gap-1">
                  {currentStep.relatedParts.map(p => (
                    <Badge key={p} variant="secondary" className="text-[10px] h-5 cursor-pointer hover:bg-primary/20" onClick={() => navigate('/inventory')}>
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {currentStep.relatedTechnicians && currentStep.relatedTechnicians.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                  <User className="h-3 w-3" /> Suggested technicians
                </p>
                <div className="flex flex-wrap gap-1">
                  {currentStep.relatedTechnicians.map(t => (
                    <Badge key={t} variant="outline" className="text-[10px] h-5 border-primary/30 text-primary cursor-pointer hover:bg-primary/10" onClick={() => navigate('/technicians')}>
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {currentStep.relatedTickets && currentStep.relatedTickets.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Ticket className="h-3 w-3" /> Related tickets
                </p>
                <div className="flex flex-wrap gap-1">
                  {currentStep.relatedTickets.map(id => (
                    <Badge key={id} variant="secondary" className="text-[10px] h-5 cursor-pointer hover:bg-primary/20" onClick={() => navigate('/tickets')}>
                      #{id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reset to suggestions */}
            {stepIndex === totalSteps - 1 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground mb-2">✅ All steps complete! Need more help?</p>
                <div className="space-y-1.5">
                  {suggestions.slice(0, 2).map(s => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.label}
                        onClick={() => openTutor(undefined, s.task)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/40 hover:bg-primary/10 border border-border hover:border-primary/30 rounded-lg text-left transition-all"
                      >
                        <Icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      {!loading && currentStep && (
        <div className="flex items-center justify-between p-3 border-t border-border flex-shrink-0 bg-card">
          <Button
            variant="outline"
            size="sm"
            onClick={prevStep}
            disabled={stepIndex === 0}
            className="h-8 gap-1 text-xs border-border"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <span className="text-[10px] text-muted-foreground">{stepIndex + 1}/{totalSteps}</span>
          <Button
            size="sm"
            onClick={nextStep}
            disabled={stepIndex === totalSteps - 1}
            className="h-8 gap-1 text-xs bg-primary hover:bg-primary/90"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
