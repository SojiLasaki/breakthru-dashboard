import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { manualApi, Manual, ManualTag, formatFileSize } from '@/services/manualApi';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2, Search, BookOpen, Download, Plus, X,
  ArrowLeft, Tag, Cpu, User, CalendarDays, FileText, Paperclip, FileCheck,
  Package, Image as ImageIcon, Archive, HardDrive, Hammer, WrenchIcon, Settings2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import PdfViewer from '@/components/PdfViewer';

const CATEGORY_COLORS: Record<string, string> = {
  Engine:         'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Electrical:     'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Fuel System':  'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Cooling:        'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  Generator:      'text-green-400 bg-green-400/10 border-green-400/20',
  General:        'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

const CATEGORIES = ['Engine', 'Electrical', 'Fuel System', 'Cooling', 'Generator', 'General'];

function TagChip({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  );
}

function authorName(manual: Manual): string {
  if (!manual.created_by) return '—';
  return `${manual.created_by.first_name} ${manual.created_by.last_name}`.trim() || manual.created_by.username;
}

// Build action payload from manual
function buildActionPayload(manual: Manual) {
  return {
    component_name: manual.component.length > 0 ? manual.component[0].name : '',
    component_id: manual.component.length > 0 ? String(manual.component[0].id) : '',
    part_name: manual.parts_needed.length > 0 ? manual.parts_needed[0].name : '',
    part_id: manual.parts_needed.length > 0 ? String(manual.parts_needed[0].id) : '',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Manual Detail / Viewer
// ══════════════════════════════════════════════════════════════════════════════

function ManualViewer({ manual, onBack }: { manual: Manual; onBack: () => void }) {
  const { toast } = useToast();
  const hasPdf = !!manual.file;
  const colorClass = CATEGORY_COLORS[manual.category] || 'text-muted-foreground bg-muted/50 border-border';
  const [activeTab, setActiveTab] = useState<'content' | 'pdf'>('content');
  const [showPdf, setShowPdf] = useState(false);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadContent = useCallback(() => {
    const lines: string[] = [
      `MANUAL: ${manual.title}`,
      `Version: ${manual.version}`,
      `Category: ${manual.category}`,
      `Author: ${authorName(manual)}`,
      `Updated: ${manual.updated_at}`,
      '',
      'DESCRIPTION',
      '===========',
      manual.description,
    ];
    if (manual.component.length) {
      lines.push('', 'COMPONENTS', '==========', manual.component.map(c => c.name).join(', '));
    }
    if (manual.parts_needed.length) {
      lines.push('', 'PARTS NEEDED', '============', manual.parts_needed.map(p => `${p.name} (${p.part_number})`).join(', '));
    }
    if (manual.tags.length) {
      lines.push('', 'TAGS', '====', manual.tags.map(t => `#${t.name}`).join(', '));
    }
    if (manual.content) {
      lines.push('', 'CONTENT', '=======', manual.content);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${manual.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [manual]);

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      await manualApi.downloadZip(manual.id, manual.title);
    } catch (err: any) {
      toast({ title: 'Download unavailable', description: err?.message || 'Could not download ZIP bundle.', variant: 'destructive' });
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleAction = (action: string) => {
    const payload = buildActionPayload(manual);
    console.log(`[Manual Action] ${action}:`, payload);
    toast({ title: `${action} initiated`, description: `Sending ${action.toLowerCase()} request for ${payload.component_name || manual.title}` });
    // In production, send to external app:
    // fetch('https://external-app.example.com/api/actions', { method: 'POST', body: JSON.stringify({ action, ...payload }) });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* ── Top Bar ── */}
      {!pdfFullscreen && (
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
          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-blue-400/30 text-blue-400 hover:bg-blue-400/10" onClick={() => handleAction('Assembly')}>
              <Hammer className="h-3.5 w-3.5" /> Assembly
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-orange-400/30 text-orange-400 hover:bg-orange-400/10" onClick={() => handleAction('Disassembly')}>
              <WrenchIcon className="h-3.5 w-3.5" /> Disassembly
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-green-400/30 text-green-400 hover:bg-green-400/10" onClick={() => handleAction('Maintenance')}>
              <Settings2 className="h-3.5 w-3.5" /> Maintenance
            </Button>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleDownloadZip} disabled={downloadingZip}>
              {downloadingZip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
              Download ZIP
            </Button>
            {!hasPdf && manual.content && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleDownloadContent}>
                <Download className="h-3.5 w-3.5" /> Export Text
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* ── Left Info Panel ── */}
        {!pdfFullscreen && (
          <div className="w-72 border-r border-border bg-card flex-shrink-0 overflow-y-auto p-4 space-y-4 hidden lg:block">
            {/* Show PDF button */}
            {hasPdf && (
              <Button
                size="sm"
                className="w-full gap-2 bg-primary hover:bg-primary/90"
                onClick={() => setShowPdf(v => !v)}
              >
                <FileCheck className="h-3.5 w-3.5" />
                {showPdf ? 'Hide PDF' : 'Show PDF'}
              </Button>
            )}

            {/* Meta info */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Manual Info</p>
              <div className="space-y-2">
                {[
                  { label: 'Category', value: manual.category },
                  { label: 'Version', value: manual.version },
                  { label: 'Author', value: authorName(manual) },
                  { label: 'Created', value: manual.created_at ? new Date(manual.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                  { label: 'Updated', value: new Date(manual.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) },
                  { label: 'File Size', value: formatFileSize(manual.file_size ?? 0) },
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
            {manual.component.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Cpu className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Components</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {manual.component.map(c => (
                    <TagChip key={c.id} label={c.name} className="text-blue-400 bg-blue-400/10 border-blue-400/20" />
                  ))}
                </div>
              </div>
            )}

            {/* Parts Needed */}
            {manual.parts_needed.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Package className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Parts Needed</p>
                </div>
                <div className="space-y-1">
                  {manual.parts_needed.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded-md px-2 py-1 border border-border">
                      <span className="font-mono text-[10px] text-muted-foreground">{p.part_number}</span>
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {manual.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tags</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {manual.tags.map(t => (
                    <TagChip key={t.id} label={`#${t.name}`} className="text-muted-foreground bg-muted/50 border-border" />
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            {manual.images.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ImageIcon className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Images ({manual.images.length})</p>
                </div>
                <div className="space-y-2">
                  {manual.images.map(img => (
                    <div key={img.id} className="rounded-lg overflow-hidden border border-border">
                      <img src={img.image} alt={img.caption} className="w-full h-24 object-cover" />
                      {img.caption && <p className="text-[10px] text-muted-foreground px-2 py-1 bg-muted/30">{img.caption}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Main Content Area ── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto">
          {showPdf && hasPdf ? (
            <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4 bg-muted/10 min-h-0">
              {!pdfFullscreen && (
                <div className="flex flex-wrap items-center gap-2">
                  <TagChip label={manual.category} className={colorClass} />
                  <TagChip label={manual.version} className="text-muted-foreground bg-muted/50 border-border" />
                  {manual.tags.slice(0, 3).map(t => (
                    <TagChip key={t.id} label={`#${t.name}`} className="text-muted-foreground bg-muted/40 border-border" />
                  ))}
                </div>
              )}
              <PdfViewer
                url={manual.file!}
                title={manual.title}
                version={manual.version}
                onFullscreenChange={setPdfFullscreen}
                className="flex-1"
              />
            </div>
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
                      <p className="text-xs font-medium">{authorName(manual)}</p>
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

                  {/* Mobile action buttons */}
                  <div className="lg:hidden mb-6 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs border-blue-400/30 text-blue-400" onClick={() => handleAction('Assembly')}>
                      <Hammer className="h-3 w-3" /> Assembly
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs border-orange-400/30 text-orange-400" onClick={() => handleAction('Disassembly')}>
                      <WrenchIcon className="h-3 w-3" /> Disassembly
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs border-green-400/30 text-green-400" onClick={() => handleAction('Maintenance')}>
                      <Settings2 className="h-3 w-3" /> Maintenance
                    </Button>
                  </div>

                  {/* Chips row */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <TagChip label={manual.category} className={colorClass} />
                    <TagChip label={manual.version} className="text-muted-foreground bg-muted/50 border-border" />
                    {manual.tags.map(t => (
                      <TagChip key={t.id} label={`#${t.name}`} className="text-muted-foreground bg-muted/40 border-border" />
                    ))}
                  </div>

                  {/* Components */}
                  {manual.component.length > 0 && (
                    <div className="mb-6 bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Cpu className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold">Affected Components</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {manual.component.map(c => (
                          <TagChip key={c.id} label={c.name} className="text-blue-400 bg-blue-400/10 border-blue-400/20" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parts Needed */}
                  {manual.parts_needed.length > 0 && (
                    <div className="mb-6 bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold">Parts Needed</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {manual.parts_needed.map(p => (
                          <div key={p.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded-md px-3 py-2 border border-border">
                            <span className="font-mono text-[10px] text-muted-foreground">{p.part_number}</span>
                            <span>{p.name}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">{p.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Images */}
                  {manual.images.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <ImageIcon className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold">Images & Diagrams</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {manual.images.map(img => (
                          <div key={img.id} className="rounded-lg overflow-hidden border border-border bg-card">
                            <img src={img.image} alt={img.caption} className="w-full h-40 object-cover" />
                            {img.caption && <p className="text-xs text-muted-foreground px-3 py-2">{img.caption}</p>}
                          </div>
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
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-primary" />
                  </div>
                  <div className="text-center max-w-md">
                    <h2 className="text-lg font-semibold mb-2">{manual.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{manual.description}</p>
                    {hasPdf && (
                      <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setShowPdf(true)}>
                        <FileCheck className="h-3.5 w-3.5" /> Open PDF Viewer
                      </Button>
                    )}
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

// ══════════════════════════════════════════════════════════════════════════════
// Add Manual Dialog
// ══════════════════════════════════════════════════════════════════════════════

interface AddFormState {
  title: string; description: string; category: string;
  version: string; content: string; componentsRaw: string; tagsRaw: string;
}

function AddManualDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (m: Manual) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<AddFormState>({
    title: '', description: '', category: '',
    version: 'Rev. 1', content: '', componentsRaw: '', tagsRaw: '',
  });
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const field = (key: keyof AddFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
    setSelectedFile(file ?? null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.category) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await manualApi.create({
        title: form.title,
        description: form.description,
        category: form.category,
        version: form.version,
        content: form.content || undefined,
        file: selectedFile ?? undefined,
      });
      onCreated(created);
      onOpenChange(false);
      setForm({ title: '', description: '', category: '', version: 'Rev. 1', content: '', componentsRaw: '', tagsRaw: '' });
      setFileName(null);
      setSelectedFile(null);
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
          <div>
            <Label className="text-xs text-muted-foreground">Title *</Label>
            <Input value={form.title} onChange={field('title')} placeholder="e.g. ISX15 Turbo Boost Fault Procedure" className="bg-background mt-1" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Description *</Label>
            <Textarea value={form.description} onChange={field('description')} placeholder="Brief description…" rows={2} className="bg-background mt-1 resize-none" />
          </div>

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
              <Label className="text-xs text-muted-foreground">Version</Label>
              <Input value={form.version} onChange={field('version')} placeholder="e.g. Rev. 1" className="bg-background mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Text Content
            </Label>
            <Textarea
              value={form.content}
              onChange={field('content')}
              placeholder="Paste or type the manual content here…"
              rows={5}
              className="bg-background mt-1 resize-none text-xs font-mono"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Cpu className="h-3 w-3" /> Components <span className="opacity-50">(comma-separated)</span>
            </Label>
            <Input value={form.componentsRaw} onChange={field('componentsRaw')} placeholder="e.g. Turbocharger, Fuel Injectors" className="bg-background mt-1" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Tags <span className="opacity-50">(comma-separated)</span>
            </Label>
            <Input value={form.tagsRaw} onChange={field('tagsRaw')} placeholder="e.g. maintenance, diagnostics" className="bg-background mt-1" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" /> Attach PDF <span className="opacity-50">(optional)</span>
            </Label>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-dashed border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors text-xs text-muted-foreground"
            >
              <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
              {fileName ? (
                <span className="text-foreground truncate">{fileName}</span>
              ) : (
                <span>Click to attach a PDF document…</span>
              )}
            </button>
          </div>

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

// ══════════════════════════════════════════════════════════════════════════════
// Main Manuals Page
// ══════════════════════════════════════════════════════════════════════════════

export default function ManualsPage() {
  const { user } = useAuth();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [allTags, setAllTags] = useState<ManualTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [componentFilter, setComponentFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [viewingManual, setViewingManual] = useState<Manual | null>(null);

  const canCreate = user && ['admin', 'office_staff'].includes(user.role);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const fetchManuals = async () => {
      setLoading(true);
      try {
        const [data, tags] = await Promise.all([
          manualApi.getAll(debouncedSearch ? { search: debouncedSearch } : undefined),
          manualApi.getTags(),
        ]);
        if (!cancelled) {
          setManuals(data);
          setAllTags(tags);
        }
      } catch {
        if (!cancelled) setManuals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchManuals();
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(manuals.map(m => m.category)))], [manuals]);
  const components = useMemo(() => {
    const names = new Set<string>();
    manuals.forEach(m => m.component.forEach(c => names.add(c.name)));
    return ['All', ...Array.from(names).sort()];
  }, [manuals]);
  const tagNames = useMemo(() => ['All', ...Array.from(new Set(allTags.map(t => t.name))).sort()], [allTags]);

  const filtered = useMemo(() =>
    manuals.filter(m => {
      if (categoryFilter !== 'All' && m.category !== categoryFilter) return false;
      if (componentFilter !== 'All' && !m.component.some(c => c.name === componentFilter)) return false;
      if (tagFilter !== 'All' && !m.tags.some(t => t.name === tagFilter)) return false;
      return true;
    }),
    [manuals, categoryFilter, componentFilter, tagFilter],
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search manuals by title, category, or description…" className="pl-9 bg-card" />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${categoryFilter === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}>
              {cat}
            </button>
          ))}
        </div>

        {components.length > 1 && (
          <Select value={componentFilter} onValueChange={setComponentFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-card">
              <Cpu className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Component" />
            </SelectTrigger>
            <SelectContent>
              {components.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {tagNames.length > 1 && (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-card">
              <Tag className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              {tagNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
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
                      <div className="flex items-start gap-1.5">
                        <p className="text-sm font-medium line-clamp-2 flex-1">{manual.title}</p>
                        {manual.file && (
                          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/30 flex-shrink-0 mt-0.5">
                            <FileCheck className="h-2 w-2" /> PDF
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{manual.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>{manual.category}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border">{manual.version}</span>
                    {manual.file_size ? (
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border flex items-center gap-1">
                        <HardDrive className="h-2 w-2" /> {formatFileSize(manual.file_size)}
                      </span>
                    ) : null}
                  </div>

                  {manual.component.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {manual.component.slice(0, 2).map(c => (
                        <span key={c.id} className="text-[9px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">{c.name}</span>
                      ))}
                      {manual.component.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">+{manual.component.length - 2}</span>
                      )}
                    </div>
                  )}

                  {manual.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {manual.tags.slice(0, 3).map(t => (
                        <span key={t.id} className="text-[9px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border">#{t.name}</span>
                      ))}
                      {manual.tags.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{manual.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Updated: {new Date(manual.updated_at).toLocaleDateString()}</span>
                    <span>{authorName(manual)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddManualDialog open={showForm} onOpenChange={setShowForm} onCreated={m => setManuals(prev => [m, ...prev])} />
    </div>
  );
}
