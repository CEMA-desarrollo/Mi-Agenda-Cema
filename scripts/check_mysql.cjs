const mysql = require('mysql2/promise');

async function checkLocalAppointment() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'citalocal_db'
    });

    try {
        const [appProcs] = await conn.query('SELECT * FROM AppointmentProcedures WHERE appointmentId = 2185');
        console.log(`Procedimientos para cita 2185 en MySQL:`, appProcs);

        const [app] = await conn.query('SELECT * FROM appointments WHERE id = 2185');
        console.log(`Cita 2185:`, app[0]);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await conn.end();
    }
}

checkLocalAppointment();
