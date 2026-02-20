import { useEffect, useState } from 'react';
import { technicianApi, Technician } from '@/services/technicianApi';
import { Loader2, MapPin, Phone, Mail, Wrench, Zap, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const AVAILABILITY_CONFIG = {
  available: { label: 'Available', class: 'text-green-400 bg-green-400/10 border border-green-400/20', dot: 'bg-green-400' },
  busy:      { label: 'Busy',      class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', dot: 'bg-yellow-400' },
  off_duty:  { label: 'Off Duty',  class: 'text-muted-foreground bg-muted/50 border border-border', dot: 'bg-muted-foreground' },
};

const EXPERTISE_CONFIG = {
  junior: { label: 'Junior', class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' },
  mid:    { label: 'Mid-level', class: 'text-purple-400 bg-purple-400/10 border border-purple-400/20' },
  senior: { label: 'Senior', class: 'text-amber-400 bg-amber-400/10 border border-amber-400/20' },
};

const SPEC_ICONS = {
  engine:     Wrench,
  electrical: Zap,
  general:    Settings,
};

export default function TechniciansPage() {
  const [techs, setTechs] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    technicianApi.getAll().then(setTechs).finally(() => setLoading(false));
  }, []);

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
            const avail = AVAILABILITY_CONFIG[tech.availability];
            const exp   = EXPERTISE_CONFIG[tech.expertise];
            const SpecIcon = SPEC_ICONS[tech.specialization];
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
                          className="w-18 h-18 rounded-full object-cover ring-2 ring-primary/30"
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

                      {/* Badges */}
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
                        <div className={`w-2 h-2 rounded-full ${avail.dot}`} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
