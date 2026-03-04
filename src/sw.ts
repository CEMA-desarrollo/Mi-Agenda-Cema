/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

// Precache todos los recursos de vite
import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST || []);

// Escuchar mensaje SKIP_WAITING proveniente del ReloadPrompt.tsx para forzar actualización
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Escuchar el evento Push que viene de nuestro servidor local o externo
self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {
        title: 'Nueva Cita',
        body: 'Se ha agendado un nuevo paciente en tu calendario.'
    };

    const options = {
        body: data.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Cuando tocan la notificación en el teléfono, abrir la app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.openWindow(event.notification.data.url)
    );
});
