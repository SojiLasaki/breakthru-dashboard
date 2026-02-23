import { useEffect, useState } from 'react';
// import { usersApi, UserProfile } from '@/services/usersApi';
import { staffApi, StaffProfile } from '@/services/staffApi';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Search, User, Mail, Calendar, Shield, ShieldCheck, Plus, Home,
  LayoutGrid, List, X, MapPin,
  Phone
} from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';


const ROLE_CONFIG: Record<string, { label: string; class: string; dot: string }> = {
  admin:        { label: 'Admin',        class: 'text-amber-400 bg-amber-400/10 border border-amber-400/20', dot: 'bg-amber-400' },
  office_staff: { label: 'Office Staff', class: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',   dot: 'bg-blue-400' },
};

const STATUS_CONFIG = {
  active:   { label: 'Active',   class: 'text-green-400 bg-green-400/10 border border-green-400/20', dot: 'bg-green-400' },
  inactive: { label: 'Inactive', class: 'text-muted-foreground bg-muted/50 border border-border',    dot: 'bg-muted-foreground' },
};

interface Station {
  id: string;
  name: string;
}
const EMPTY_FORM = {
  first_name: '', last_name: '', email: '', phone: '', 
  city: '', street_address: '', street_address_2:'', state:'',country:'',postal_code:'',
  status: 'Available',
  station: '' as string
};


export default function StaffPage() {
  const { user, isRole } = useAuth();
  const { defaultView } = useTheme();
  const [staff, setStaffs] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(defaultView);
  const [selected, setSelected] = useState<StaffProfile | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const isAdmin = isRole('admin');
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    staffApi.getAll().then(users => {
      // Admins see all staff (admin + office_staff); office_staff see only office_staff
      const staffUsers = users.filter(u => {
        if (isAdmin) return u.role === 'admin' || u.role === 'office';
        return u.role === 'office';
      });
      setStaffs(staffUsers);
    }).finally(() => setLoading(false));
  }, [isAdmin]);

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q);
    const matchRole = filterRole === 'all' || s.role === filterRole;
    return matchSearch && matchRole;
  });

  const [stations, setStations] = useState<{ id: string; name: string }[]>([]);
  const activeCount = staff.filter(s => s.status).length;

  const STATUS_CONFIG = {
    active:   { label: 'Active', class: 'text-green-400 bg-green-400/10 border border-green-400/20', dot: 'bg-green-400' },
    inactive: { label: 'Inactive', class: 'text-muted-foreground bg-muted/50 border border-border', dot: 'bg-muted-foreground' },
    busy:     { label: 'Busy', class: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20', dot: 'bg-yellow-400' },
    unavailable: { label: 'Unavailable', class: 'text-red-400 bg-red-400/10 border border-red-400/20', dot: 'bg-red-400' },
  };
  
    const handleAdd = async () => {
      if (!form.first_name.trim() || !form.email.trim()) return;
      setSaving(true);
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      try {
        const newStaff = await staffApi.create({
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
        });
        setStaffs(prev => [newStaff, ...prev]);
        setForm(EMPTY_FORM);
        setAddOpen(false);
        toast({ title: 'Staff added', description: `${fullName} has been registered.` });
      } catch {
        toast({ title: 'Error', description: 'Failed to add staff.', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    };
  
    const getAvatarUrl = (s: StaffProfile) =>
      s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent((s.first_name ?? '') + ' ' + (s.last_name ?? ''))}&background=1a1f2e&color=e61409&size=96`;
  
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Staff</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? 'Admins & Office Staff' : 'Office Staff members'}
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0">
        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
          <div>
            <p className="text-lg font-bold">{staff.length}</p>
            <p className="text-xs text-muted-foreground">Total Staff</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div>
            <p className="text-lg font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
        </div>
        {isAdmin && (
          <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div>
              <p className="text-lg font-bold">{staff.filter(s => s.role === 'admin').length}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </div>
        )}
        {!isAdmin && (
          <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <div>
              <p className="text-lg font-bold">{staff.filter(s => s.role === 'office').length}</p>
              <p className="text-xs text-muted-foreground">Office Staff</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email..." className="pl-9 bg-card" />
        </div>
        {isAdmin && (
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="bg-card w-full sm:w-44"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="office">Office Staff</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-1 bg-card border border-border rounded-md p-1">
          <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('cards')} title="Card View">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('table')} title="Table View">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <User className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No staff members</p>
              <p className="text-xs text-muted-foreground/60 mt-1">No staff match your current filters.</p>
            </div>
          ) : viewMode === 'table' ? (
            <DataTable<StaffProfile>
            columns={[
              { label: 'Name', render: s => (
                <div className="flex items-center gap-2">
                  <img src={getAvatarUrl(s)} alt="" className="w-7 h-7 rounded-full object-cover" />
                  <span className="font-medium">{s.first_name} {s.last_name}</span>
                </div>
              )},
                { label: 'Email', render: (s) => (
                  <span className="font-medium">{s.email}</span>
                )},
                { label: 'Username', render: (s) => (
                  <span className="font-medium">{s.username}</span>
                )},
                { label: 'Phone', render: (s) => (
                  <span className="font-medium">{s.phone_number}</span>
                )},
                { label: 'Role', render: (s) => {
                  const cfg = ROLE_CONFIG[s.role] ?? ROLE_CONFIG.office_staff;
                  return <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>;
                }},
                { label: 'Status', render: (s) => {
                  // const cfg = s.status ? STATUS_CONFIG.active : STATUS_CONFIG.inactive;
                  const cfg = STATUS_CONFIG[s.status.toLowerCase()] ?? STATUS_CONFIG.inactive;
                  return <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.class}`}>{cfg.label}</span>;
                }},
                { label: 'Statiom', render: (s) => <span className="text-muted-foreground">{s.station}</span> },
              ] as Column<StaffProfile>[]}
              data={filtered}
              rowKey={(s) => s.id}
              onRowClick={(s) => setSelected(selected?.id === s.id ? null : s)}
              emptyMessage="No staff members"
            />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-2 gap-4">
              {filtered.map(s => {
                const roleCfg = ROLE_CONFIG[s.role] ?? ROLE_CONFIG.office_staff;
                const statusCfg = s.status ? STATUS_CONFIG.active : STATUS_CONFIG.inactive;
                const isActive = selected?.id === s.id;
                const RoleIcon = s.role === 'admin' ? ShieldCheck : Shield;
                return (
                  <Card
                    key={s.id}
                    className={`bg-card border-border overflow-hidden cursor-pointer transition-colors ${isActive ? 'border-primary/50' : 'hover:border-primary/30'}`}
                    onClick={() => setSelected(isActive ? null : s)}
                  >
                    <CardContent className="p-0">
                      <div className="flex">
                        {/* Left profile column */}
                        <div className="flex flex-col items-center justify-center gap-3 p-5 bg-muted/30 border-r border-border min-w-[120px]">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center ring-2 ring-primary/30">
                              <span className="text-lg font-bold text-primary">{s.first_name}{s.last_name}</span>
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${statusCfg.dot}`} />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-xs leading-tight">{s.first_name} {s.last_name}</p>
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              <RoleIcon className="h-2.5 w-2.5 text-muted-foreground" />
                              <p className="text-[9px] text-muted-foreground">{roleCfg.label}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${statusCfg.class}`}>{statusCfg.label}</span>
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${roleCfg.class}`}>{roleCfg.label}</span>
                          </div>
                        </div>

                        {/* Right details */}
                        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2"><Mail className="h-3 w-3 flex-shrink-0 text-primary/60" /><span className="truncate">{s.email}</span></div>
                            <div className="flex items-center gap-2"><User className="h-3 w-3 flex-shrink-0 text-primary/60" /><span>@{s.username}</span></div>
                            <div className="flex items-center gap-2"><Phone className="h-3 w-3 flex-shrink-0 text-primary/60" /><span>{s.phone_number}</span></div>
                            <div className="flex items-center gap-2"><MapPin className="h-3 w-3 flex-shrink-0 text-primary/60" /><span>{s.station}</span></div>
                            <div className="flex items-center gap-2"><Home className="h-3 w-3 flex-shrink-0 text-primary/60" /><span>{s.station}</span></div>
                          </div>
                          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Last login: {s.last_login ? new Date(s.last_login).toLocaleDateString() : 'Never'}</span>
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
              <p className="text-sm font-semibold">Staff Detail</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center ring-2 ring-primary/30">
                    <span className="text-xl font-bold text-primary">{selected.first_name}{selected.last_name}</span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${(selected.status ? STATUS_CONFIG.active : STATUS_CONFIG.inactive).dot}`} />
                </div>
                <div>
                  <p className="font-bold text-sm">{selected.first_name} {selected.last_name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">@{selected.username}</p>
                </div>
                <div className="flex gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${(selected.status ? STATUS_CONFIG.active : STATUS_CONFIG.inactive).class}`}>
                    {selected.status ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${(ROLE_CONFIG[selected.role] ?? ROLE_CONFIG.office_staff).class}`}>
                    {(ROLE_CONFIG[selected.role] ?? ROLE_CONFIG.office_staff).label}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">Contact</p>
                <div className="space-y-2.5">
                  {[
                    { icon: Mail,     value: selected.email },
                    { icon: Calendar, value: `Joined ${new Date(selected.date_joined).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}` },
                    { icon: Calendar, value: `Last login: ${selected.last_login ? new Date(selected.last_login).toLocaleDateString() : 'Never'}` },
                    { icon: MapPin,     value: selected.station },
                  ].map(({ icon: Icon, value }) => (
                    <div key={value} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="h-3 w-3 text-primary" />
                      </div>
                      <span className="break-all leading-tight">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Add Staff Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Add New Staff
            </DialogTitle>
            <DialogDescription>Fill in the details to register a new staff.</DialogDescription>
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
                  <Label className="text-xs">Phone Number</Label>
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
              <Label className="text-xs">Status</Label>
              <Label className="text-xs">Sation</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as StaffProfile['status'] }))}>
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
              <Plus className="h-4 w-4" /> {saving ? 'Saving...' : 'Add Staff'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
