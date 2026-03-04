require('dotenv').config({ path: 'd:\\Code\\CitaLocal\\cita-local\\.env' });
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

async function check() {
    console.log("Conectando a MySQL y Supabase...");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'citalocal_db'
    });

    const [tables] = await connection.query('SHOW TABLES');
    console.log("\n--- Tablas en MySQL ---");
    console.log(tables.map(t => Object.values(t)[0]));

    // Query Supabase directly first to get the local_id
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hllsgkkgaetkqmobsqbt.supabase.co'; // Replace with actual if missing
    require('dotenv').config({ path: 'd:\\Code\\CitaInternet\\citalocal-pwa\\.env' });
    const url = process.env.VITE_SUPABASE_URL || supabaseUrl;
    const key = process.env.VITE_SUPABASE_ANON_KEY;

    const supabase = createClient(url, key);

    // Obtenemos de Supabase la cita 1690
    console.log("\n--- Buscando en Supabase por ID o local_id = 1690 ---");
    const { data: supAppt } = await supabase.from('appointments').select('*, patients(*), appointment_procedures(procedures(*))').eq('local_id', 1690).single();
    if (supAppt) {
        console.log(JSON.stringify(supAppt, null, 2));
    } else {
        console.log("No se encontro en Supabase tampoco!");
    }

    try {
        const [appts] = await connection.execute('SELECT * FROM Appointments WHERE id = ?', [1690]);
        console.log("\n--- MySQL Appointment (Appointments) ---");
        console.log(appts[0] || 'No encontrada');
    } catch (e) {
        console.log("Error al buscar en Appointments:", e.message);
    }

    await connection.end();
}

check().catch(console.error);
