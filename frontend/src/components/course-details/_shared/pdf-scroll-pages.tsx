'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Page } from 'react-pdf';

/**
 * Continuous-scroll page list.
 *
 * Every page gets a correctly-sized slot so the scrollbar reflects the whole
 * document, but only slots near the viewport actually mount a `<Page>`.
 * Mounting all of them would rasterise every page to its own canvas at once —
 * fine for a 3-page handout, ruinous for a 70-page dissertation.
 *
 * Visibility is measured from element geometry rather than IntersectionObserver
 * so the window can be computed synchronously during layout — which is what
 * makes the render window testable, and how the collapse-cascade below was
 * caught.
 *
 * Must render inside react-pdf's `<Document>` — `<Page>` reads it from context.
 */
export function PdfScrollPages({
  numPages,
  scale,
  scrollRef,
  activePage,
  onVisiblePageChange
}: {
  numPages: number;
  scale: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /// The page the toolbar is pointing at. Always rendered, even before the
  /// scroll lands — otherwise jumping to page 20 depends on a scroll event
  /// arriving to pull it into the window, and until then you stare at a gap.
  activePage: number;
  onVisiblePageChange: (page: number) => void;
}) {
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const aliveRef = useRef(true);
  const [rendered, setRendered] = useState<Set<number>>(() => new Set([1]));
  // Height of page 1, reused to size slots that haven't rendered yet so the
  // scrollbar is roughly right from the start instead of growing as you go.
  // Until it's known, slots still need *some* height: at zero they all stack
  // inside the first viewport, every one looks visible, and the whole
  // document renders at once — exactly what the windowing is here to avoid.
  const [slotHeight, setSlotHeight] = useState<number | null>(null);
  const placeholderHeight = slotHeight ?? 700;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /// `reportPage` separates the two jobs this does. Layout-driven measures
  /// only decide what to render; reporting the visible page from them would
  /// overwrite an explicit jump with wherever the scroll still happens to be,
  /// snapping the page box back the moment you type into it.
  const measure = useCallback(
    (reportPage: boolean) => {
    if (!aliveRef.current) return;
    const root = scrollRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    // Keep one viewport of pages ready either side of what's on screen.
    const buffer = rootRect.height;
    const mid = rootRect.top + rootRect.height / 2;

    const next = new Set<number>();
    let current = 1;
    let currentFound = false;

    slotRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom > rootRect.top - buffer && r.top < rootRect.bottom + buffer) {
        next.add(i + 1);
      }
      if (!currentFound && r.bottom > mid) {
        current = i + 1;
        currentFound = true;
      }
    });

    setRendered((prev) => {
      // Only grow — un-rendering a page the user just scrolled past makes
      // scrolling back up flash blank.
      let changed = false;
      for (const n of next) {
        if (!prev.has(n)) {
          changed = true;
          break;
        }
      }
      if (!changed) return prev;
      const merged = new Set(prev);
      for (const n of next) merged.add(n);
      return merged;
    });
    if (reportPage && aliveRef.current) onVisiblePageChange(current);
    },
    [scrollRef, onVisiblePageChange]
  );

  // Measure after every layout change — mount, zoom, and each page that
  // finishes rendering (which shifts everything below it).
  useLayoutEffect(() => {
    measure(false);
  }, [measure, numPages, scale, placeholderHeight, rendered, activePage]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    // Timestamp throttle rather than requestAnimationFrame: rAF is tied to
    // the compositor and stops in contexts that aren't painting, which would
    // strand the reader mid-document with nothing rendering.
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      last = Date.now();
      measure(true);
    };
    const onScroll = () => {
      const since = Date.now() - last;
      if (since >= 100) {
        run();
        return;
      }
      // Always schedule a trailing call so the last scroll position counts.
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 100 - since);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (timer) clearTimeout(timer);
      root.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [measure, scrollRef]);

  return (
    <div className='flex flex-col items-center gap-4'>
      {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          data-page={n}
          ref={(el) => {
            slotRefs.current[n - 1] = el;
          }}
          /// minHeight on *every* slot, not just unrendered ones: a `<Page>`
          /// that has mounted but not yet painted is zero-tall, so the pages
          /// below collapse upward into the window, mount, and collapse the
          /// next batch — the whole document ends up rendering. Reserving the
          /// space keeps geometry stable while canvases paint, and a page
          /// taller than the estimate still grows past it.
          style={{ minHeight: placeholderHeight }}
          className='flex w-full justify-center'
        >
          {rendered.has(n) || n === activePage ? (
            <Page
              pageNumber={n}
              scale={scale}
              onLoadSuccess={
                n === 1
                  ? ({ height }: { height: number }) => {
                      if (aliveRef.current) setSlotHeight(height);
                    }
                  : undefined
              }
            />
          ) : (
            <div className='w-full max-w-[600px] rounded border border-dashed bg-background/40' />
          )}
        </div>
      ))}
    </div>
  );
}
