import './index.css';
import './lib/leaflet-setup';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import { GenesisRoot } from './lib/genesis.jsx';
import { setupThemeBridge } from './lib/theme-bridge';
import { OneDriveAuthCallback } from './components/OneDriveAuthCallback';

setupThemeBridge();

// Handle the Microsoft OAuth redirect at /auth/onedrive
const isOneDriveCallback = window.location.pathname === '/auth/onedrive';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isOneDriveCallback ? (
      <OneDriveAuthCallback />
    ) : (
      <GenesisRoot>
        <App />
      </GenesisRoot>
    )}
  </StrictMode>,
);
