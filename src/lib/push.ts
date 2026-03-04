import { supabase } from './supabase';

const urlB64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export const checkPushSubscription = async (providerId: string): Promise<boolean> => {
    if (!providerId) return false;
    const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('provider_id', providerId)
        .maybeSingle();
    return !!data;
};

// Returns null on success, or an error string describing exactly what went wrong
export const subscribeToPushNotifications = async (providerId: string): Promise<string | null> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return 'Tu navegador no es compatible con Notificaciones Push.';
    }

    try {
        // 1. Pedir permiso
        const permission = await Notification.requestPermission();
        if (permission === 'denied') {
            return 'Permiso denegado por el sistema. Ve a Ajustes del Navegador → Notificaciones y actívalo manualmente para este sitio.';
        }
        if (permission !== 'granted') {
            return 'No se otorgó permiso de notificaciones. Intenta de nuevo y pulsa "Permitir".';
        }

        // 2. Esperar Service Worker activo (10s timeout)
        let swReady: ServiceWorkerRegistration;
        try {
            swReady = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('SW_TIMEOUT')), 10000)
                )
            ]) as ServiceWorkerRegistration;
        } catch (e: any) {
            if (e?.message === 'SW_TIMEOUT') {
                return 'El Service Worker tardó demasiado en activarse. Recarga la página y vuelve a intentarlo.';
            }
            return `Error al iniciar el Service Worker: ${e?.message}`;
        }

        // 3. Verificar clave VAPID
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            return 'Clave VAPID no configurada. Contacta al administrador.';
        }

        let convertedVapidKey: Uint8Array;
        try {
            convertedVapidKey = urlB64ToUint8Array(vapidPublicKey);
        } catch (e: any) {
            return `Error al procesar la clave VAPID: ${e?.message}`;
        }

        // 4. Cancelar suscripción anterior si existe
        const existingSub = await swReady.pushManager.getSubscription();
        if (existingSub) await existingSub.unsubscribe();

        // 5. Crear nueva suscripción
        let subscription: PushSubscription;
        try {
            subscription = await swReady.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey.buffer as ArrayBuffer,
            });
        } catch (e: any) {
            return `Error al suscribirse al servidor push: ${e?.message}. Es posible que el navegador haya bloqueado notificaciones para este sitio.`;
        }

        // 6. Guardar en Supabase
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
                {
                    provider_id: providerId,
                    subscription: subscription.toJSON(),
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'provider_id' }
            );

        if (error) {
            return `Error al guardar la suscripción en la base de datos: ${error.message}`;
        }

        return null; // null = éxito
    } catch (err: any) {
        return `Error inesperado: ${err?.message ?? String(err)}`;
    }
};

export const unsubscribeFromPushNotifications = async (providerId: string): Promise<boolean> => {
    try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) await subscription.unsubscribe();
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('provider_id', providerId);

        if (error) {
            console.error('Error borrando suscripción push:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Error desuscribiendo del push:', err);
        return false;
    }
};
