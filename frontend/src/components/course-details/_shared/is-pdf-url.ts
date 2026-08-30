/**
 * A string check, deliberately in its own module.
 *
 * It used to live in `pdf-viewer.tsx`, so importing it to decide *whether*
 * something is a PDF pulled in react-pdf and the whole pdfjs engine — on any
 * page that merely asked the question. Keeping it separate lets callers test a
 * URL without loading a renderer they may never show.
 */
export function isPdfUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, 'http://x');
    return u.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return /\.pdf(\?|#|$)/i.test(url);
  }
}
