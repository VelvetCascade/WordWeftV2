import React, { useEffect, useRef } from 'react';

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
let adsenseScriptLoaded = false;

const loadAdsenseScript = (): void => {
  if (adsenseScriptLoaded) return;
  if (document.querySelector(`script[src*="adsbygoogle"]`)) {
    adsenseScriptLoaded = true;
    return;
  }
  const script = document.createElement('script');
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
  adsenseScriptLoaded = true;
};

interface AdUnitProps {
  /** Ad layout format */
  format?: 'horizontal' | 'article' | 'rectangle';
  /** Optional custom class name for the wrapper */
  className?: string;
}

const AdUnit: React.FC<AdUnitProps> = ({ format = 'horizontal', className = '' }) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    loadAdsenseScript();

    // Small delay to ensure the script has loaded before pushing
    const timer = setTimeout(() => {
      if (adRef.current && !pushed.current) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushed.current = true;
        } catch (e) {
          // AdSense may throw if ad already pushed or blocked by adblocker
        }
      }
    }, 300);

    return () => clearTimeout(timer);
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
      className={`ww-ad-unit ${className}`}
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
