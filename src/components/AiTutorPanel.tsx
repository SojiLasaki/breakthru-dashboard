import { useAiTutor } from '@/context/AiTutorContext';
import { Bot, X, ChevronLeft, ChevronRight, Loader2, Ticket, Package, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AiTutorPanel() {
  const { session, isOpen, loading, closeTutor, nextStep, prevStep } = useAiTutor();

  if (!isOpen) return null;

  const currentStep = session?.steps[session?.currentStep ?? 0];
  const totalSteps = session?.steps.length ?? 0;
  const stepIndex = session?.currentStep ?? 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-primary/10 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">AI Tutor</p>
            {session?.ticketId && (
              <p className="text-[10px] text-muted-foreground">Ticket #{session.ticketId}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={closeTutor} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading guidance...</span>
          </div>
        ) : !currentStep ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No steps available. Open a ticket to start.
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="flex items-center gap-1 mb-3">
              {session?.steps.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-primary' : 'bg-border'}`} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mb-3">Step {stepIndex + 1} of {totalSteps}</p>

            {/* Step content */}
            <div className="bg-accent/30 rounded-lg p-3 mb-3">
              <p className="text-xs font-semibold text-foreground mb-1">{currentStep.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{currentStep.description}</p>
            </div>

            {/* Related items */}
            {currentStep.relatedParts && currentStep.relatedParts.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Package className="h-3 w-3" /> Parts needed</p>
                <div className="flex flex-wrap gap-1">
                  {currentStep.relatedParts.map(p => (
                    <Badge key={p} variant="secondary" className="text-[10px] h-5">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {currentStep.relatedTechnicians && currentStep.relatedTechnicians.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><User className="h-3 w-3" /> Technicians</p>
                <div className="flex flex-wrap gap-1">
                  {currentStep.relatedTechnicians.map(t => (
                    <Badge key={t} variant="outline" className="text-[10px] h-5 border-primary/30 text-primary">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {currentStep.relatedTickets && currentStep.relatedTickets.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Ticket className="h-3 w-3" /> Related tickets</p>
                <div className="flex flex-wrap gap-1">
                  {currentStep.relatedTickets.map(id => (
                    <Badge key={id} variant="secondary" className="text-[10px] h-5">#{id}</Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      {!loading && currentStep && (
        <div className="flex items-center justify-between p-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={prevStep} disabled={stepIndex === 0} className="h-8 gap-1 text-xs">
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </Button>
          <Button size="sm" onClick={nextStep} disabled={stepIndex === totalSteps - 1} className="h-8 gap-1 text-xs bg-primary hover:bg-primary/90">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
