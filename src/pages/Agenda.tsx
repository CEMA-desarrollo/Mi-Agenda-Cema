import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, MapPin, User, Loader2, CalendarX2 } from 'lucide-react';

// Types matched to our Supabase Schema
interface Appointment {
    id: string;
    local_id: number;
    title: string | null;
    start_time: string;
    end_time: string;
    notes: string | null;
    status: 'pending' | 'attended' | 'cancelled';
    is_domicilio: boolean;
    patients: {
        first_name: string;
        last_name: string;
        phone: string | null;
    };
    resources: {
        name: string;
    } | null;
}

export const Agenda = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        fetchAppointments();
    }, [selectedDate]);

    const fetchAppointments = async () => {
        setLoading(true);

        // Rango del día seleccionado
        const start = startOfDay(selectedDate).toISOString();
        const end = endOfDay(selectedDate).toISOString();

        const { data, error } = await supabase
            .from('appointments')
            .select(`
        id, local_id, title, start_time, end_time, notes, status, is_domicilio,
        patients ( first_name, last_name, phone ),
        resources ( name )
      `)
            .gte('start_time', start)
            .lte('start_time', end)
            .order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching appointments:', error);
        } else {
            setAppointments((data as unknown as Appointment[]) || []);
        }

        setLoading(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'attended': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    return (
        <div className="pb-8">
            {/* Header Sticky */}
            <div className="bg-primary-600 text-white p-6 rounded-b-3xl shadow-md sticky top-0 z-10">
                <h1 className="text-2xl font-bold tracking-tight">Mi Agenda</h1>
                <p className="text-primary-100 font-medium mt-1 capitalize">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </p>
            </div>

            <div className="p-4 mt-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-primary-500 mb-4" size={32} />
                        <p className="text-slate-500">Cargando citas...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <CalendarX2 className="text-slate-400" size={40} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">Sin citas hoy</h3>
                        <p className="text-slate-500 text-sm mt-2">No tienes citas programadas para esta fecha.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {appointments.map((apt) => (
                            <div key={apt.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">

                                {/* Time & Status Row */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-lg">
                                        <Clock size={18} className="text-primary-500" />
                                        {format(new Date(apt.start_time), 'HH:mm')}
                                        <span className="text-slate-400 text-sm font-normal mx-1">hacia</span>
                                        {format(new Date(apt.end_time), 'HH:mm')}
                                    </div>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusColor(apt.status)}`}>
                                        {apt.status === 'attended' ? 'Atendido' : apt.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                                    </span>
                                </div>

                                {/* Patient Info */}
                                <div className="flex items-start gap-3 mb-3 bg-slate-50 p-3 rounded-xl">
                                    <div className="bg-white p-2 rounded-full shadow-sm">
                                        <User size={18} className="text-slate-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">
                                            {apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Paciente Desconocido'}
                                        </h3>
                                        {apt.title && <p className="text-sm text-slate-600 mt-0.5">{apt.title}</p>}
                                        {apt.patients?.phone && (
                                            <a href={`tel:${apt.patients.phone}`} className="text-primary-600 text-sm font-medium hover:underline mt-1 inline-block">
                                                {apt.patients.phone}
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Location Info */}
                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                    <MapPin size={16} />
                                    <span>
                                        {apt.is_domicilio ? 'Visita a Domicilio' : (apt.resources?.name || 'Consultorio no asignado')}
                                    </span>
                                </div>

                                {/* Notes */}
                                {apt.notes && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 italic">
                                        "{apt.notes}"
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
