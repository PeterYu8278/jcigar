// Service Worker for Gentleman Club PWA
const CACHE_NAME = 'gentleman-club-v1.0.0';
const STATIC_CACHE = 'gentleman-club-static-v1';
const DYNAMIC_CACHE = 'gentleman-club-dynamic-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  // 添加常用的图标
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 需要缓存的API路径模式
const API_CACHE_PATTERNS = [
  /^https:\/\/api\./,
  /^https:\/\/firestore\.googleapis\.com/,
  /^https:\/\/firebase\.googleapis\.com/
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// 拦截网络请求 - 实现缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过chrome-extension和firebase内部请求
  if (url.protocol === 'chrome-extension:' || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    handleRequest(request)
  );
});

// 处理请求的缓存策略
async function handleRequest(request) {
  const url = new URL(request.url);

  try {
    // 1. 静态资源 - Cache First策略
    if (isStaticAsset(request)) {
      return await cacheFirst(request, STATIC_CACHE);
    }

    // 2. API请求 - Network First策略
    if (isApiRequest(request)) {
      return await networkFirst(request, DYNAMIC_CACHE);
    }

    // 3. 页面请求 - Stale While Revalidate策略
    if (isPageRequest(request)) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE);
    }

    // 4. 其他请求 - Network First
    return await networkFirst(request, DYNAMIC_CACHE);

  } catch (error) {
    console.error('[SW] Request handling error:', error);
    
    // 如果是页面请求且网络失败，返回离线页面
    if (isPageRequest(request)) {
      const cache = await caches.open(STATIC_CACHE);
      const offlinePage = await cache.match('/');
      return offlinePage || new Response('Offline', { status: 503 });
    }

    // 其他情况返回网络错误
    return new Response('Network error', { status: 503 });
  }
}

// 判断是否为静态资源
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// 判断是否为API请求
function isApiRequest(request) {
  const url = new URL(request.url);
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.href)) ||
         url.pathname.startsWith('/api/') ||
         url.pathname.startsWith('/firestore/');
}

// 判断是否为页面请求
function isPageRequest(request) {
  return request.destination === 'document' || 
         request.headers.get('accept')?.includes('text/html');
}

// Cache First策略 - 优先使用缓存
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed:', error);
    throw error;
  }
}

// Network First策略 - 优先使用网络
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale While Revalidate策略 - 返回缓存并更新
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// 监听推送通知
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  const options = {
    body: event.data ? event.data.text() : 'Gentleman Club 新消息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/icons/action-explore.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icons/action-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Gentleman Club', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event);

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // 关闭通知
  } else {
    // 默认行为 - 打开应用
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 监听消息
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 后台同步
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // 实现后台同步逻辑
  console.log('[SW] Performing background sync...');
}
