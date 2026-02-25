import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw,
  Download, Maximize2, Minimize2, AlertTriangle, RefreshCw, Search, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PdfViewerProps {
  url: string;
  title?: string;
  version?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  className?: string;
}

export default function PdfViewer({ url, title, version, onFullscreenChange, className }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderTasksRef = useRef<{ cancel: () => void }[]>([]);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ page: number; count: number }[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const pdfDocRef = useRef<any>(null);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const next = !prev;
      onFullscreenChange?.(next);
      return next;
    });
  }, [onFullscreenChange]);

  // Close fullscreen on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        onFullscreenChange?.(false);
      }
      // Ctrl+F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && numPages > 0) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen, onFullscreenChange, numPages]);

  // PDF Loading
  useEffect(() => {
    let cancelled = false;
    canvasRefs.current = [];

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      setNumPages(0);
      setCurrentPage(1);

      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);

        renderTasksRef.current.forEach(t => t.cancel());
        renderTasksRef.current = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });
          const canvas = canvasRefs.current[pageNum - 1];
          if (!canvas) continue;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const renderTask = page.render({ canvasContext: ctx, viewport });
          renderTasksRef.current.push(renderTask);
          await renderTask.promise;
        }
      } catch {
        if (!cancelled) {
          setError('Unable to render this PDF. The file may be unavailable or in an unsupported format.');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      renderTasksRef.current.forEach(t => t.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, scale, retryKey]);

  // Text search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !pdfDocRef.current) {
      setSearchResults([]);
      return;
    }
    const pdf = pdfDocRef.current;
    const results: { page: number; count: number }[] = [];
    const q = searchQuery.toLowerCase();

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ').toLowerCase();
      const count = text.split(q).length - 1;
      if (count > 0) results.push({ page: i, count });
    }

    setSearchResults(results);
    setCurrentMatch(0);
    if (results.length > 0) scrollToPage(results[0].page);
  }, [searchQuery]);

  const navigateMatch = (dir: 1 | -1) => {
    if (searchResults.length === 0) return;
    const next = (currentMatch + dir + searchResults.length) % searchResults.length;
    setCurrentMatch(next);
    scrollToPage(searchResults[next].page);
  };

  const scrollToPage = (page: number) => {
    const canvas = canvasRefs.current[page - 1];
    canvas?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCurrentPage(page);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = title ? `${title.replace(/[^a-z0-9]/gi, '_')}.pdf` : 'manual.pdf';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const totalMatches = searchResults.reduce((s, r) => s + r.count, 0);

  return (
    <div
      className={cn(
        'flex flex-col bg-card border border-border rounded-2xl shadow-xl overflow-hidden transition-all duration-300',
        isFullscreen && 'fixed inset-0 z-[100] rounded-none border-0',
        className,
      )}
    >
      {/* ── Control Bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card flex-shrink-0 gap-3">
        {/* Left: title + version */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate leading-none">{title ?? 'Document'}</p>
            {version && <p className="text-[10px] text-muted-foreground mt-0.5">{version}</p>}
          </div>
        </div>

        {/* Center: page navigation + zoom */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || numPages === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[52px] text-center tabular-nums">
            {numPages > 0 ? `${currentPage} / ${numPages}` : '—'}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages || numPages === 0}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-9 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Reset zoom" onClick={() => setScale(1.2)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Right: search + download + fullscreen */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => setShowSearch(v => !v)}
            disabled={numPages === 0}
            title="Search (Ctrl+F)"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 gap-1.5 text-xs px-2.5 hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* ── Search Bar ─────────────────────────────────────────────── */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0">
          <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSearch();
              if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }
            }}
            placeholder="Search in document…"
            className="h-7 text-xs bg-background flex-1"
          />
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleSearch}>Find</Button>
          {searchResults.length > 0 && (
            <>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {totalMatches} match{totalMatches !== 1 ? 'es' : ''} on {searchResults.length} page{searchResults.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateMatch(-1)}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateMatch(1)}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ── PDF Canvas Area ──────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 overflow-y-auto bg-muted/20 p-4 space-y-4',
          isFullscreen ? 'h-[calc(100vh-46px)]' : '',
        )}
        style={{ minHeight: isFullscreen ? undefined : '70vh' }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading manual…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Preview Unavailable</p>
              <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
            </div>
            <Button
              size="sm" variant="outline"
              className="gap-2 hover:border-primary/50 hover:text-primary"
              onClick={() => setRetryKey(k => k + 1)}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        )}

        {!loading && !error && numPages > 0 && Array.from({ length: numPages }, (_, i) => (
          <div
            key={i}
            className={cn(
              'flex justify-center',
              searchResults.some(r => r.page === i + 1) && 'ring-2 ring-primary/50 rounded-xl',
            )}
            onMouseEnter={() => setCurrentPage(i + 1)}
          >
            <canvas
              ref={el => { canvasRefs.current[i] = el; }}
              className="rounded-xl shadow-lg border border-border max-w-full"
              style={{ background: '#fff' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
