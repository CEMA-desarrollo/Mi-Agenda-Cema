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

export const subscribeToPushNotifications = async (providerId: string): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Permiso de notificaciones denegado.');
            return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const convertedVapidKey = urlB64ToUint8Array(vapidPublicKey);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
        });

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
            console.error('Error guardando suscripción push:', error);
            return false;
        }

        console.log('Suscripción Push exitosa y guardada en DB.');
        return true;
    } catch (err) {
        console.error('Error suscribiendo al push:', err);
        return false;
    }
};

export const unsubscribeFromPushNotifications = async (providerId: string): Promise<boolean> => {
    try {
        // Desuscribir del navegador
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
        }

        // Borrar de Supabase
        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('provider_id', providerId);

        if (error) {
            console.error('Error borrando suscripción push:', error);
            return false;
        }

        console.log('Suscripción Push eliminada correctamente.');
        return true;
    } catch (err) {
        console.error('Error desuscribiendo del push:', err);
        return false;
    }
};
