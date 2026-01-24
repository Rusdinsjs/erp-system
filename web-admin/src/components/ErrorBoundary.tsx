import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // TODO: Log to error reporting service (e.g., Sentry) in production
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="shrink-0">
                  <svg
                    className="h-12 w-12 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Oops! Terjadi Kesalahan
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Aplikasi mengalami error yang tidak terduga
                  </p>
                </div>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-mono text-red-800 mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-sm font-semibold text-red-700 cursor-pointer">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-64">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="primary"
                >
                  Coba Lagi
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="secondary"
                >
                  Muat Ulang Halaman
                </Button>
              </div>

              <div className="mt-4 text-sm text-gray-500">
                <p>
                  Jika masalah berlanjut, silakan hubungi administrator sistem.
                </p>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component untuk wrap components dengan ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
