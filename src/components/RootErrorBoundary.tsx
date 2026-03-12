import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface RootErrorBoundaryProps {
  children: ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Runtime render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center space-y-3">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected runtime error.
            </p>
            {this.state.message ? (
              <p className="text-xs text-muted-foreground break-words">{this.state.message}</p>
            ) : null}
            <Button onClick={() => window.location.reload()} className="w-full" variant="default">
              Reload app
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
