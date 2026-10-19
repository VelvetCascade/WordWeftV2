import React, { useEffect, useRef, useState } from 'react';

/**
 * AdUnit — Renders a Google AdSense ad on content-rich pages only.
 *
 * The AdSense script is loaded lazily the first time an AdUnit mounts,
 * rather than globally in index.html. This ensures ads never appear on
 * blank, auth, or thin pages — which would violate AdSense policy.
 *
 * Usage:
 *   <AdUnit format="horizontal" />   — full-width banner (between sections)
 *   <AdUnit format="article" />      — in-article ad (inside content flow)
 *   <AdUnit format="rectangle" />    — sidebar / square ad
 */

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

const PUBLISHER_ID = 'ca-pub-2048279980945962';
const loadAdsenseScript = (): HTMLScriptElement => {
  const existing = document.querySelector<HTMLScriptElement>('script[src*="adsbygoogle"]');
  if (existing) return existing;
  const script = document.createElement('script');
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.addEventListener('error', () => { script.dataset.wwFailed = 'true'; });
  document.head.appendChild(script);
  return script;
};

interface AdUnitProps {
  /** Ad layout format */
  format?: 'horizontal' | 'article' | 'rectangle';
  /** Optional custom class name for the wrapper */
  className?: string;
}

const AdUnit: React.FC<AdUnitProps> = ({ format = 'horizontal', className = '' }) => {
  const adRef = useRef<HTMLModElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const pushed = useRef(false);
  const [loadState, setLoadState] = useState<'pending' | 'filled' | 'empty'>('pending');

  useEffect(() => {
    const script = loadAdsenseScript();
    const ad = adRef.current;
    let empty = false;
    const settleGeometry = () => {
      const slot = slotRef.current;
      // Changes below the viewport cannot move current content or scroll anchors.
      // Above-viewport collapses can still change scrollY, so retain those too.
      if (slot && slot.getBoundingClientRect().top >= window.innerHeight) setCollapsed(empty);
    };
    const markEmpty = () => {
      if (ad?.getAttribute('data-ad-status') === 'filled') return;
      empty = true; setLoadState('empty'); settleGeometry();
    };
    const updateLoadState = () => {
      const status = ad?.getAttribute('data-ad-status');
      if (status === 'filled') { empty = false; setLoadState('filled'); settleGeometry(); }
      if (status === 'unfilled') markEmpty();
    };
    const observer = ad ? new MutationObserver(updateLoadState) : null;
    if (ad && observer) observer.observe(ad, { attributes: true, attributeFilter: ['data-ad-status'] });

    script.addEventListener('error', markEmpty);
    if (script.dataset.wwFailed === 'true') markEmpty();
    updateLoadState();
    window.addEventListener('scroll', settleGeometry, { passive: true });
    window.addEventListener('resize', settleGeometry);

    // Small delay to ensure the script has loaded before pushing.
    const timer = setTimeout(() => {
      if (ad && !pushed.current) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushed.current = true;
        } catch (e) {
          // AdSense may throw if ad already pushed or blocked by adblocker
        }
      }
    }, 300);

    // Networks/ad blockers may never report a status. Mark unavailable now,
    // but defer geometry changes until the slot is safely below the viewport.
    const emptyFallback = window.setTimeout(markEmpty, 7000);

    return () => {
      clearTimeout(timer);
      window.clearTimeout(emptyFallback);
      observer?.disconnect();
      script.removeEventListener('error', markEmpty);
      window.removeEventListener('scroll', settleGeometry);
      window.removeEventListener('resize', settleGeometry);
    };
  }, []);

  // Format-specific styles
  const formatConfig: Record<string, { dataAdFormat: string; style: React.CSSProperties }> = {
    horizontal: {
      dataAdFormat: 'auto',
      style: { display: 'block', width: '100%', minHeight: '90px' },
    },
    article: {
      dataAdFormat: 'fluid',
      style: { display: 'block', width: '100%', minHeight: '250px' },
    },
    rectangle: {
      dataAdFormat: 'auto',
      style: { display: 'block', width: '100%', maxWidth: '336px', minHeight: '280px', margin: '0 auto' },
    },
  };

  const config = formatConfig[format] || formatConfig.horizontal;

  return (
    <div
      ref={slotRef}
      className={`ww-ad-unit ${className}`}
      data-collapsed={collapsed}
      data-load-state={loadState}
      aria-hidden={loadState === 'empty' || collapsed}
      inert={collapsed ? true : undefined}
      style={{
        margin: '32px auto',
        maxWidth: '1100px',
        padding: '0 16px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'rgba(141, 110, 99, 0.03)',
          border: '1px solid rgba(141, 110, 99, 0.06)',
          borderRadius: '12px',
          padding: '12px',
          position: 'relative',
        }}
      >
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={config.style}
          data-ad-client={PUBLISHER_ID}
          data-ad-format={config.dataAdFormat}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};

export default AdUnit;
