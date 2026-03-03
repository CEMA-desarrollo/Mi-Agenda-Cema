import { Outlet, NavLink } from 'react-router-dom';
import { CalendarDays, User, BarChart3 } from 'lucide-react';

export const Layout = () => {

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <main className="flex-1 overflow-y-auto no-scrollbar pb-16">
                <Outlet />
            </main>

            <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 shadow-lg px-6 py-3 flex justify-around items-center z-50">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`
                    }
                >
                    <CalendarDays size={24} />
                    <span className="text-xs font-medium">Mi Agenda</span>
                </NavLink>

                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`
                    }
                >
                    <BarChart3 size={24} />
                    <span className="text-xs font-medium">Estadísticas</span>
                </NavLink>

                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`
                    }
                >
                    <User size={24} />
                    <span className="text-xs font-medium">Perfil</span>
                </NavLink>

                {/* Botón Salir Removido intencionalmente por usabilidad */}
            </nav>
        </div>
    );
};
