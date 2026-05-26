import React from 'react';
// Apply saved theme before first render to prevent flash
document.documentElement.setAttribute('data-theme', localStorage.getItem('datalens_theme') || 'dark');
import './global.css';
import './auth.css';
import './nav.css';
import './hub.css';
import './explorer.css';
import './shared.css';
import './settings.css';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SnapshotProvider } from './context/SnapshotContext';
import { ToastProvider } from './context/ToastContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SnapshotProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </SnapshotProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
