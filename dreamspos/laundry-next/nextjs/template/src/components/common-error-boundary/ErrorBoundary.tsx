"use client";
import React from 'react';
import { reportError } from '../../utils/errorReporter';
import { base_path } from '../../environment';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    // Report error (console + localStorage buffer + extension hook)
    reportError(error, { componentStack: errorInfo?.componentStack, source: 'react.errorBoundary' });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.assign(base_path || '/');
  };

  handleClearAppData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  handleCopyDetails = async () => {
    const details = [
      this.state.error?.toString() ?? '',
      this.state.error?.stack ?? '',
      this.state.errorInfo?.componentStack ?? '',
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
      `UA: ${navigator.userAgent}`,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(details);
      console.info('Error details copied to clipboard');
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          style={{ padding: 32, textAlign: 'center' }}
          role="alert"
          aria-live="assertive"
          aria-label="Error occurred"
        >
          <h2 id="error-title">Something went wrong.</h2>
          <p id="error-description">We're sorry for the inconvenience. Please try reloading the page.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', margin: '16px 0' }}>
            <button 
              onClick={this.handleReload} 
              className='btn btn-primary btn-sm' 
              style={{ padding: '8px 16px', fontSize: 14 }}
              aria-label="Reload the page to fix the error"
            >
              Reload
            </button>
            <button 
              onClick={this.handleGoHome} 
              className='btn btn-outline-secondary btn-sm' 
              style={{ padding: '8px 16px', fontSize: 14 }}
              aria-label="Go to home"
            >
              Go Home
            </button>
            <button 
              onClick={this.handleClearAppData} 
              className='btn btn-outline-danger btn-sm' 
              style={{ padding: '8px 16px', fontSize: 14 }}
              aria-label="Clear app data"
            >
              Clear App Data
            </button>
            <button 
              onClick={this.handleCopyDetails} 
              className='btn btn-outline-dark btn-sm' 
              style={{ padding: '8px 16px', fontSize: 14 }}
              aria-label="Copy error details"
            >
              Copy Details
            </button>
          </div>
          <div style={{ marginTop: 16, color: '#888' }}>
            <p>If the problem persists, please contact support.</p>
          </div>
          <details style={{ marginTop: 24, textAlign: 'left', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            <summary aria-describedby="error-details">Show error details</summary>
            <pre 
              id="error-details"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} 
              aria-label="Error details"
              aria-describedby="error-title"
            >
              {this.state.error && this.state.error.toString()}
              {'\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary; 