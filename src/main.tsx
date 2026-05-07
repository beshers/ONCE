import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { ThemeProvider } from "@/providers/ThemeProvider"
import App from './App.tsx'

const CACHE_CLEANUP_DONE_KEY = 'ocne-cache-cleanup-v2';

async function clearLegacyBrowserCaches() {
  if (localStorage.getItem(CACHE_CLEANUP_DONE_KEY) === 'true') return false;
  let cleaned = false;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length > 0) {
      await Promise.all(registrations.map((registration) => registration.unregister()));
      cleaned = true;
    }
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => caches.delete(key)));
      cleaned = true;
    }
  }

  localStorage.setItem(CACHE_CLEANUP_DONE_KEY, 'true');
  return cleaned;
}

if ('serviceWorker' in navigator || 'caches' in window) {
  window.addEventListener('load', () => {
    const cleanup = () => clearLegacyBrowserCaches().catch(() => undefined);
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(cleanup, { timeout: 5000 });
    } else {
      globalThis.setTimeout(cleanup, 2500);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
