import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { HeaderProvider } from './contexts/HeaderContext';
import App from './app/App';
import './index.css';
import './i18n'; // Import i18n configuration
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// Import enhanced query client
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient, cacheUtils } from './lib/queryClient';
import { TouchGestureProvider } from './contexts/TouchGestureContext';

// Prefetch critical data on app start
cacheUtils.prefetchDashboardData();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ThemeProvider>
          <TouchGestureProvider>
            <AuthProvider>
              <SocketProvider>
                <HeaderProvider>
                  <App />
                </HeaderProvider>
              </SocketProvider>
            </AuthProvider>
          </TouchGestureProvider>
        </ThemeProvider>
      </BrowserRouter>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
);

// Register service worker for offline capabilities
// serviceWorkerRegistration.register();

// Explicitly unregister for development to avoid cache conflicts
if (process.env.NODE_ENV === 'development') {
  serviceWorkerRegistration.unregister();

  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => undefined);
  }
}

reportWebVitals();
