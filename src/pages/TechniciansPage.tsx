import { useEffect, useState } from 'react';
import { technicianApi, Technician } from '@/services/technicianApi';
import { Loader2, User, MapPin, Phone, Mail, Wrench, Zap, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const AVAILABILITY_CONFIG = {
  available: { label: 'Available', class: 'text-green-400 bg-green-400/10 border border-green-400/20', dot: 'bg-green-400' },
  busy: { label: 'Busy', class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', dot: 'bg-yellow-400' },
  off_duty: { label: 'Off Duty', class: 'text-muted-foreground bg-muted/50 border border-border', dot: 'bg-muted-foreground' },
};

const SPEC_ICONS = {
  engine: Wrench,
  electrical: Zap,
  general: Settings,
};

export default function TechniciansPage() {
  const [techs, setTechs] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    technicianApi.getAll().then(setTechs).finally(() => setLoading(false));
  }, []);

  const filtered = techs.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.specialization.includes(search.toLowerCase()) ||
    t.location.toLowerCase().includes(search.toLowerCase())
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
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search technicians..." className="pl-9 bg-card" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tech => {
            const avail = AVAILABILITY_CONFIG[tech.availability];
            const SpecIcon = SPEC_ICONS[tech.specialization];
            return (
              <Card key={tech.id} className="bg-card border-border card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tech.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <SpecIcon className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground capitalize">{tech.specialization.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${avail.class}`}>{avail.label}</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><MapPin className="h-3 w-3" />{tech.location}</div>
                    <div className="flex items-center gap-2"><Phone className="h-3 w-3" />{tech.phone}</div>
                    <div className="flex items-center gap-2"><Mail className="h-3 w-3 flex-shrink-0" />{tech.email}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{tech.active_tickets} active tickets</span>
                    <div className={`w-2 h-2 rounded-full ${avail.dot}`} />
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
