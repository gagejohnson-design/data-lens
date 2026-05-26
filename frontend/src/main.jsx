import React from 'react';
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SnapshotProvider>
          <App />
        </SnapshotProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
