import { useEffect, useState, useMemo } from 'react';
import { manualApi, Manual } from '@/services/manualApi';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Search, BookOpen, Download, ExternalLink, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const CATEGORY_COLORS: Record<string, string> = {
  Engine:       'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Electrical:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Fuel System':'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Cooling:      'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  Generator:    'text-green-400 bg-green-400/10 border-green-400/20',
  General:      'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

const CATEGORIES = ['Engine', 'Electrical', 'Fuel System', 'Cooling', 'Generator', 'General'];

const BLANK_FORM = { title: '', description: '', category: '', engine_model: '', version: 'Rev. 1' };

export default function ManualsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [selectedManual, setSelectedManual] = useState<Manual | null>(null);

  const canCreate = user && ['admin', 'office_staff', 'engine_technician', 'electrical_technician'].includes(user.role);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    manualApi.getAll(debouncedSearch || undefined).then(setManuals).finally(() => setLoading(false));
  }, [debouncedSearch]);

  const categories = ['All', ...Array.from(new Set(manuals.map(m => m.category)))];

  const filtered = useMemo(() =>
    categoryFilter === 'All' ? manuals : manuals.filter(m => m.category === categoryFilter),
    [manuals, categoryFilter]
  );

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.category || !form.engine_model.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const authorName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Technician';
      const created = await manualApi.create(form, authorName);
      setManuals(prev => [created, ...prev]);
      setShowForm(false);
      setForm(BLANK_FORM);
      toast({ title: 'Manual added', description: `"${created.title}" has been added to the knowledge base.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to save the manual.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Manuals</h1>
          <p className="text-muted-foreground text-sm">Technical documentation and service manuals</p>
        </div>
        {canCreate && (
          <Button size="sm" className="gap-2 btn-primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add Manual
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search manuals by title, category, or model..." className="pl-9 bg-card" />
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${categoryFilter === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No manuals found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(manual => {
            const colorClass = CATEGORY_COLORS[manual.category] || 'text-muted-foreground bg-muted/50 border-border';
            return (
              <Card key={manual.id} className="bg-card border-border card-hover cursor-pointer" onClick={() => setSelectedManual(manual)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{manual.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{manual.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>{manual.category}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border">{manual.engine_model}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border">{manual.version}</span>
                  </div>
                  {manual.author && <p className="text-[10px] text-muted-foreground mt-2">By {manual.author}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-[10px] text-muted-foreground">Updated {new Date(manual.updated_at).toLocaleDateString()}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-primary/60" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Manual Detail Sheet */}
      <Sheet open={!!selectedManual} onOpenChange={open => !open && setSelectedManual(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {selectedManual && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-base leading-tight">{selectedManual.title}</SheetTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedManual.engine_model} · {selectedManual.version}</p>
                  </div>
                </div>
              </SheetHeader>
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border ${CATEGORY_COLORS[selectedManual.category] || 'text-muted-foreground bg-muted/50 border-border'}`}>{selectedManual.category}</span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border">{selectedManual.engine_model}</span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border">{selectedManual.version}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                  <div className="bg-muted/30 border border-border rounded-lg p-4 text-sm text-muted-foreground leading-relaxed">
                    {selectedManual.description}
                  </div>
                </div>
                {selectedManual.author && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Author</p>
                    <p className="text-sm">{selectedManual.author}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Last updated: {new Date(selectedManual.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 gap-2">
                    <Download className="h-4 w-4" /> Download
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2">
                    <ExternalLink className="h-4 w-4" /> Open
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Manual Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Add to Knowledge Base
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. ISX15 Turbo Boost Fault Procedure"
                className="bg-background mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Description *</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of what this manual covers..."
                rows={3}
                className="bg-background mt-1 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category *</Label>
                <Select value={form.category} onValueChange={val => setForm(f => ({ ...f, category: val }))}>
                  <SelectTrigger className="bg-background mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Engine Model *</Label>
                <Input
                  value={form.engine_model}
                  onChange={e => setForm(f => ({ ...f, engine_model: e.target.value }))}
                  placeholder="e.g. ISX15"
                  className="bg-background mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Version</Label>
              <Input
                value={form.version}
                onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                placeholder="e.g. Rev. 1"
                className="bg-background mt-1"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Manual'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
