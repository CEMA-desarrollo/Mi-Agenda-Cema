require('dotenv').config({ path: 'd:\\Code\\CitaInternet\\citalocal-pwa\\.env' });
const { createClient } = require('@supabase/supabase-js');

async function check() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

    console.log("--- Buscando de forma difusa el 1690 en Supabase ---");

    // Buscar en Appointments donde id empieza por 1690, local_id = 1690
    // O pacientes donde history_number = 1690

    const { data: appts, error } = await supabase
        .from('appointments')
        .select('*, patients(*), appointment_procedures(procedures(*))');

    if (error) { console.error(error); return; }

    const found = appts.filter(a => {
        const idStr = String(a.id);
        const localIdStr = String(a.local_id);
        const title = String(a.title || '');
        const patientHn = String(a.patients?.history_number || '');
        const patientId = String(a.patients?.local_id || '');

        return idStr.includes('1690') ||
            localIdStr.includes('1690') ||
            title.includes('1690') ||
            patientHn.includes('1690') ||
            patientId.includes('1690');
    });

    console.log(`Se encontraron ${found.length} coincidencias`);
    found.forEach(f => {
        console.log("CITA ENCONTRADA:");
        console.log(" ID Supabase:", f.id);
        console.log(" Local ID:", f.local_id);
        console.log(" Paciente:", f.patients?.first_name, f.patients?.last_name, "- HC:", f.patients?.history_number);
        console.log(" Titulo:", f.title);
        console.log(" Procedimientos:");
        if (f.appointment_procedures) {
            f.appointment_procedures.forEach(ap => console.log("   -", ap.procedures?.name));
        }
        console.log("------------------------");
    });
}

check().catch(console.error);
