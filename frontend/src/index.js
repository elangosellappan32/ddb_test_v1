import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { testAPIConnection } from './utils/apiTest';

const root = createRoot(document.getElementById('root'));

// Make test function available globally
window.testAPI = testAPIConnection;

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);