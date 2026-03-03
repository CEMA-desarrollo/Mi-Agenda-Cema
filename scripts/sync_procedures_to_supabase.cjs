const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

// Configuración Supabase
const SUPABASE_URL = 'https://hllsgkkgaetkqmobsqbt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbHNna2tnYWV0a3Ftb2JzcWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0Nzg1MzksImV4cCI6MjA4ODA1NDUzOX0.EWsZIyU0D5vFGceAI-1q5vMpSeI0sKBBN-Xo3Hylir4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncProcedures() {
    console.log('Iniciando sincronización de procedimientos...');
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'citalocal_db'
    });

    try {
        const isFullSync = process.argv.includes('--full');
        const timeFilterProc = isFullSync ? "" : "WHERE updatedAt >= NOW() - INTERVAL 1 DAY";
        const timeFilterRel = isFullSync ? "" : "WHERE appointmentId IN (SELECT id FROM appointments WHERE updatedAt >= NOW() - INTERVAL 1 DAY)";

        console.log(`1. Extrayendo Procedimientos de MySQL (Modo: ${isFullSync ? 'COMPLETO' : 'INCREMENTAL 24H'})...`);
        const [procedures] = await conn.query(`SELECT * FROM procedures ${timeFilterProc}`);
        console.log(`   Se encontraron ${procedures.length} procedimientos.`);

        const supabaseProcedures = procedures.map(p => ({
            local_id: p.id,
            name: p.name,
            category: p.category || 'otro',
            created_at: p.createdAt || new Date(),
            updated_at: p.updatedAt || new Date()
        }));

        console.log('   Enviando procedimientos a Supabase...');
        const { error: procError } = await supabase
            .from('procedures')
            .upsert(supabaseProcedures, { onConflict: 'local_id' });

        if (procError) throw new Error(`Error Supabase (Procedures): ${procError.message}`);
        console.log('   ✅ Procedimientos sincronizados con éxito.');

        console.log('\n2. Extrayendo relaciones Cita-Procedimiento de MySQL...');
        const [appProcs] = await conn.query(`SELECT * FROM AppointmentProcedures ${timeFilterRel}`);
        console.log(`   Se encontraron ${appProcs.length} relaciones.`);

        const supabaseAppProcs = appProcs.map(ap => ({
            appointment_local_id: ap.appointmentId,
            procedure_local_id: ap.procedureId
        }));

        console.log('   Enviando relaciones a Supabase (Procesando en lotes)...');

        const chunkSize = 200;
        let successCount = 0;

        for (let i = 0; i < supabaseAppProcs.length; i += chunkSize) {
            const chunk = supabaseAppProcs.slice(i, i + chunkSize);
            const { error: relError } = await supabase
                .from('appointment_procedures')
                .upsert(chunk, { onConflict: 'appointment_local_id, procedure_local_id' });

            if (relError) {
                console.warn(`   ⚠️ Lote ${i} falló por constraint. Reintentando uno por uno...`);
                // Fallback to one-by-one to salvage valid records in the chunk
                for (const record of chunk) {
                    const { error: singleError } = await supabase
                        .from('appointment_procedures')
                        .upsert([record], { onConflict: 'appointment_local_id, procedure_local_id' });

                    if (singleError) {
                        // Silently ignore or log specific fk failures
                        // console.log("Skipping invalid record: " + record.appointment_local_id);
                    } else {
                        successCount++;
                    }
                }
            } else {
                successCount += chunk.length;
            }
        }
        console.log(`   ✅ ${successCount} relaciones sincronizadas correctamente.`);

        console.log('\n🚀 MIGRACIÓN DE PROCEDIMIENTOS COMPLETADA.');

    } catch (e) {
        console.error('\n❌ La sincronización falló:', e.message);
    } finally {
        await conn.end();
    }
}

syncProcedures();
