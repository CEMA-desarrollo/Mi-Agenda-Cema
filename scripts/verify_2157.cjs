require('dotenv').config({ path: 'd:\\Code\\CitaLocal\\cita-local\\.env' });
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

async function check() {
    console.log("Conectando a MySQL y Supabase para buscar Cita 2157...");

    // MySQL
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'citalocal_db' // Corregido: citalocal_db (en DB_NAME o fallback)
    });

    try {
        const [appts] = await connection.execute('SELECT * FROM appointments WHERE id = ?', [2157]);
        console.log("\n--- MySQL Appointment 2157 ---");
        console.log(appts[0] || 'No encontrada');

        if (appts.length > 0) {
            const [appProcs] = await connection.execute('SELECT * FROM AppointmentProcedures WHERE appointmentId = ?', [2157]);
            console.log("\n--- MySQL AppointmentProcedures para 2157 ---");
            console.log(appProcs);

            if (appProcs.length > 0) {
                const procIds = appProcs.map(ap => ap.procedureId);
                const [procs] = await connection.query('SELECT id, name, category FROM procedures WHERE id IN (?)', [procIds]);
                console.log("\n--- Procedimientos Mapeados en MySQL ---");
                console.log(procs);
            }
        }
    } catch (e) {
        console.log("\nError consultando MySQL:", e.message);
    }

    await connection.end();

    // Supabase
    require('dotenv').config({ path: 'd:\\Code\\CitaInternet\\citalocal-pwa\\.env' });
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
    );

    console.log("\n--- Supabase Appointment 2157 (local_id) ---");
    const { data: supAppt } = await supabase
        .from('appointments')
        .select(`
            *,
            patients (*),
            appointment_procedures (
                procedures (id, name, category, local_id)
            )
        `)
        .eq('local_id', 2157)
        .single();

    if (supAppt) {
        console.log(JSON.stringify(supAppt, null, 2));
    } else {
        console.log("No encontrada en Supabase con local_id = 2157");
    }
}

check().catch(console.error);
