import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; onReset?: () => void }>;
}

function isChunkLoadError(error?: Error): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('loading chunk') ||
    msg.includes('dynamically imported module') ||
    msg.includes('failed to fetch') ||
    msg.includes('error loading dynamically imported module')
  );
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo): void {
    // Reset any pending navigation indicator so it does not stay frozen
    const navBar = document.querySelector('[role="status"][aria-label="Loading page"]');
    if (navBar) {
      navBar.remove();
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultFallback: React.FC<{
  error?: Error;
  onReset?: () => void;
}> = ({ error, onReset }) => {
  const isChunkError = isChunkLoadError(error);

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
        {isChunkError ? 'Update Available' : 'Something went wrong'}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {isChunkError
          ? 'A newer version of the application is available. Please reload the page to continue.'
          : error?.message || 'An unexpected error occurred while loading this view.'}
      </p>
      <Button
        onClick={onReset || (() => window.location.reload())}
        className="min-h-[44px] gap-2 px-6"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Reload Page</span>
      </Button>
    </div>
  );
};

export { ErrorBoundary };
