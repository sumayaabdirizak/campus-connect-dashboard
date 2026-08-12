/** Max chars sent to the AI generate endpoint (matches backend Joi). */
export const AI_SOURCE_MAX_CHARS = 30_000;

/** Max upload size for source files (10 MB). */
export const AI_SOURCE_MAX_BYTES = 10 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.json',
  '.html',
  '.htm',
  '.rtf'
]);

export const AI_SOURCE_ACCEPT =
  '.pdf,.txt,.md,.markdown,.csv,.docx,application/pdf,text/plain,text/markdown,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

async function readPlainText(file: File): Promise<string> {
  return file.text();
}

async function extractPdfText(file: File): Promise<string> {
  const { pdfjs } = await import('react-pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const chunks: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) chunks.push(pageText);
  }

  return chunks.join('\n\n');
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Extract readable text from a teacher-uploaded source file for AI grounding.
 * Supports PDF, DOCX, and common plain-text formats.
 */
export async function extractSourceTextFromFile(file: File): Promise<string> {
  if (file.size > AI_SOURCE_MAX_BYTES) {
    throw new Error(`File is too large (max ${AI_SOURCE_MAX_BYTES / (1024 * 1024)} MB)`);
  }

  const ext = extensionOf(file.name);

  if (ext === '.pdf' || file.type === 'application/pdf') {
    return extractPdfText(file);
  }

  if (
    ext === '.docx' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractDocxText(file);
  }

  if (TEXT_EXTENSIONS.has(ext) || file.type.startsWith('text/')) {
    return readPlainText(file);
  }

  throw new Error(
    'Unsupported file type. Use PDF, DOCX, or a plain-text file (.txt, .md, .csv).'
  );
}

export function clampSourceMaterial(text: string, max = AI_SOURCE_MAX_CHARS): string {
  if (text.length <= max) return text;
  return text.slice(0, max);
}
