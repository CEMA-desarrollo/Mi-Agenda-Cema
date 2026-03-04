const http = require('http');
const { exec } = require('child_process');

const PORT = 3010;

// Rutas absolutas explícitas para evitar errores en Windows
const syncBaseScript = 'd:\\Code\\CitaLocal\\cita-local\\scripts\\sync_to_supabase.js';
const syncProceduresScript = 'd:\\Code\\CitaInternet\\citalocal-pwa\\scripts\\sync_procedures_to_supabase.cjs';

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/sync-all') {
        console.log(`[${new Date().toISOString()}] 🚀 n8n ha solicitado una nueva sincronización...`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Sincronización iniciada en segundo plano' }));

        console.log('-> Ejecutando sync_to_supabase.js...');
        exec(`node "${syncBaseScript}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error en Tablas Base: ${error.message}`);
            }
            if (stdout) console.log(`✅ Salida Tablas Base:\n${stdout.substring(0, 500)}...`);

            console.log('-> Ejecutando sync_procedures_to_supabase.cjs...');
            exec(`node "${syncProceduresScript}"`, (error2, stdout2, stderr2) => {
                if (error2) {
                    console.error(`❌ Error en Procedimientos: ${error2.message}`);
                }
                if (stdout2) console.log(`✅ Salida Procedimientos:\n${stdout2.substring(0, 500)}...`);

                // NOTIFICACIONES PUSH
                console.log('-> Ejecutando notify_push.cjs...');
                const pushScript = 'd:\\Code\\CitaInternet\\citalocal-pwa\\scripts\\notify_push.cjs';
                exec(`node "${pushScript}"`, (error3, stdout3, stderr3) => {
                    if (error3) {
                        console.error(`❌ Error en Notificaciones Push: ${error3.message}`);
                    }
                    if (stdout3) console.log(`✅ Salida Push:\n${stdout3}`);
                    console.log(`[${new Date().toISOString()}] 🎉 Sincronización completa finalizada.`);
                });
            });
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🤖 WEBHOOK DE N8N ACTIVO EN EL PUERTO ${PORT}`);
    console.log(`Escuchando peticiones en: http://localhost:${PORT}/sync-all`);
    console.log(`Deja esta pequeña ventana abierta para que n8n sincronice.`);
    console.log(`=================================================`);
});
