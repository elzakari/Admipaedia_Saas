import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './app/App'; // Correct path within the src directory
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline capabilities
serviceWorkerRegistration.register();

reportWebVitals();