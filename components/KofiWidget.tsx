import React, { useEffect } from 'react';

declare global {
  interface Window {
    kofiWidgetOverlay: any;
  }
}

export const KofiWidget: React.FC = () => {
  useEffect(() => {
    // Only load the script if the widget logic isn't already available
    if (typeof window !== 'undefined' && !window.kofiWidgetOverlay) {
      const script = document.createElement('script');
      script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
      script.async = true;
      script.onload = () => {
        // Once the script is loaded, initialize the widget
        if (window.kofiWidgetOverlay) {
          window.kofiWidgetOverlay.draw('wordweftstudio', {
            'type': 'floating-chat',
            'floating-chat.donateButton.text': 'Support Us',
            'floating-chat.donateButton.background-color': '#8D6E63', // WordWeft App Accent Color
            'floating-chat.donateButton.text-color': '#fff'
          });
        }
      };
      
      // Append to body
      document.body.appendChild(script);

      return () => {
        // We generally don't remove the script on unmount for global widgets, 
        // as it might cause flickering if we remount, but React 18 strict mode fires twice.
        // The script itself defines window.kofiWidgetOverlay, so it won't crash on multiple mounts if checked.
      };
    }
  }, []);

  return null; // This component does not render any inline UI
};
