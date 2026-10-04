
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/design-system.css';
import './styles/discovery-v2.css';
import './styles/app-layout.css';
import './styles/interaction-polish.css';
import { installNavigation, isNavigationLocked } from './utils/navigation';
import { installPageLoadRecovery } from './utils/pageLoadRecovery';
import { PageErrorBoundary } from './components/RouteSurface';
import { installReliabilityDiagnostics } from './utils/reliabilityDiagnostics';
installNavigation();
installPageLoadRecovery(isNavigationLocked);
installReliabilityDiagnostics();
import { ThemeProvider } from './contexts/ThemeContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const appContent = (
  <React.StrictMode>
    <PageErrorBoundary route="application" global><ThemeProvider>
      <App />
    </ThemeProvider></PageErrorBoundary>
  </React.StrictMode>
);

ReactDOM.createRoot(rootElement).render(appContent);
