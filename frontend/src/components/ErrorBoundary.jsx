import { Component } from "react";

/**
 * ErrorBoundary — catches any render-time crash in the tree below it and
 * shows a friendly retry screen instead of a blank page.
 *
 * Scope: wrap the whole router in main.jsx. A crash inside any screen,
 * context or layout lands here; the user can retry the subtree (remount)
 * or reload the page entirely.
 *
 * Note: event-handler and async errors don't reach a boundary — those are
 * handled at their call sites (screens show inline error states).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep a console trace for debugging; replace with a real reporter
    // (e.g. Sentry) if this app ever ships to production.
    console.error("GoldenWay crashed:", error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell min-h-dvh flex flex-col items-center justify-center px-8 text-center">
          <span className="text-4xl mb-3" aria-hidden="true">🚌</span>
          <h1 className="font-display text-xl font-bold text-ink-900">
            Something went off route
          </h1>
          <p className="mt-2 text-[13px] text-slate-500 leading-relaxed max-w-[300px]">
            An unexpected error interrupted the app. Your data is safe — try
            again, or reload if it keeps happening.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-6 w-full max-w-[280px] rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 py-3.5 font-display font-semibold text-ink-900 text-[14px] shadow-[0_10px_24px_-10px_rgba(240,180,41,0.8)]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 text-[13px] font-semibold text-gold-600"
          >
            Reload GoldenWay
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
