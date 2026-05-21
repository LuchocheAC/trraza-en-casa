import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// In production, VITE_API_URL points to the Render backend (e.g. https://pos-villanueva-backend.onrender.com).
// In dev, it's empty and Vite's proxy handles /api/* → localhost:3001.
const API_BASE = import.meta.env.VITE_API_URL ?? '';

const _fetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  const rawUrl = typeof input === 'string' ? input : input?.url ?? '';
  const isApiCall = rawUrl.startsWith('/api/');

  // Rewrite relative /api/ paths to absolute URL when API_BASE is set
  const resolvedInput = (isApiCall && API_BASE)
    ? (typeof input === 'string' ? `${API_BASE}${rawUrl}` : input)
    : input;

  const token = localStorage.getItem('pos_token');
  if (token && isApiCall) {
    init = { ...(init ?? {}), headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } };
  }

  return _fetch(resolvedInput, init).then(res => {
    if (res.status === 401 && isApiCall && !rawUrl.includes('/api/auth/login')) {
      localStorage.removeItem('pos_token');
      window.location.replace('/login');
    }
    return res;
  });
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
