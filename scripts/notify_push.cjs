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

        // Solo citas del último día que no hayan sido notificadas
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                id, start_time, end_time, status, provider_local_id,
                patients ( first_name, last_name ),
                providers ( id, name, email )
            `)
            .eq('push_sent', false)
            .gte('created_at', yesterday.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!appointments || appointments.length === 0) {
            console.log(`[Push Notification Service] No hay citas nuevas para notificar.`);
            return;
        }

        console.log(`[Push Notification Service] Procesando ${appointments.length} notificación(es) nuevas.`);

        for (const apt of appointments) {
            // El UUID del médico viene del JOIN con providers
            const providerUUID = apt.providers?.id;

            if (!providerUUID) {
                console.log(`⚠️ Cita ID ${apt.id}: No se encontró el médico (local_id: ${apt.provider_local_id}). Marcando como enviado.`);
                await markAsSent(apt.id);
                continue;
            }

            // Buscar si el médico tiene una suscripción Push activa
            const { data: subData, error: subError } = await supabase
                .from('push_subscriptions')
                .select('subscription')
                .eq('provider_id', providerUUID)
                .maybeSingle();

            if (subError || !subData || !subData.subscription) {
                console.log(`ℹ️ Cita ID ${apt.id}: Médico sin suscripción push activa (UUID: ${providerUUID}). Marcando como enviado.`);
                await markAsSent(apt.id);
                continue;
            }

            // Preparar contenido de la notificación
            const patient = apt.patients;
            const patientName = patient
                ? `${patient.first_name} ${patient.last_name}`.trim()
                : 'Paciente Nuevo';

            // Formatear fecha y hora legible en español
            const startDate = apt.start_time ? new Date(apt.start_time) : null;
            const fechaFormateada = startDate
                ? startDate.toLocaleString('es-VE', {
                    weekday: 'long', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true
                })
                : 'Horario por confirmar';

            const payload = JSON.stringify({
                title: '📅 NUEVA CITA AGENDADA',
                body: `${patientName} — ${fechaFormateada}`,
                url: '/'
            });

            // Enviar notificación Push
            try {
                await webpush.sendNotification(subData.subscription, payload);
                console.log(`✅ Push enviado: Médico ${apt.providers?.name} → Paciente ${patientName} (Cita ID: ${apt.id})`);
            } catch (pushErr) {
                if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                    console.log(`⚠️ Suscripción de médico ${providerUUID} expiró o es inválida, borrando de DB...`);
                    await supabase.from('push_subscriptions').delete().eq('provider_id', providerUUID);
                } else {
                    console.error(`❌ Error enviando push a ${providerUUID}:`, pushErr.body || pushErr);
                }
            }

            // Marcar como enviado
            await markAsSent(apt.id);
        }

        console.log(`[Push Notification Service] Finalizado.`);
    } catch (error) {
        console.error('❌ Fallo Crítico en el Servicio de Notificaciones Push:', error);
    }
}

async function markAsSent(appointmentId) {
    await supabase.from('appointments').update({ push_sent: true }).eq('id', appointmentId);
}

// Ejecutar función principal
notifyPendingAppointments();
