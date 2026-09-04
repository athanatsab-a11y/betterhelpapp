import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth.jsx';
import App from './App.jsx';
import './styles.css';

// The demo build (VITE_DEMO=1) runs with no server: an in-browser mock API and
// hash routing, so the single HTML file works from any static host.
const DEMO = import.meta.env.VITE_DEMO === '1';
const Router = DEMO ? HashRouter : BrowserRouter;

async function start() {
  if (DEMO) {
    const { installMockApi } = await import('./lib/mockApi.js');
    installMockApi();
  }
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    </React.StrictMode>
  );
}

start();

// Installable app shell — skipped in the demo build, which ships as one file.
if (!DEMO && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
