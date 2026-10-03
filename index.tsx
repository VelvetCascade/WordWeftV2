
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/design-system.css';
import './styles/discovery-v2.css';
import './styles/app-layout.css';
import { installNavigation, isNavigationLocked } from './utils/navigation';
import { installPageLoadRecovery } from './utils/pageLoadRecovery';
installNavigation();
installPageLoadRecovery(isNavigationLocked);
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

ReactDOM.createRoot(rootElement).render(appContent);
