import { useEffect, useState } from 'react';
import { technicianApi, Technician, TechTask } from '@/services/technicianApi';
import { Loader2, MapPin, Phone, Mail, Wrench, Zap, Settings, Navigation, Home, ClipboardList, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const AVAILABILITY_CONFIG = {
  available: { label: 'Available', class: 'text-green-400 bg-green-400/10 border border-green-400/20', dot: 'bg-green-400' },
  busy:      { label: 'Busy',      class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', dot: 'bg-yellow-400' },
  off_duty:  { label: 'Off Duty',  class: 'text-muted-foreground bg-muted/50 border border-border', dot: 'bg-muted-foreground' },
};

const EXPERTISE_CONFIG = {
  junior: { label: 'Junior',    class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' },
  mid:    { label: 'Mid-level', class: 'text-purple-400 bg-purple-400/10 border border-purple-400/20' },
  senior: { label: 'Senior',   class: 'text-amber-400 bg-amber-400/10 border border-amber-400/20' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    class: 'text-muted-foreground bg-muted/50 border-border' },
  medium: { label: 'Medium', class: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  high:   { label: 'High',   class: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  urgent: { label: 'Urgent', class: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

const SPEC_ICONS = { engine: Wrench, electrical: Zap, general: Settings };

export default function TechniciansPage() {
  const [techs, setTechs] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [taskHistory, setTaskHistory] = useState<TechTask[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    technicianApi.getAll().then(setTechs).finally(() => setLoading(false));
  }, []);

  const openHistory = (tech: Technician) => {
    setSelectedTech(tech);
    setHistoryLoading(true);
    technicianApi.getTaskHistory(tech.id)
      .then(setTaskHistory)
      .finally(() => setHistoryLoading(false));
  };

  const filtered = techs.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.specialization.includes(search.toLowerCase()) ||
    t.location.toLowerCase().includes(search.toLowerCase()) ||
    t.expertise.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Technicians</h1>
        <p className="text-muted-foreground text-sm">Team availability and specializations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(['available', 'busy', 'off_duty'] as const).map(status => {
          const count = techs.filter(t => t.availability === status).length;
          const cfg = AVAILABILITY_CONFIG[status];
          return (
            <div key={status} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <div>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, specialization, expertise..." className="pl-9 bg-card" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(tech => {
            const avail    = AVAILABILITY_CONFIG[tech.availability] ?? AVAILABILITY_CONFIG['off_duty'];
            const exp      = EXPERTISE_CONFIG[tech.expertise]        ?? EXPERTISE_CONFIG['mid'];
            const SpecIcon = SPEC_ICONS[tech.specialization]         ?? Settings;
            return (
              <Card key={tech.id} className="bg-card border-border card-hover overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Left profile column */}
                    <div className="flex flex-col items-center justify-center gap-3 p-5 bg-muted/30 border-r border-border min-w-[130px]">
                      <div className="relative">
                        <img
                          src={tech.photo}
                          alt={tech.name}
                          className="rounded-full object-cover ring-2 ring-primary/30"
                          style={{ width: 72, height: 72 }}
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).src =
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(tech.name)}&background=1a1f2e&color=e61409&size=72`;
                          }}
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${avail.dot}`} />
                      </div>

                      <div className="text-center">
                        <p className="font-semibold text-sm leading-tight">{tech.name}</p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <SpecIcon className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground capitalize">{tech.specialization.replace('_', ' ')}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${avail.class}`}>{avail.label}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${exp.class}`}>{exp.label}</span>
                      </div>
                    </div>

                    {/* Right details column */}
                    <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                      <div className="space-y-2.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
                          <span>{tech.location}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Home className="h-3.5 w-3.5 flex-shrink-0 text-primary/60 mt-0.5" />
                          <span className="leading-tight">{tech.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Navigation className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
                          <a
                            href={`https://www.google.com/maps?q=${tech.lat},${tech.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[10px] text-primary/80 hover:text-primary transition-colors"
                          >
                            {tech.lat.toFixed(4)}°, {tech.lng.toFixed(4)}°
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
                          <span>{tech.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
                          <span className="truncate">{tech.email}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{tech.active_tickets} active ticket{tech.active_tickets !== 1 ? 's' : ''}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => openHistory(tech)}
                        >
                          <ClipboardList className="h-3 w-3" />
                          History
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task History Sheet */}
      <Sheet open={!!selectedTech} onOpenChange={open => !open && setSelectedTech(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {selectedTech && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedTech.photo}
                    alt={selectedTech.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/30"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src =
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTech.name)}&background=1a1f2e&color=e61409&size=48`;
                    }}
                  />
                  <div>
                    <SheetTitle className="text-base">{selectedTech.name}</SheetTitle>
                    <p className="text-xs text-muted-foreground capitalize">{selectedTech.specialization} · {selectedTech.expertise}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Completed Tasks</p>

                {historyLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : taskHistory.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No task history found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {taskHistory.map(task => {
                      const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG['low'];
                      return (
                        <div key={task.id} className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {task.status === 'completed'
                                ? <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                                : <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                              <span className="text-sm font-medium leading-tight">{task.title}</span>
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${priority.class}`}>{priority.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-6">{task.description}</p>
                          <div className="flex items-center gap-4 pl-6 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task.duration_hours}h</span>
                            <span>{new Date(task.completed_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="font-mono text-primary/60">{task.ticket_id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
