import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { technicianApi, Technician } from '@/services/technicianApi';
import { useAuth } from '@/context/AuthContext';
import {
  Loader2, MapPin, Phone, Mail, Wrench, Zap, Settings,
  Navigation, Home, ClipboardList, Search, Plus, User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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

const SPEC_ICONS = { engine: Wrench, electrical: Zap, general: Settings };

const EMPTY_FORM = {
  name: '', email: '', phone: '', location: '', address: '',
  specialization: 'engine' as Technician['specialization'],
  expertise: 'junior' as Technician['expertise'],
};

export default function TechniciansPage() {
  const navigate = useNavigate();
  const { isRole } = useAuth();
  const [techs, setTechs] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isAdmin = isRole('admin', 'office_staff');

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

  const handleAdd = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600)); // simulate API call
    const newTech: Technician = {
      id: Date.now(),
      ...form,
      availability: 'available',
      lat: 0,
      lng: 0,
      active_tickets: 0,
      photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=1a1f2e&color=e61409&size=96`,
    };
    setTechs(prev => [newTech, ...prev]);
    setForm(EMPTY_FORM);
    setAddOpen(false);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Technicians</h1>
          <p className="text-muted-foreground text-sm">Team availability and specializations</p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Technician
          </Button>
        )}
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
              <Card
                key={tech.id}
                className="bg-card border-border card-hover overflow-hidden cursor-pointer"
                onClick={() => navigate(`/technicians/${tech.id}`)}
              >
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
                            onClick={e => e.stopPropagation()}
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
                          onClick={e => { e.stopPropagation(); navigate(`/technicians/${tech.id}`); }}
                        >
                          <User className="h-3 w-3" />
                          View Profile
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

      {/* Add Technician Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Add New Technician
            </DialogTitle>
            <DialogDescription>Fill in the details to register a new technician.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name *</Label>
                <Input
                  placeholder="John Smith"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  placeholder="john@breakthru.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  placeholder="+1-555-0100"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <Input
                  placeholder="City, State"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input
                placeholder="123 Main St, City, ST 00000"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Specialization</Label>
                <Select value={form.specialization} onValueChange={v => setForm(f => ({ ...f, specialization: v as Technician['specialization'] }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engine">Engine</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expertise Level</Label>
                <Select value={form.expertise} onValueChange={v => setForm(f => ({ ...f, expertise: v as Technician['expertise'] }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid-level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleAdd}
                disabled={saving || !form.name.trim() || !form.email.trim()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Technician
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
