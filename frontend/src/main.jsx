import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Inject Authorization header into every /api/* fetch automatically
const _fetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  const url = typeof input === 'string' ? input : input?.url ?? '';
  const token = localStorage.getItem('pos_token');
  if (token && url.startsWith('/api/')) {
    init = { ...(init ?? {}), headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } };
  }
  return _fetch(input, init).then(res => {
    if (res.status === 401 && url.startsWith('/api/') && !url.includes('/api/auth/login')) {
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
