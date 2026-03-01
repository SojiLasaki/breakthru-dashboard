const MAX_CONTEXT_CHARS = 12000;
const MAX_PDF_PAGES = 12;

export interface ExtractedDocument {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  text: string;
  warning?: string;
}

export type KnowledgeDocumentSourceType = 'text' | 'url' | 'file' | 'manual' | 'other';

export interface KnowledgeDocumentIngestionInput {
  clientRef: string;
  sourceType: KnowledgeDocumentSourceType;
  title: string;
  content: string;
  sourceUri?: string;
  metadata?: Record<string, unknown>;
}

export interface SkippedKnowledgeDocumentIngestion {
  clientRef: string;
  label: string;
  reason: string;
}

export interface KnowledgeDocumentIngestionPlan {
  items: KnowledgeDocumentIngestionInput[];
  skipped: SkippedKnowledgeDocumentIngestion[];
  totalCandidates: number;
}

const truncate = (text: string): { text: string; warning?: string } => {
  if (text.length <= MAX_CONTEXT_CHARS) return { text };
  return {
    text: `${text.slice(0, MAX_CONTEXT_CHARS)}\n\n[Truncated due to size]`,
    warning: 'Large file truncated before adding to context.',
  };
};

const extractPdfText = async (file: File): Promise<{ text: string; warning?: string }> => {
  try {
    const pdfjsLib: any = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

    const raw = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: raw });
    const pdf = await loadingTask.promise;
    const pageCount = Math.min(pdf.numPages || 0, MAX_PDF_PAGES);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const joined = textContent.items
        .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
        .filter(Boolean)
        .join(' ');
      pages.push(joined);
    }

    const merged = pages.join('\n\n');
    const truncated = truncate(merged);
    if ((pdf.numPages || 0) > MAX_PDF_PAGES) {
      const extraWarning = `Only the first ${MAX_PDF_PAGES} pages were extracted.`;
      return {
        text: truncated.text,
        warning: [truncated.warning, extraWarning].filter(Boolean).join(' '),
      };
    }
    return truncated;
  } catch {
    return {
      text: '',
      warning: 'Unable to extract text from PDF. File is attached as metadata only.',
    };
  }
};

const extractTextByType = async (file: File): Promise<{ text: string; warning?: string }> => {
  const type = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (type.includes('pdf') || ext === 'pdf') {
    return extractPdfText(file);
  }

  if (
    type.startsWith('text/') ||
    ['txt', 'md', 'markdown', 'json', 'csv'].includes(ext)
  ) {
    const raw = await file.text();
    if (ext === 'json' || type.includes('json')) {
      try {
        const parsed = JSON.parse(raw);
        return truncate(JSON.stringify(parsed, null, 2));
      } catch {
        return {
          ...truncate(raw),
          warning: 'JSON had parse issues, using raw text.',
        };
      }
    }
    return truncate(raw);
  }

  return {
    text: '',
    warning: 'Unsupported file type for text extraction. Supported: txt, md, json, csv, pdf.',
  };
};

export const extractDocumentContext = async (file: File): Promise<ExtractedDocument> => {
  const extracted = await extractTextByType(file);
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    text: extracted.text,
    warning: extracted.warning,
  };
};

const normalizeAbsoluteUrl = (value: string): string | null => {
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
};

const buildUrlTitle = (urlValue: string): string => {
  try {
    const parsed = new URL(urlValue);
    const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
    return `${parsed.hostname}${path}`.slice(0, 255);
  } catch {
    return urlValue.slice(0, 255);
  }
};

export const buildKnowledgeDocumentIngestionPlan = (
  documents: ExtractedDocument[],
  urls: string[]
): KnowledgeDocumentIngestionPlan => {
  const items: KnowledgeDocumentIngestionInput[] = [];
  const skipped: SkippedKnowledgeDocumentIngestion[] = [];

  for (const doc of documents) {
    const content = (doc.text || '').trim();
    if (!content) {
      skipped.push({
        clientRef: doc.id,
        label: doc.name || 'Uploaded document',
        reason: 'No extracted text available to ingest.',
      });
      continue;
    }

    items.push({
      clientRef: doc.id,
      sourceType: 'file',
      title: (doc.name || 'Uploaded document').slice(0, 255),
      content,
      metadata: {
        ingestion_source: 'ask_ai_upload',
        original_document_id: doc.id,
        file_name: doc.name,
        mime_type: doc.mimeType,
        size_bytes: doc.size,
        warning: doc.warning || null,
      },
    });
  }

  const seenUrls = new Set<string>();
  for (const rawUrl of urls) {
    const normalized = normalizeAbsoluteUrl(rawUrl.trim());
    const clientRef = `url:${rawUrl}`;
    if (!normalized) {
      skipped.push({
        clientRef,
        label: rawUrl,
        reason: 'URL is invalid or not absolute.',
      });
      continue;
    }
    if (seenUrls.has(normalized)) continue;
    seenUrls.add(normalized);

    items.push({
      clientRef: `url:${normalized}`,
      sourceType: 'url',
      title: buildUrlTitle(normalized),
      sourceUri: normalized,
      content: '',
      metadata: {
        ingestion_source: 'ask_ai_url',
        url: normalized,
      },
    });
  }

  return {
    items,
    skipped,
    totalCandidates: documents.length + urls.length,
  };
};
