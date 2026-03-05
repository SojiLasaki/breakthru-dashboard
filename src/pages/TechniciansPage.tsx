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
import {
  getExpertiseLabel,
  getSpecializationLabel,
  getStatusLabel,
  getExpertiseStars,
  STATUS_CLASS,
  STATUS_DOT,
  EXPERTISE_CLASS,
  TECHNICIAN_STATUS,
  SPECIALIZATION_POSITION,
  EXPERTISE_LEVEL,
} from '@/lib/technicianProfile';

const SPEC_ICONS: Record<string, typeof Wrench> = {
  engine: Wrench,
  electrical: Zap,
  general: Settings,
};
                                                                                                                                                                                                                                                                                                                                                                                                  
interface Station {
  id: string;
  name: string;
}
const EMPTY_FORM = {
  first_name: '', last_name: '', email: '', phone: '',
  city: '', street_address: '', street_address_2: '', state: '', country: '', postal_code: '',
  specialization: 'engine',
  expertise: 'junior',
  status: 'available',
  station: '' as string,
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

  const isAdmin = isRole('admin', 'office');
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
      (t.first_name ?? '').toLowerCase().includes(q) ||
      (t.last_name ?? '').toLowerCase().includes(q) ||
      (t.specialization ?? '').toLowerCase().includes(q) ||
      (t.city ?? '').toLowerCase().includes(q) ||
      (t.status ?? '').toLowerCase().includes(q) ||
      (t.expertise ?? '').toLowerCase().includes(q);
  
    const specNorm = (t.specialization ?? '').toLowerCase();
    const expertiseNorm = (t.expertise ?? '').toLowerCase();
    const matchSpec = filterSpec === 'all' || specNorm === filterSpec;
    const matchExpertise = filterExpertise === 'all' || expertiseNorm === filterExpertise;
  
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
        street_address_2: form.street_address_2.trim(),
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
        {(Object.keys(TECHNICIAN_STATUS) as Array<keyof typeof TECHNICIAN_STATUS>).map(status => {
          const count = techs.filter(t => (t.status ?? '').toLowerCase() === status).length;
          const dotClass = STATUS_DOT[status] ?? 'bg-muted-foreground';
          const label = TECHNICIAN_STATUS[status];
          return (
            <div key={status} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
              <div>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
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
            <SelectItem value="all">All Specializations</SelectItem>
            {(Object.entries(SPECIALIZATION_POSITION) as [keyof typeof SPECIALIZATION_POSITION, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterExpertise} onValueChange={setFilterExpertise}>
          <SelectTrigger className="bg-card w-full sm:w-40"><SelectValue placeholder="Expertise" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {(Object.entries(EXPERTISE_LEVEL) as [keyof typeof EXPERTISE_LEVEL, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
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
                  const key = (t.specialization ?? '').toLowerCase();
                  const Icon = SPEC_ICONS[key] ?? Settings;
                  return <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{getSpecializationLabel(t.specialization)}</span>;
                }},
                { label: 'Expertise', render: t => {
                  const key = (t.expertise ?? '').toLowerCase();
                  const cls = EXPERTISE_CLASS[key] ?? '';
                  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{getExpertiseLabel(t.expertise)}</span>;
                }},
                { label: 'Status', render: t => {
                  const key = (t.status ?? '').toLowerCase();
                  const cls = STATUS_CLASS[key] ?? STATUS_CLASS.unavailable;
                  const dot = STATUS_DOT[key] ?? 'bg-muted-foreground';
                  return <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit ${cls}`}><span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{getStatusLabel(t.status)}</span>;
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
                const statusKey = (tech.status ?? '').toLowerCase();
                const expertiseKey = (tech.expertise ?? '').toLowerCase();
                const specKey = (tech.specialization ?? '').toLowerCase();
                const statusClass = STATUS_CLASS[statusKey] ?? STATUS_CLASS.unavailable;
                const statusDot = STATUS_DOT[statusKey] ?? 'bg-muted-foreground';
                const expertiseClass = EXPERTISE_CLASS[expertiseKey] ?? '';
                const SpecIcon = SPEC_ICONS[specKey] ?? Settings;
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
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${statusDot}`} />
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              <SpecIcon className="h-2.5 w-2.5 text-muted-foreground" />
                              <p className="text-[9px] text-muted-foreground">{getSpecializationLabel(tech.specialization)}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${statusClass}`}>{getStatusLabel(tech.status)}</span>
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${expertiseClass}`}>{getExpertiseLabel(tech.expertise)}</span>
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
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${STATUS_DOT[(selected.status ?? '').toLowerCase()] ?? 'bg-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-bold text-sm">{selected.first_name} {selected.last_name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{getSpecializationLabel(selected.specialization)} Specialist</p>
                </div>
                <div className="flex gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_CLASS[(selected.status ?? '').toLowerCase()] ?? STATUS_CLASS.unavailable}`}>
                    {getStatusLabel(selected.status)}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${EXPERTISE_CLASS[(selected.expertise ?? '').toLowerCase()] ?? ''}`}>
                    {getExpertiseLabel(selected.expertise)}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3].map(i => (
                    <Star key={i} className={`h-4 w-4 ${i <= getExpertiseStars(selected.expertise) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email *</Label>
                <Input
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  placeholder="+123456789"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Street Address *</Label>
              <Input
                placeholder="123 Main St"
                value={form.street_address}
                onChange={e => setForm(f => ({ ...f, street_address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Street Address 2</Label>
              <Input
                placeholder="Apt D"
                value={form.street_address_2}
                onChange={e => setForm(f => ({ ...f, street_address_2: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input
                  placeholder="Indianapolis"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">State</Label>
                <Input
                  placeholder="Indiana"
                  value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <Input
                  placeholder="USA"
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Postal / Zip Code</Label>
                <Input
                  placeholder="46201"
                  value={form.postal_code}
                  onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Label className="text-xs">Specialization</Label>
              <Label className="text-xs">Expertise</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select value={form.specialization} onValueChange={v => setForm(f => ({ ...f, specialization: v }))}>
                <SelectTrigger><SelectValue placeholder="Specialization" /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(SPECIALIZATION_POSITION) as [keyof typeof SPECIALIZATION_POSITION, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.expertise} onValueChange={v => setForm(f => ({ ...f, expertise: v }))}>
                <SelectTrigger><SelectValue placeholder="Expertise" /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(EXPERTISE_LEVEL) as [keyof typeof EXPERTISE_LEVEL, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Label className="text-xs">Status</Label>
              <Label className="text-xs">Station</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TECHNICIAN_STATUS) as [keyof typeof TECHNICIAN_STATUS, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={form.station ? form.station : '__none__'}
                onValueChange={v => setForm(f => ({ ...f, station: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select Station" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No station</SelectItem>
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
