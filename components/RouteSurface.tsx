import React, { useEffect, useRef, useState } from 'react';
import { consumeNavigationScroll, isNavigationLocked } from '../utils/navigation';
import { isPageAssetFailure, recoverPageLoad } from '../utils/pageLoadRecovery';
import { createPageErrorDetails, retainPageError, type PageErrorDetails } from '../utils/pageErrorDetails';
import { recentInteractions } from '../utils/reliabilityDiagnostics';
import '../styles/recovery.css';

/** Wait for lazy content before moving focus or restoring a catalogue position. */
export const RouteSurface: React.FC<{ children: React.ReactNode; reader?: boolean }> = ({ children, reader }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<{ x: number; y: number } | null | undefined>(undefined);
  useEffect(() => {
    // Strict Mode repeats effect setup. Keep the consumed destination across
    // that replay so a restored position cannot become a new-page scroll.
    const position = scrollRef.current === undefined
      ? (scrollRef.current = consumeNavigationScroll()) : scrollRef.current;
    if (reader) return;
    let settled = false;
    let interacted = false;
    let observer: MutationObserver | undefined;
    const preserveInteraction = () => { interacted = true; settled = true; observer?.disconnect(); };
    // Lazy content can arrive after someone has reached a notification, search or menu.
    // Keep their chosen focus and scroll position rather than moving them again.
    document.addEventListener('focusin', preserveInteraction, true);
    document.addEventListener('pointerdown', preserveInteraction, true);
    document.addEventListener('keydown', preserveInteraction, true);
    document.addEventListener('wheel', preserveInteraction, { capture: true, passive: true });
    const apply = () => {
      if (settled) return;
      if (interacted) { settled = true; return; }
      if (position) {
        if (document.documentElement.scrollHeight - window.innerHeight < position.y) return;
        window.scrollTo(position.x, position.y); settled = true; observer?.disconnect();
      } else {
        window.scrollTo(0, 0);
        const heading = ref.current?.querySelector<HTMLElement>('h1');
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); settled = true; observer?.disconnect(); }
      }
    };
    const frame = requestAnimationFrame(apply);
    observer = new MutationObserver(apply);
    if (ref.current) observer.observe(ref.current, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect();
      document.removeEventListener('focusin', preserveInteraction, true);
      document.removeEventListener('pointerdown', preserveInteraction, true);
      document.removeEventListener('keydown', preserveInteraction, true);
      document.removeEventListener('wheel', preserveInteraction, true);
    };
  }, [reader]);
  return <div ref={ref} className="v2-route-surface">{children}</div>;
};

const ErrorRecovery: React.FC<{ details: PageErrorDetails | null; assetFailure: boolean; onRetry: () => void }> = ({ details, assetFailure, onRetry }) => {
  const [copyStatus, setCopyStatus] = useState('');
  const [copying, setCopying] = useState(false);
  const reload = () => {
    if (isNavigationLocked()) {
      window.dispatchEvent(new CustomEvent('wordweft:navigation-blocked', { detail: 'Save your changes before reloading.' }));
      return;
    }
    window.location.reload();
  };
  const copyDetails = async () => {
    if (!details || copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      setCopyStatus('Error details copied.');
    } catch { setCopyStatus('Select the details below to copy them.'); }
    finally { setCopying(false); }
  };
  return <section className="v2-load-state ww-error-recovery" role="alert">
    <h1>Let’s get you back to your story.</h1>
    <p>{assetFailure ? 'The connection interrupted this screen. Reload to load the latest app.' : 'This screen could not open. Try again, or return to your stories.'}</p>
    <div className="v2-hero-actions">
      <button type="button" className="v2-button" onClick={assetFailure ? reload : onRetry}>{assetFailure ? 'Reload screen' : 'Try again'}</button>
      <a href="/category" className="v2-button secondary">Browse stories</a>
      {!assetFailure && <button type="button" className="ww-recovery-reload" onClick={reload}>Reload page</button>}
    </div>
    {details && <details className="ww-error-details"><summary>Error details</summary>
      <p>Incident {details.incidentId}. Includes the screen, app version and anonymous interaction timing. Review before sharing.</p>
      <button type="button" className="v2-button secondary" onClick={() => void copyDetails()} disabled={copying}>Copy error details</button>
      {copyStatus && <p role="status">{copyStatus}</p>}
      <pre tabIndex={0}>{JSON.stringify(details, null, 2)}</pre>
    </details>}
  </section>;
};

export class PageErrorBoundary extends React.Component<{ children: React.ReactNode; route: string; global?: boolean }, {
  failed: boolean; details: PageErrorDetails | null; assetFailure: boolean;
}> {
  state = { failed: false, details: null as PageErrorDetails | null, assetFailure: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidMount() {
    if (this.props.global) {
      window.addEventListener('wordweft:navigate', this.retry);
      window.addEventListener('popstate', this.retry);
      window.addEventListener('hashchange', this.retry);
    }
  }
  componentWillUnmount() {
    window.removeEventListener('wordweft:navigate', this.retry);
    window.removeEventListener('popstate', this.retry);
    window.removeEventListener('hashchange', this.retry);
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const details = createPageErrorDetails(error, info.componentStack || '', {
      route: this.props.global ? window.location.pathname : this.props.route,
      build: import.meta.env.WORDWEFT_BUILD_ID || 'development',
      online: navigator.onLine,
    });
    details.interactions = recentInteractions();
    console.error('WordWeft screen failed:', details);
    try { retainPageError(details, window.sessionStorage); } catch { /* Optional diagnostics only. */ }
    this.setState({ details, assetFailure: isPageAssetFailure(error) });
    recoverPageLoad(error);
  }
  componentDidUpdate(previous: Readonly<{ children: React.ReactNode; route: string }>) {
    if (previous.route !== this.props.route && this.state.failed) this.retry();
  }
  private retry = () => this.setState({ failed: false, details: null, assetFailure: false });
  render() {
    if (this.state.failed) return <ErrorRecovery details={this.state.details} assetFailure={this.state.assetFailure} onRetry={this.retry} />;
    return this.props.children;
  }
}

/** A dismissed/failed optional prompt cannot replace the reader or editor. */
export class OptionalSurfaceBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
