import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { technicianApi, Technician } from '@/services/technicianApi';
// import { stationApi } from '@/services/stationApi';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, MapPin, Phone, Mail, Wrench, Zap, Settings,
  Home, Search, Plus, User, X, Star,  LayoutGrid, List,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, Column } from '@/components/DataTable';
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
  Available: { label: 'Available', class: 'text-green-400 bg-green-400/10 border border-green-400/20', dot: 'bg-green-400' },
  Busy:      { label: 'Busy',      class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', dot: 'bg-yellow-400' },
  Unavailable:  { label: 'Unavailable',  class: 'text-muted-foreground bg-muted/50 border border-border', dot: 'bg-muted-foreground' },
};

const EXPERTISE_CONFIG = {
  Junior: { label: 'Junior',    stars: 1, class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' },
  Mid:    { label: 'Mid-level', stars: 2, class: 'text-purple-400 bg-purple-400/10 border border-purple-400/20' },
  Senior: { label: 'Senior',   stars: 3, class: 'text-amber-400 bg-amber-400/10 border border-amber-400/20' },
};

const SPEC_ICONS = { Engine: Wrench, Electrical: Zap, General: Settings };
                                                                                                                                                                                                                                                                                                                                                                                                  
interface Station {
  id: string;
  name: string;
}
const EMPTY_FORM = {
  first_name: '', last_name: '', email: '', phone: '', 
  city: '', street_address: '', street_address_2:'', state:'',country:'',postal_code:'',
  specialization: 'Engine' as Technician['specialization'],
  expertise: 'Junior' as Technician['expertise'],
  status: 'Available',
  station: '' as string
};

export default function TechniciansPage() {
  const navigate = useNavigate();
  const { isRole } = useAuth();
  const { defaultView } = useTheme();
  const [techs, StaffProfilechs] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpec, setFilterSpec] = useState<string>('all');
  const [filterExpertise, setFilterExpertise] = useState<string>('all');
  const [view, setView] = useState<'table' | 'cards'>(defaultView);
  const [selected, setSelected] = useState<Technician | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isAdmin = isRole('admin', 'office_staff');
  const { toast } = useToast();

  useEffect(() => {
    technicianApi.getAll().then(StaffProfilechs).finally(() => setLoading(false));
  }, []);

  // const filtered = techs.filter(t => {
  //   const q = search.toLowerCase();
  //   const matchSearch = !search ||
  //     t.first_name?.toLowerCase().includes(q) ||
  //     t.last_name?.toLowerCase().includes(q) ||
  //     t.specialization?.includes(q) ||
  //     t.city?.toLowerCase().includes(q) ||
  //     t.expertise?.includes(q);
  //   const matchSpec = filterSpec === 'all' || t.specialization === filterSpec;
  //   const matchExpertise = filterExpertise === 'all' || t.expertise === filterExpertise;
  //   return matchSearch && matchSpec && matchExpertise;
  // });
  const filtered = techs.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      t.first_name.toLowerCase().includes(q) ||
      t.last_name.toLowerCase().includes(q) ||
      t.specialization.includes(q) ||      // case-sensitive match is okay
      t.city.toLowerCase().includes(q) ||
      t.status.includes(q) ||
      t.expertise.includes(q);
  
    const matchSpec = filterSpec === 'all' || t.specialization === filterSpec;      // exact match
    const matchExpertise = filterExpertise === 'all' || t.expertise === filterExpertise;
  
    return matchSearch && matchSpec && matchExpertise;
  });

  const [stations, setStations] = useState<{ id: string; name: string }[]>([]);

  // useEffect(() => {
  //   stationApi.getAll()
  //     .then(setStations)
  //     .catch(console.error);
  // }, []);

  const handleAdd = async () => {
    if (!form.first_name.trim() || !form.email.trim()) return;
    setSaving(true);
    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
    try {
      const newTech = await technicianApi.create({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone.trim(),
        street_address: form.street_address.trim(),
        street_address_2: form.street_address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        postal_code: form.postal_code.trim(),
        status: form.status,
        station: form.station,
        specialization: form.specialization,
        expertise: form.expertise,
      });
      StaffProfilechs(prev => [newTech, ...prev]);
      setForm(EMPTY_FORM);
      setAddOpen(false);
      toast({ title: 'Technician added', description: `${fullName} has been registered.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to add technician.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getAvatarUrl = (t: Technician) =>
    t.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent((t.first_name ?? '') + ' ' + (t.last_name ?? ''))}&background=1a1f2e&color=e61409&size=96`;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
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
      <div className="grid grid-cols-3 gap-4 flex-shrink-0">
        {(['Available', 'Busy', 'Unavailable'] as const).map(status => {
          const count = techs.filter(t => t.status === status).length;
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, city..." className="pl-9 bg-card" />
        </div>
        <Select value={filterSpec} onValueChange={setFilterSpec}>
          <SelectTrigger className="bg-card w-full sm:w-44"><SelectValue placeholder="Specialization" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="General">General</SelectItem>
            <SelectItem value="all">All Specializations</SelectItem>
            <SelectItem value="Engine">Engine</SelectItem>
            <SelectItem value="Electrical">Electrical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterExpertise} onValueChange={setFilterExpertise}>
          <SelectTrigger className="bg-card w-full sm:w-40"><SelectValue placeholder="Expertise" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="Junior">Junior</SelectItem>
            <SelectItem value="Mid">Mid-level</SelectItem>
            <SelectItem value="Senior">Senior</SelectItem>
          </SelectContent>
        </Select>
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-md p-1">
          <Button variant={view === 'table' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('table')} title="Table View">
            <List className="h-4 w-4" />
          </Button>
          <Button variant={view === 'cards' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('cards')} title="Card View">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main: card grid + side panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Card grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">No technicians</p>
          ) : view === 'table' ? (
            <DataTable<Technician>
              columns={[
                { label: 'Name', render: t => (
                  <div className="flex items-center gap-2">
                    <img src={getAvatarUrl(t)} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <span className="font-medium">{t.first_name} {t.last_name}</span>
                  </div>
                )},
                { label: 'Specialization', render: t => {
                  const Icon = SPEC_ICONS[t.specialization] ?? Settings;
                  return <span className="capitalize flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{t.specialization?.replace('_', ' ')}</span>;
                }},
                { label: 'Expertise', render: t => {
                  const exp = EXPERTISE_CONFIG[t.expertise] ?? EXPERTISE_CONFIG['Junior'];
                  return <span className={`text-xs px-2 py-0.5 rounded-full ${exp.class}`}>{t.expertise}</span>;
                }},
                { label: 'Status', render: t => {
                  const avail = AVAILABILITY_CONFIG[t.status] ?? AVAILABILITY_CONFIG['Unavailable'];
                  return <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit ${avail.class}`}><span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />{avail.label}</span>;
                }},
                { label: 'Station', key: 'station' },
                { label: 'Tickets', render: t => <span>{t.active_tickets || 0}</span> },
              ] as Column<Technician>[]}
              data={filtered}
              rowKey={t => t.id}
              onRowClick={t => setSelected(selected?.id === t.id ? null : t)}
              emptyMessage="No technicians"
            />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-2 gap-4">
              {filtered.map(tech => {
                const avail    = AVAILABILITY_CONFIG[tech.status] ?? AVAILABILITY_CONFIG['Unavailable'];
                const exp      = EXPERTISE_CONFIG[tech.expertise]        ?? EXPERTISE_CONFIG['Mid'];
                const SpecIcon = SPEC_ICONS[tech.specialization]         ?? Settings;
                const isActive = selected?.id === tech.id;

                return (
                  <Card
                    key={tech.id}
                    className={`bg-card border-border overflow-hidden cursor-pointer transition-colors ${isActive ? 'border-primary/50' : 'hover:border-primary/30'}`}
                    onClick={() => setSelected(isActive ? null : tech)}
                  >
                    <CardContent className="p-0">
                      <div className="flex">
                        <div className="flex flex-col items-center justify-center gap-3 p-5 bg-muted/30 border-r border-border min-w-[120px]">
                          <div className="relative">
                            <img src={getAvatarUrl(tech)} alt={(tech.first_name ?? '') + ' ' + (tech.last_name ?? '')} className="rounded-full object-cover ring-2 ring-primary/30" style={{ width: 64, height: 64 }} onError={e => { (e.currentTarget as HTMLImageElement).src = getAvatarUrl(tech); }} />
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${avail.dot}`} />
                          </div>
                          <div className="text-center">

                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              <SpecIcon className="h-2.5 w-2.5 text-muted-foreground" />
                              <p className="text-[9px] text-muted-foreground capitalize">{tech.specialization?.replace('_', ' ') ?? 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${avail.class}`}>{avail.label}</span>
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${exp.class}`}>{exp.label}</span>
                          </div>
                        </div>
                        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2"><User className="h-3 w-3 flex-shrink-0 text-primary/60" /><span className="truncate font-bold">{tech.first_name} {tech.last_name}</span></div>
                            <div className="flex items-center gap-2"><MapPin className="h-3 w-3 flex-shrink-0 text-primary/60" /><span className="truncate">{tech.station}</span></div>
                            <div className="flex items-center gap-2"><Phone className="h-3 w-3 flex-shrink-0 text-primary/60" /><span>{tech.phone_number}</span></div>
                            <div className="flex items-center gap-2"><Mail className="h-3 w-3 flex-shrink-0 text-primary/60" /><span className="truncate">{tech.email}</span></div>
                          </div>
                          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{tech.active_tickets} active ticket{tech.active_tickets !== 1 ? 's' : ''}</span>
                            <button className="text-[10px] text-primary hover:underline font-medium" onClick={e => { e.stopPropagation(); navigate(`/technicians/${tech.id}`); }}>Full Profile →</button>
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

        {/* Side detail panel */}
        {selected && (
          <div className="w-72 flex-shrink-0 bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <p className="text-sm font-semibold">Technician Detail</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Profile */}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <img
                    src={getAvatarUrl(selected)}
                    alt={(selected.first_name ?? '') + ' ' + (selected.last_name ?? '')}
                    className="rounded-full object-cover ring-2 ring-primary/30"
                    style={{ width: 80, height: 80 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).src = getAvatarUrl(selected); }}
                  />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${(AVAILABILITY_CONFIG[selected.status] ?? AVAILABILITY_CONFIG.Unavailable).dot}`} />
                </div>
                <div>
                  <p className="font-bold text-sm">{selected.first_name} {selected.last_name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{selected.specialization?.replace('_', ' ')} Specialist</p>
                </div>
                <div className="flex gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${(AVAILABILITY_CONFIG[selected.status] ?? AVAILABILITY_CONFIG.Unavailable).class}`}>
                    {(AVAILABILITY_CONFIG[selected.status] ?? AVAILABILITY_CONFIG.Unavailable).label}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${(EXPERTISE_CONFIG[selected.expertise] ?? EXPERTISE_CONFIG.Mid).class}`}>
                    {(EXPERTISE_CONFIG[selected.expertise] ?? EXPERTISE_CONFIG.Mid).label}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3].map(i => (
                    <Star key={i} className={`h-4 w-4 ${i <= (EXPERTISE_CONFIG[selected.expertise]?.stars ?? 1) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">Contact</p>
                <div className="space-y-2.5">
                  {[
                    { icon: User,       value: selected.first_name + ' ' + selected.last_name},
                    { icon: Mail,       value: selected.email },
                    { icon: Phone,      value: selected.phone_number },
                    { icon: MapPin,     value: selected.station },
                    { icon: Home,       value: `${selected.street_address}, ${selected.city}` },
                  ].filter(r => r.value).map(({ icon: Icon, value }) => (
                    <div key={value} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="h-3 w-3 text-primary" />
                      </div>
                      <span className="break-all leading-tight">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">{selected.active_tickets}</p>
                <p className="text-[10px] text-muted-foreground">Active Tickets</p>
              </div>

              {/* CTA */}
              <Button
                className="w-full gap-2 bg-primary hover:bg-primary/90"
                onClick={() => navigate(`/technicians/${selected.id}`)}
              >
                <User className="h-4 w-4" /> View Full Profile
              </Button>
            </div>
          </div>
        )}
      </div>

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
                <Label className="text-xs">First Name *</Label>
                <Input placeholder="John" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name</Label>
                <Input placeholder="Doe" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email *</Label>
                  <Input placeholder="john@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone <Number></Number></Label>
                  <Input placeholder="+123456789" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Street Address *</Label>
                <Input placeholder="123 Main St" value={form.street_address} onChange={e => setForm(f => ({ ...f, street_address: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Street Address 2 *</Label>
                <Input placeholder="Apt D" value={form.street_address_2} onChange={e => setForm(f => ({ ...f, street_address_2: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"> 
                  <Label className="text-xs">City</Label>
                  <Input placeholder="New York" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">State</Label>
                  <Input placeholder="+Indiana" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"> 
                  <Label className="text-xs">Country</Label>
                  <Input placeholder="New York" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Postal / Zip COde</Label>
                  <Input placeholder="+Indiana" value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} />
                </div>
              </div>  
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Label className="text-xs">Specialization</Label>
              <Label className="text-xs">Expertise</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select value={form.specialization} onValueChange={v => setForm(f => ({ ...f, specialization: v as Technician['specialization'] }))}>
                <SelectTrigger><SelectValue placeholder="Specialization" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Engine">Engine</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.expertise} onValueChange={v => setForm(f => ({ ...f, expertise: v as Technician['expertise'] }))}>
                <SelectTrigger><SelectValue placeholder="Expertise" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Mid">Mid-level</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Label className="text-xs">Status</Label>
              <Label className="text-xs">Sation</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Technician['status'] }))}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Unavailable">Unavailable</SelectItem>
                  <SelectItem value="Busy">Busy</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.station || ''} onValueChange={v => setForm(f => ({ ...f, station: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Station" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select a Station</SelectItem> {/* optional */}
                {stations.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
            <Button className="w-full gap-2 bg-primary hover:bg-primary/90" onClick={handleAdd} disabled={saving}>
              <Plus className="h-4 w-4" /> {saving ? 'Saving...' : 'Add Technician'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
