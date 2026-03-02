import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export const Profile = () => {
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
    }, []);

    return (
        <div className="p-6">
            <div className="bg-primary-600 text-white p-6 rounded-3xl shadow-md mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-6">
                    <User className="text-primary-600" size={48} />
                </div>

                <h2 className="text-xl font-bold text-slate-800 mb-1">
                    Dr(a). {session?.user?.user_metadata?.name || 'Médico CitaLocal'}
                </h2>

                <div className="flex items-center gap-2 text-slate-500 mb-6 bg-slate-50 px-4 py-2 rounded-full mt-2">
                    <Mail size={16} />
                    <span className="text-sm font-medium">{session?.user?.email}</span>
                </div>

                <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-medium py-3 rounded-2xl transition-colors mt-auto"
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
};
