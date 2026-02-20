import { useEffect, useState, useMemo, useRef } from 'react';
import { manualApi, Manual } from '@/services/manualApi';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2, Search, BookOpen, Download, ExternalLink, Plus, X,
  ArrowLeft, Tag, Cpu, User, CalendarDays, FileText, Paperclip,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import PdfViewer from '@/components/PdfViewer';
import { Badge } from '@/components/ui/badge';

const CATEGORY_COLORS: Record<string, string> = {
  Engine:         'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Electrical:     'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Fuel System':  'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Cooling:        'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  Generator:      'text-green-400 bg-green-400/10 border-green-400/20',
  General:        'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

const CATEGORIES = ['Engine', 'Electrical', 'Fuel System', 'Cooling', 'Generator', 'General'];

const BLANK_FORM = {
  title: '', description: '', category: '', engine_model: '',
  version: 'Rev. 1', content: '', componentsRaw: '', tagsRaw: '',
};

// ── Tag chip component ────────────────────────────────────────────────────────
function TagChip({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  );
}

// ── Manual detail / PDF viewer ────────────────────────────────────────────────
function ManualViewer({ manual, onBack }: { manual: Manual; onBack: () => void }) {
  const hasRealPdf = manual.file_url && manual.file_url !== '#';
  const colorClass = CATEGORY_COLORS[manual.category] || 'text-muted-foreground bg-muted/50 border-border';
  const [activeTab, setActiveTab] = useState<'content' | 'pdf'>(hasRealPdf ? 'pdf' : 'content');

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Manuals
        </Button>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium truncate">{manual.title}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">{manual.version}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasRealPdf && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
              <a href={manual.file_url} download>
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left info panel */}
        <div className="w-64 border-r border-border bg-card flex-shrink-0 overflow-y-auto p-4 space-y-4 hidden lg:block">
          {/* Tabs */}
          {hasRealPdf && (
            <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
              {(['pdf', 'content'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 text-[10px] py-1 rounded-md capitalize font-medium transition-colors ${
                    activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'pdf' ? 'PDF' : 'Content'}
                </button>
              ))}
            </div>
          )}

          {/* Meta info */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Manual Info</p>
            <div className="space-y-2">
              {[
                { label: 'Category',     value: manual.category },
                { label: 'Engine Model', value: manual.engine_model },
                { label: 'Version',      value: manual.version },
                { label: 'Author',       value: manual.author ?? '—' },
                { label: 'Created by',   value: manual.created_by ?? manual.author ?? '—' },
                { label: 'Created',      value: manual.created_at ? new Date(manual.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                { label: 'Updated',      value: new Date(manual.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xs font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-muted/30 border border-border rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Description</p>
            <p className="text-xs leading-relaxed">{manual.description}</p>
          </div>

          {/* Components */}
          {manual.components && manual.components.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Components</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {manual.components.map(c => (
                  <TagChip key={c} label={c} className="text-blue-400 bg-blue-400/10 border-blue-400/20" />
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {manual.tags && manual.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Tag className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tags</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {manual.tags.map(t => (
                  <TagChip key={t} label={`#${t}`} className="text-muted-foreground bg-muted/50 border-border" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main area */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          {activeTab === 'pdf' && hasRealPdf ? (
            <PdfViewer url={manual.file_url} title={manual.title} />
          ) : (
            <div className="flex-1 overflow-y-auto bg-muted/10 p-6 lg:p-8">
              {manual.content ? (
                <div className="max-w-3xl mx-auto">
                  {/* Mobile meta */}
                  <div className="lg:hidden mb-6 grid grid-cols-2 gap-3">
                    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Created by</p>
                      </div>
                      <p className="text-xs font-medium">{manual.created_by ?? manual.author ?? '—'}</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Created</p>
                      </div>
                      <p className="text-xs font-medium">
                        {manual.created_at ? new Date(manual.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Chips row */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <TagChip label={manual.category} className={colorClass} />
                    <TagChip label={manual.engine_model} className="text-muted-foreground bg-muted/50 border-border" />
                    <TagChip label={manual.version} className="text-muted-foreground bg-muted/50 border-border" />
                    {manual.tags?.map(t => (
                      <TagChip key={t} label={`#${t}`} className="text-muted-foreground bg-muted/40 border-border" />
                    ))}
                  </div>

                  {/* Components row */}
                  {manual.components && manual.components.length > 0 && (
                    <div className="mb-6 bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Cpu className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold">Affected Components</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {manual.components.map(c => (
                          <TagChip key={c} label={c} className="text-blue-400 bg-blue-400/10 border-blue-400/20" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Text content */}
                  <div className="prose prose-sm prose-invert max-w-none">
                    {manual.content.split('\n').map((line, i) => {
                      if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-semibold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>;
                      if (line.startsWith('# '))  return <h1 key={i} className="text-base font-bold mt-4 mb-2 text-foreground">{line.slice(2)}</h1>;
                      if (line.startsWith('- '))  return <li key={i} className="text-xs text-muted-foreground ml-4 leading-relaxed">{line.slice(2)}</li>;
                      if (line.trim() === '')      return <div key={i} className="h-3" />;
                      return <p key={i} className="text-xs text-foreground/90 leading-relaxed">{line}</p>;
                    })}
                  </div>
                </div>
              ) : (
                /* No content fallback */
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-primary" />
                  </div>
                  <div className="text-center max-w-md">
                    <h2 className="text-lg font-semibold mb-2">{manual.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{manual.description}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm text-center">
                    <p className="text-sm font-medium mb-1">No content available</p>
                    <p className="text-xs text-muted-foreground mb-4">This manual entry has no text content or PDF file attached yet.</p>
                    <Button variant="outline" className="gap-2 w-full" asChild>
                      <a href="#"><ExternalLink className="h-4 w-4" /> Request from Knowledge Base</a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Manual Form ───────────────────────────────────────────────────────────
interface AddFormState {
  title: string; description: string; category: string;
  engine_model: string; version: string; content: string;
  componentsRaw: string; tagsRaw: string;
}

function AddManualDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (m: Manual) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<AddFormState>({
    title: '', description: '', category: '', engine_model: '',
    version: 'Rev. 1', content: '', componentsRaw: '', tagsRaw: '',
  });
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const field = (key: keyof AddFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.category || !form.engine_model.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const authorName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Technician';
      const components = form.componentsRaw.split(',').map(s => s.trim()).filter(Boolean);
      const tags = form.tagsRaw.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean);
      const created = await manualApi.create(
        { title: form.title, description: form.description, category: form.category,
          engine_model: form.engine_model, version: form.version,
          content: form.content || undefined,
          components: components.length ? components : undefined,
          tags: tags.length ? tags : undefined,
        },
        authorName,
      );
      onCreated(created);
      onOpenChange(false);
      setForm({ title: '', description: '', category: '', engine_model: '', version: 'Rev. 1', content: '', componentsRaw: '', tagsRaw: '' });
      setFileName(null);
      toast({ title: 'Manual added', description: `"${created.title}" has been added to the knowledge base.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to save the manual.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Add to Knowledge Base
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Title */}
          <div>
            <Label className="text-xs text-muted-foreground">Title *</Label>
            <Input value={form.title} onChange={field('title')} placeholder="e.g. ISX15 Turbo Boost Fault Procedure" className="bg-background mt-1" />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Description *</Label>
            <Textarea value={form.description} onChange={field('description')} placeholder="Brief description…" rows={2} className="bg-background mt-1 resize-none" />
          </div>

          {/* Category + Engine Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Category *</Label>
              <Select value={form.category} onValueChange={val => setForm(f => ({ ...f, category: val }))}>
                <SelectTrigger className="bg-background mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Engine Model *</Label>
              <Input value={form.engine_model} onChange={field('engine_model')} placeholder="e.g. ISX15" className="bg-background mt-1" />
            </div>
          </div>

          {/* Version */}
          <div>
            <Label className="text-xs text-muted-foreground">Version</Label>
            <Input value={form.version} onChange={field('version')} placeholder="e.g. Rev. 1" className="bg-background mt-1" />
          </div>

          {/* Text content */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Text Content
            </Label>
            <Textarea
              value={form.content}
              onChange={field('content')}
              placeholder="Paste or type the manual content here. Supports ## Heading, - list items, plain paragraphs…"
              rows={5}
              className="bg-background mt-1 resize-none text-xs font-mono"
            />
          </div>

          {/* Components */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Cpu className="h-3 w-3" /> Components <span className="opacity-50">(comma-separated)</span>
            </Label>
            <Input value={form.componentsRaw} onChange={field('componentsRaw')} placeholder="e.g. Turbocharger, Fuel Injectors, EGR Valve" className="bg-background mt-1" />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Tags <span className="opacity-50">(comma-separated)</span>
            </Label>
            <Input value={form.tagsRaw} onChange={field('tagsRaw')} placeholder="e.g. maintenance, diagnostics, ISX15" className="bg-background mt-1" />
          </div>

          {/* File upload */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" /> Attach Document <span className="opacity-50">(PDF, optional)</span>
            </Label>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-dashed border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors text-xs text-muted-foreground"
            >
              <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
              {fileName ? (
                <span className="text-foreground truncate">{fileName}</span>
              ) : (
                <span>Click to attach a PDF or document…</span>
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Manual
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ManualsPage() {
  const { user } = useAuth();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [viewingManual, setViewingManual] = useState<Manual | null>(null);

  const canCreate = user && ['admin', 'office_staff', 'engine_technician', 'electrical_technician'].includes(user.role);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const fetchManuals = async () => {
      setLoading(true);
      try {
        const data = await manualApi.getAll(debouncedSearch || undefined);
        if (!cancelled) setManuals(data);
      } catch (err) {
        console.error('Failed to load manuals:', err);
        if (!cancelled) setManuals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchManuals();
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(manuals.map(m => m.category)))], [manuals]);
  const filtered = useMemo(() =>
    categoryFilter === 'All' ? manuals : manuals.filter(m => m.category === categoryFilter),
    [manuals, categoryFilter],
  );

  if (viewingManual) return <ManualViewer manual={viewingManual} onBack={() => setViewingManual(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Manuals</h1>
          <p className="text-muted-foreground text-sm">Technical documentation and service manuals</p>
        </div>
        {canCreate && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Add Manual
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search manuals by title, category, or model…" className="pl-9 bg-card" />
      </div>

      {/* Category filters */}
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
              <Card
                key={manual.id}
                className="bg-card border-border cursor-pointer hover:border-primary/40 transition-colors group"
                onClick={() => setViewingManual(manual)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{manual.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{manual.description}</p>
                    </div>
                  </div>

                  {/* Category / model / version chips */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>{manual.category}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border">{manual.engine_model}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border">{manual.version}</span>
                  </div>

                  {/* Tags row */}
                  {manual.tags && manual.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {manual.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/50">#{t}</span>
                      ))}
                      {manual.tags.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{manual.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{manual.created_by ?? manual.author ?? '—'}</span>
                    </div>
                    <span className="text-[10px] text-primary font-medium group-hover:underline">Open →</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddManualDialog
        open={showForm}
        onOpenChange={setShowForm}
        onCreated={m => setManuals(prev => [m, ...prev])}
      />
    </div>
  );
}
