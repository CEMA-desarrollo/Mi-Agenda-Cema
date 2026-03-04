import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Moon, Sun, Monitor, LogOut, Bell } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { useTheme } from '../components/ThemeProvider';
import { subscribeToPushNotifications } from '../lib/push';
export const Profile = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [providerName, setProviderName] = useState<string | null>(null);
    const [providerId, setProviderId] = useState<string | null>(null);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user?.email) {
                fetchProviderData(session.user.email);
            }
        });
    }, []);

    const fetchProviderData = async (email: string) => {
        const { data } = await supabase
            .from('providers')
            .select('id, name')
            .eq('email', email)
            .single();

        if (data) {
            setProviderName(data.name);
            setProviderId(data.id);
        }
    };

    const handleSubscribePush = async () => {
        if (!providerId) return;
        setIsSubscribing(true);
        const success = await subscribeToPushNotifications(providerId);
        if (success) {
            alert('¡Notificaciones activadas exitosamente!');
        } else {
            alert('No se pudo activar las notificaciones. Verifica los permisos de tu navegador.');
        }
        setIsSubscribing(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // Fallbacks para metadata de Google
    const googleName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
    const displayName = providerName || googleName || 'Médico CitaLocal';
    const avatarUrl = session?.user?.user_metadata?.avatar_url;

    return (
        <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Cabecera */}
            <div className="bg-primary-600 text-white p-6 rounded-3xl shadow-md mb-6 transition-colors">
                <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center transition-colors duration-200">

                {/* Avatar */}
                <div className="w-28 h-28 bg-primary-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-5 overflow-hidden border-4 border-white dark:border-slate-800 shadow-md">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <User className="text-primary-600 dark:text-primary-400" size={56} />
                    )}
                </div>

                {/* Info Principal */}
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">
                    {displayName}
                </h2>

                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-8 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-full border border-slate-100 dark:border-slate-700/50">
                    <Mail size={16} />
                    <span className="text-sm font-medium">{session?.user?.email || 'Cargando correo...'}</span>
                </div>

                {/* Accesos Rápidos */}
                <div className="w-full mb-6">
                    <button
                        onClick={handleSubscribePush}
                        disabled={isSubscribing || !providerId}
                        className="w-full flex items-center justify-between bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 p-4 rounded-xl border border-primary-100 dark:border-primary-800/30 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-primary-800 rounded-lg shadow-sm">
                                <Bell size={20} className="text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-sm">Notificaciones Push</p>
                                <p className="text-xs opacity-80">Recibir alertas de nuevas citas</p>
                            </div>
                        </div>
                        <span className="text-sm font-bold bg-primary-600 text-white px-3 py-1 rounded-full">
                            {isSubscribing ? '...' : 'Activar'}
                        </span>
                    </button>
                </div>

                {/* Opciones de Preferencias */}
                <div className="w-full mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-2">
                        Preferencias Visuales
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl flex items-center border border-slate-100 dark:border-slate-700/50">
                        <button
                            onClick={() => setTheme('light')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <Sun size={18} /> Claro
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <Moon size={18} /> Oscuro
                        </button>
                        <button
                            onClick={() => setTheme('system')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <Monitor size={18} /> Auto
                        </button>
                    </div>
                </div>

                {/* Botón Peligro - Cerrar sesión */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 font-bold py-3.5 rounded-2xl transition-colors mt-auto border border-red-100 dark:border-red-500/20"
                >
                    <LogOut size={20} />
                    Cerrar Sesión Segura
                </button>
            </div>
        </div>
    );
};
