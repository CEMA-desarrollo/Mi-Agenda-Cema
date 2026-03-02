import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://hllsgkkgaetkqmobsqbt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbHNna2tnYWV0a3Ftb2JzcWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0Nzg1MzksImV4cCI6MjA4ODA1NDUzOX0.EWsZIyU0D5vFGceAI-1q5vMpSeI0sKBBN-Xo3Hylir4'
);

(async () => {
    const { data: apts, error } = await supabase
        .from('appointments')
        .select(`
            local_id,
            appointment_procedures (
                procedures ( name )
            )
        `)
        .eq('local_id', 2185)
        .single();

    console.log("Error:", error);
    console.log("Data:", JSON.stringify(apts, null, 2));
})();
