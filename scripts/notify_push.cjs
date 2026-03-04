const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'p_15G86BqTfQYLX66LzUPjF-LRDPPCB89WOvMzo4eMk';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: Variables de Supabase no configuradas en .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

webpush.setVapidDetails(
    'mailto:contacto@citalocal.com',
    VAPID_PUBLIC,
    VAPID_PRIVATE
);

async function notifyPendingAppointments() {
    try {
        console.log(`[Push Notification Service] Buscando nuevas citas...`);

        // 1. Obtener citas no notificadas (y evitar enviar spam viejo, solo último día)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                id, date, start_time, patient_id, provider_id, status,
                patients(name, last_name)
            `)
            .eq('push_sent', false)
            .gte('created_at', yesterday.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!appointments || appointments.length === 0) {
            console.log(`[Push Notification Service] No hay citas nuevas para notificar.`);
            return;
        }

        console.log(`[Push Notification Service] Procesando ${appointments.length} notificaciones nuevas.`);

        for (const apt of appointments) {
            // 2. Buscar si el provider tiene una suscripción Push activa
            const { data: subData, error: subError } = await supabase
                .from('push_subscriptions')
                .select('subscription')
                .eq('provider_id', apt.provider_id)
                .single();

            if (subError || !subData || !subData.subscription) {
                // Si no tiene suscripción igual lo marcamos como enviado para no reintentar infinitamente
                await markAsSent(apt.id);
                continue;
            }

            // 3. Preparar el contenido del Push
            const patientName = apt.patients ? `${apt.patients.name} ${apt.patients.last_name}` : 'Paciente Nuevo';
            const payload = JSON.stringify({
                title: 'NUEVA CITA AGENDADA 📅',
                body: `Se reservó a: ${patientName} el día ${apt.date || ''} a las ${apt.start_time || ''}`,
                url: '/'
            });

            // 4. Enviar notificación Push mediante Google/Apple Push Servers
            try {
                await webpush.sendNotification(subData.subscription, payload);
                console.log(`✅ Push enviado al Doctor ID: ${apt.provider_id} por la Cita ID: ${apt.id}`);
            } catch (pushErr) {
                if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                    console.log(`⚠️ Suscripción de Doctor ID ${apt.provider_id} expiró o es inválida, borrando de DB...`);
                    await supabase.from('push_subscriptions').delete().eq('provider_id', apt.provider_id);
                } else {
                    console.error(`❌ Error enviando push:`, pushErr.body || pushErr);
                }
            }

            // 5. Marcar como enviado en Supabase
            await markAsSent(apt.id);
        }
    } catch (error) {
        console.error('❌ Fallo Crítico en el Servicio de Notificaciones Push:', error);
    }
}

async function markAsSent(appointmentId) {
    await supabase.from('appointments').update({ push_sent: true }).eq('id', appointmentId);
}

// Ejecutar función principal
notifyPendingAppointments();
