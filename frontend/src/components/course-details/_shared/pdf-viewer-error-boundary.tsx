'use client';

import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Called when a PDF render/load error is caught so the host can close cleanly. */
  onError?: () => void;
};

type State = { failed: boolean };

/**
 * react-pdf / pdf.js can throw during teardown (blob revoke, worker abort,
 * canvas detach). Without a boundary those errors hit the dashboard route
 * error UI when leaving the full-screen Resources preview.
 */
export class PdfViewerErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[pdf-viewer] suppressed render error:', error.message);
    this.props.onError?.();
  }

  componentDidUpdate(prevProps: Props) {
    // New children (new URL / re-open) clear a previous failure.
    if (prevProps.children !== this.props.children && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <p className='p-4 text-sm text-destructive'>
          Could not keep this PDF open. Close and try again.
        </p>
      );
    }
    return this.props.children;
  }
}
