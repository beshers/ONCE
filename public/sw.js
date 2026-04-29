// Service Worker for OCNE PWA Offline Support
const CACHE_NAME = 'ocne-v2';
const OFFLINE_URLS = [
  '/',
  '/chat',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls - let them go to network
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline', offline: true }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version
        return cachedResponse;
      }

      // Fetch from network and cache the result
      return fetch(event.request).then((networkResponse) => {
        // Cache valid responses
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-projects') {
    event.waitUntil(syncProjects());
  }
  if (event.tag === 'sync-snippets') {
    event.waitUntil(syncSnippets());
  }
});

async function syncProjects() {
  // Sync offline projects when back online
  const db = await openDB();
  const projects = await db.getAll('pending-projects');
  
  for (const project of projects) {
    try {
      await fetch('/api/project', {
        method: 'POST',
        body: JSON.stringify(project),
        headers: { 'Content-Type': 'application/json' }
      });
      await db.delete('pending-projects', project.id);
    } catch (e) {
      console.error('Failed to sync project:', e);
    }
  }
}

async function syncSnippets() {
  // Sync offline snippets when back online
  const db = await openDB();
  const snippets = await db.getAll('pending-snippets');
  
  for (const snippet of snippets) {
    try {
      await fetch('/api/snippet', {
        method: 'POST',
        body: JSON.stringify(snippet),
        headers: { 'Content-Type': 'application/json' }
      });
      await db.delete('pending-snippets', snippet.id);
    } catch (e) {
      console.error('Failed to sync snippet:', e);
    }
  }
}

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ocne-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve({
      getAll: (store) => new Promise((resolve, reject) => {
        const tx = request.result.transaction(store, 'readonly');
        const objectStore = tx.objectStore(store);
        const req = objectStore.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
      delete: (store, id) => new Promise((resolve, reject) => {
        const tx = request.result.transaction(store, 'readwrite');
        const objectStore = tx.objectStore(store);
        const req = objectStore.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
    });
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-projects')) {
        db.createObjectStore('pending-projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending-snippets')) {
        db.createObjectStore('pending-snippets', { keyPath: 'id' });
      }
    };
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'New notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1,
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' },
    ],
  };
  event.waitUntil(self.registration.showNotification(data.title || 'OCNE', options));
});
