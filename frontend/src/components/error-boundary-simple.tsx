"use client";

import { Component, ReactNode } from "react";

interface SimpleErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface SimpleErrorBoundaryState {
  hasError: boolean;
}

/**
 * Simple error boundary for use in client components.
 * Use this when you need basic error catching without full logging.
 */
export class SimpleErrorBoundary extends Component<
  SimpleErrorBoundaryProps,
  SimpleErrorBoundaryState
> {
  constructor(props: SimpleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SimpleErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            Something went wrong. Please refresh the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
