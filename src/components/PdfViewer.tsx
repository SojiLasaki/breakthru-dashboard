import { useEffect, useRef, useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfViewerProps {
  url: string;
  title?: string;
}

export default function PdfViewer({ url, title }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderTasksRef = useRef<{ cancel: () => void }[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);

      try {
        // Dynamic import to avoid SSR issues
        const pdfjsLib = await import('pdfjs-dist');
        // Use a CDN worker that matches pdfjs-dist 4.4.168
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        setNumPages(pdf.numPages);
        setLoading(false);

        // Cancel any ongoing renders
        renderTasksRef.current.forEach(t => t.cancel());
        renderTasksRef.current = [];

        // Render all pages
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
      } catch (err) {
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
  }, [url, scale]);

  const scrollToPage = (page: number) => {
    const canvas = canvasRefs.current[page - 1];
    canvas?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{title}</span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || numPages === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[60px] text-center">
            {numPages > 0 ? `${currentPage} / ${numPages}` : '—'}
          </span>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages || numPages === 0}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(1.2)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Viewer */}
      <div ref={containerRef} className="flex-1 overflow-y-auto bg-muted/20 p-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading document...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <span className="text-3xl">📄</span>
            </div>
            <p className="text-sm font-medium mb-1">Preview unavailable</p>
            <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
          </div>
        )}

        {!loading && !error && numPages > 0 && Array.from({ length: numPages }, (_, i) => (
          <div
            key={i}
            className="flex justify-center"
            onMouseEnter={() => setCurrentPage(i + 1)}
          >
            <canvas
              ref={el => { canvasRefs.current[i] = el; }}
              className="rounded-lg shadow-lg border border-border max-w-full"
              style={{ background: '#fff' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
