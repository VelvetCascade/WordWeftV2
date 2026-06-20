
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const appContent = (
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// react-snap pre-fills #root with server-rendered HTML before React hydrates.
// In dev/non-prerendered mode the root is empty → use createRoot (normal SPA).
// In production after prerender → #root has children → use hydrateRoot to attach
// React to the existing DOM without replacing it (prevents content flash).
if (rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootElement, appContent);
} else {
  ReactDOM.createRoot(rootElement).render(appContent);
}
