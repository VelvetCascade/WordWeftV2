import React, { useEffect, useRef } from 'react';
import { consumeNavigationScroll } from '../utils/navigation';

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
    const apply = () => {
      if (settled) return;
      if (position) {
        if (document.documentElement.scrollHeight - window.innerHeight < position.y) return;
        window.scrollTo(position.x, position.y); settled = true;
      } else {
        window.scrollTo(0, 0);
        const heading = ref.current?.querySelector<HTMLElement>('h1');
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); settled = true; }
      }
    };
    const frame = requestAnimationFrame(apply);
    const observer = new MutationObserver(apply);
    if (ref.current) observer.observe(ref.current, { childList: true, subtree: true });
    const timer = window.setTimeout(() => { if (position && !settled) window.scrollTo(position.x, position.y); observer.disconnect(); }, 3000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); observer.disconnect(); };
  }, [reader]);
  return <div ref={ref} className="v2-route-surface">{children}</div>;
};

export class PageErrorBoundary extends React.Component<{ children: React.ReactNode; route: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: Readonly<{ children: React.ReactNode; route: string }>) {
    if (previous.route !== this.props.route && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) return <section className="v2-load-state" role="alert" style={{ maxWidth: 640, margin: '60px auto' }}><h1>Let’s get you back to your story.</h1><p>This screen could not open. Reload to try again, or return to the library.</p><div className="v2-hero-actions"><button className="v2-button" onClick={() => window.location.reload()}>Reload screen</button><a href="/category" className="v2-button secondary">Browse stories</a></div></section>;
    return this.props.children;
  }
}
