import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { ThemeProvider } from "@/providers/ThemeProvider"
import App from './App.tsx'

// Keep reloads honest. Older OCNE service workers cached app shells aggressively,
// which could leave users stuck on stale bundles after a deploy. A service worker
// can keep controlling the current page until the next navigation, so reload once
// after cleanup and guard it with sessionStorage to avoid loops.
const CACHE_CLEANUP_RELOAD_KEY = 'ocne-cache-cleanup-reloaded';

async function clearLegacyBrowserCaches() {
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

  return cleaned;
}

if ('serviceWorker' in navigator || 'caches' in window) {
  window.addEventListener('load', () => {
    clearLegacyBrowserCaches()
      .then((cleaned) => {
        if (!cleaned || sessionStorage.getItem(CACHE_CLEANUP_RELOAD_KEY) === 'true') return;
        sessionStorage.setItem(CACHE_CLEANUP_RELOAD_KEY, 'true');
        window.location.reload();
      })
      .catch(() => undefined);
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
