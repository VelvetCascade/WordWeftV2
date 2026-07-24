import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSenseBannerProps {
  client?: string;
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  client = 'ca-pub-2048279980945962', // WordWeft AdSense Client ID
  slot,
  format = 'auto',
  responsive = true,
  className = '',
  style,
  label = 'ADVERTISEMENT',
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    // Only push ad if it hasn't been pushed for this mount instance
    if (pushedRef.current) return;

    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushedRef.current = true;
      }
    } catch (err) {
      console.warn('AdSense push error (may be blocked by adblocker or pending approval):', err);
    }
  }, []);

  return (
    <div
      className={`my-6 flex flex-col items-center justify-center w-full overflow-hidden ${className}`}
      aria-label="Advertisement Section"
    >
      {/* Policy-compliant label */}
      <span className="text-[10px] font-sans font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-1.5">
        {label}
      </span>

      <div
        ref={adRef}
        className="w-full max-w-4xl flex items-center justify-center min-h-[90px] rounded-xl bg-gray-50/50 dark:bg-dark-surface-alt/30 border border-gray-100 dark:border-dark-border/40 p-2"
        style={style}
      >
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', textAlign: 'center', minHeight: '90px', ...style }}
          data-ad-client={client}
          {...(slot ? { 'data-ad-slot': slot } : {})}
          data-ad-format={format}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      </div>
    </div>
  );
};
