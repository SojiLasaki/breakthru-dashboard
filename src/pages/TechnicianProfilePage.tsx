import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { technicianApi, Technician, TechTask } from '@/services/technicianApi';
import {
  Loader2, ArrowLeft, MapPin, Phone, Mail, Wrench, Zap, Settings,
  Navigation, Home, ClipboardList, Clock, CheckCircle2, XCircle,
  Star, Award, AlertCircle, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const AVAILABILITY_CONFIG = {
  available: { label: 'Available', class: 'text-green-400 bg-green-400/10 border border-green-400/20', dot: 'bg-green-400' },
  busy:      { label: 'Busy',      class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', dot: 'bg-yellow-400' },
  off_duty:  { label: 'Off Duty',  class: 'text-muted-foreground bg-muted/50 border border-border', dot: 'bg-muted-foreground' },
};

const EXPERTISE_CONFIG = {
  junior: { label: 'Junior',    class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',   stars: 1 },
  mid:    { label: 'Mid-level', class: 'text-purple-400 bg-purple-400/10 border border-purple-400/20', stars: 2 },
  senior: { label: 'Senior',   class: 'text-amber-400 bg-amber-400/10 border border-amber-400/20', stars: 3 },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    class: 'text-muted-foreground bg-muted/50 border-border' },
  medium: { label: 'Medium', class: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  high:   { label: 'High',   class: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  urgent: { label: 'Urgent', class: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

const SPEC_ICONS = { engine: Wrench, electrical: Zap, general: Settings };

export default function TechnicianProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tech, setTech] = useState<Technician | null>(null);
  const [tasks, setTasks] = useState<TechTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const techId = parseInt(id, 10);
    // Use getById to call GET /technicians/{id}/ directly
    technicianApi.getById(techId)
      .then(found => {
        setTech(found);
        return technicianApi.getTaskHistory(techId);
      })
      .then(t => setTasks(t))
      .catch(() => setTech(null))
      .finally(() => { setLoading(false); setTasksLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <AlertCircle className="h-10 w-10 text-primary/50" />
        <p>Technician not found.</p>
        <Button variant="outline" onClick={() => navigate('/technicians')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Technicians
        </Button>
      </div>
    );
  }

  const avail    = AVAILABILITY_CONFIG[tech.availability] ?? AVAILABILITY_CONFIG['off_duty'];
  const exp      = EXPERTISE_CONFIG[tech.expertise]        ?? EXPERTISE_CONFIG['mid'];
  const SpecIcon = SPEC_ICONS[tech.specialization]         ?? Settings;

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalHours     = tasks.reduce((sum, t) => sum + t.duration_hours, 0);
  const urgentCount    = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/technicians')} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Technicians
      </Button>

      {/* Hero card */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Avatar panel */}
            <div className="flex flex-col items-center justify-center gap-4 p-8 bg-muted/30 border-b sm:border-b-0 sm:border-r border-border sm:min-w-[220px]">
              <div className="relative">
                <img
                  src={tech.photo}
                  alt={tech.first_name}
                  className="w-24 h-24 rounded-full object-cover ring-2 ring-primary/40"
                  onError={e => {
                    (e.currentTarget as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${encodeURIComponent((tech.first_name || '') + ' ' + (tech.last_name || ''))}&background=1a1f2e&color=e61409&size=96`
                  }}
                />
                <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card ${avail.dot}`} />
              </div>

              <div className="text-center">
                <h1 className="font-bold text-lg leading-tight">{tech.first_name} {tech.last_name}</h1>
                <div className="flex items-center justify-center gap-1.5 mt-1 text-muted-foreground">
                  <SpecIcon className="h-3.5 w-3.5" />
                  <span className="text-xs capitalize">{tech.specialization.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${avail.class}`}>{avail.label}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map(i => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i <= exp.stars ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`}
                    />
                  ))}
                  <span className={`text-xs font-medium ml-1 ${exp.class.split(' ')[0]}`}>{exp.label}</span>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div className="flex-1 p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Contact & Location</p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span>{tech.phone_number}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="truncate text-xs">{tech.email}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span>{tech.station}</span>
                  <span>{tech.street_address} {tech.street_address_2} {tech.city} {tech.state} {tech.country} {tech.postal_code}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {/* <a
                    href={`https://www.google.com/maps?q=${tech.latitude},${tech.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary/80 hover:text-primary transition-colors"
                  >
                    {tech.latitude.toFixed(4)}°, {tech.longitude.toFixed(4)}°
                  </a> */}
                </div>
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Home className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs leading-relaxed">{tech.street_address} {tech.street_address_2} {tech.city} {tech.state} {tech.country} {tech.postal_code}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Specialization Tags</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary capitalize">
                    <SpecIcon className="h-3 w-3 mr-1" />
                    {tech.specialization} specialist
                  </Badge>
                  <Badge variant="outline" className={`text-xs border-0 ${exp.class}`}>
                    <Award className="h-3 w-3 mr-1" />
                    {exp.label} technician
                  </Badge>
                  <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                    <ClipboardList className="h-3 w-3 mr-1" />
                    {tech.active_tickets} active ticket{tech.active_tickets !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tasks Completed',    value: completedTasks.length,  color: 'text-green-400',  bg: 'bg-green-400/10' },
          { label: 'Total Hours Logged', value: `${totalHours}h`,       color: 'text-blue-400',   bg: 'bg-blue-400/10' },
          { label: 'High/Urgent Tasks',  value: urgentCount,            color: 'text-primary',    bg: 'bg-primary/10' },
          { label: 'Active Tickets',     value: tech.active_tickets,    color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 text-center card-hover">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Task history */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Task History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No task history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => {
                const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG['low'];
                return (
                  <div key={task.id} className="bg-muted/30 border border-border rounded-lg p-4 space-y-2 card-hover">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {task.status === 'completed'
                          ? <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                          : <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        <span className="text-sm font-medium">{task.title}</span>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${priority.class}`}>
                        {priority.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6 leading-relaxed">{task.description}</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
