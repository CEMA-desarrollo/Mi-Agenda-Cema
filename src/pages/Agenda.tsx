import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

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
    } | null;
    resources: {
        name: string;
    } | null;
    providers: {
        name: string;
        color: string | null;
    } | null;
}

// Interface for FullCalendar Event parsing
interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    backgroundColor: string;
    borderColor: string;
    extendedProps: {
        status: string;
        is_domicilio: boolean;
        patientName: string;
        resourceName: string;
        providerName: string;
        notes: string | null;
    };
}

export const Agenda = () => {
    const [loading, setLoading] = useState(false);
    const [showEventDetails, setShowEventDetails] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    // Provide a ref to calendar to manipulate it if needed
    const calendarRef = useRef<FullCalendar>(null);

    // FullCalendar will call this function automatically when the date range changes
    // Wrapped in useCallback to prevent infinite render loops when state changes.
    const fetchCalendarEvents = useCallback(async (fetchInfo: any, successCallback: any, failureCallback: any) => {
        // 1. Get current Authenticated User
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error('Authentication error or missing session.');
            failureCallback(sessionError);
            return;
        }

        const userEmail = session.user.email?.toLowerCase() || '';

        // Solo el correo principal de CEMA tiene acceso global como Super Admin
        const isCemaAdmin = userEmail === 'cemabqtoca@gmail.com';

        let targetProviderId: number | null = null;

        // If not admin, find which provider `local_id` this email belongs to
        if (!isCemaAdmin) {
            const { data: providerData, error: providerError } = await supabase
                .from('providers')
                .select('local_id')
                .eq('email', userEmail)
                .single();

            if (providerError || !providerData) {
                console.warn(`No provider linked to email: ${userEmail}. Showing empty calendar.`);
                successCallback([]); // No appointments for unrecognized emails
                return;
            }
            targetProviderId = providerData.local_id;
        }

        // 2. Build the query based on role
        let query = supabase
            .from('appointments')
            .select(`
                id, local_id, title, start_time, end_time, notes, status, is_domicilio,
                patients ( first_name, last_name ),
                resources ( name ),
                providers ( name, color, email )
            `)
            .gte('start_time', fetchInfo.startStr)
            .lt('start_time', fetchInfo.endStr)
            .order('start_time', { ascending: true });

        // Apply Provider Filter if not admin
        if (!isCemaAdmin && targetProviderId !== null) {
            query = query.eq('provider_local_id', targetProviderId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching appointments:', error);
            failureCallback(error);
        } else {
            const mappedEvents = (data as unknown as Appointment[]).map(apt => {
                // Determine color based on provider first, then fallback
                let bgColor = apt.providers?.color || '#3b82f6'; // default blue

                // Provide a slight visual cue for cancelled status
                if (apt.status === 'cancelled') {
                    bgColor = '#ef4444'; // strict red
                }

                const patientName = apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Desconocido';

                return {
                    id: apt.id,
                    title: `${patientName} - ${apt.title || 'Consulta'}`,
                    start: apt.start_time,
                    end: apt.end_time,
                    backgroundColor: bgColor,
                    borderColor: bgColor,
                    extendedProps: {
                        status: apt.status,
                        is_domicilio: apt.is_domicilio,
                        patientName: patientName,
                        resourceName: apt.resources?.name || 'No asignado',
                        providerName: apt.providers?.name || 'Sin tratante',
                        notes: apt.notes
                    }
                };
            });
            successCallback(mappedEvents);
        }
    }, []);

    const handleEventClick = (clickInfo: any) => {
        const ev = clickInfo.event;
        setSelectedEvent({
            id: ev.id,
            title: ev.title,
            start: ev.startStr,
            end: ev.endStr,
            backgroundColor: ev.backgroundColor,
            borderColor: ev.borderColor,
            extendedProps: ev.extendedProps
        });
        setShowEventDetails(true);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 relative pb-16">
            {/* Header */}
            <div className="bg-primary-600 text-white p-4 rounded-b-3xl shadow-md z-10 shrink-0">
                <h1 className="text-2xl font-bold tracking-tight px-2">Mi Agenda</h1>
            </div>

            <div className="flex-1 overflow-hidden p-2 mt-2 relative">
                {/* Visual loading indicator overlaid atop calendar if fetching */}
                {loading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-2xl">
                        <Loader2 className="animate-spin text-primary-500 mb-2" size={32} />
                        <span className="text-slate-600 font-medium text-sm">Cargando citas...</span>
                    </div>
                )}

                <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden fc-wrapper">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        initialView="timeGridDay"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek'
                        }}
                        buttonText={{
                            today: 'Hoy',
                            month: 'Mes',
                            week: 'Sem',
                            day: 'Día',
                            list: 'Lista'
                        }}
                        locale="es"
                        events={fetchCalendarEvents}
                        loading={(isLoading) => setLoading(isLoading)}
                        eventClick={handleEventClick}
                        allDaySlot={false}
                        slotMinTime="07:00:00"
                        slotMaxTime="22:00:00"
                        height="100%"
                        nowIndicator={true}
                        expandRows={true}
                        navLinks={true} // allows clicking day headers to go to day view
                        slotLabelFormat={{
                            hour: 'numeric',
                            minute: '2-digit',
                            meridiem: 'short',
                            hour12: true
                        }}
                        eventTimeFormat={{
                            hour: 'numeric',
                            minute: '2-digit',
                            meridiem: 'short',
                            hour12: true
                        }}
                    />
                </div>
            </div>

            {/* Event Details Modal (Bottom Sheet on Mobile) */}
            {showEventDetails && selectedEvent && (
                <div
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    onClick={() => setShowEventDetails(false)}
                >
                    <div
                        className="bg-white w-full sm:w-[500px] rounded-t-[32px] sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-20 flex flex-col max-h-[90vh] pb-8 pt-4 sm:p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle Indicator */}
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden flex-shrink-0"></div>

                        <div className="flex items-center justify-between px-6 sm:px-0 mb-4 flex-shrink-0">
                            <h2 className="font-bold tracking-tight text-xl text-slate-800">
                                Detalles de cita
                            </h2>
                            <button
                                onClick={() => setShowEventDetails(false)}
                                className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors bg-white shadow-sm border border-slate-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto px-6 sm:px-0 flex-1">
                            <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/50 p-6 shadow-sm">
                                {/* Color line accent */}
                                <div className="absolute top-0 left-0 bottom-0 w-2" style={{ backgroundColor: selectedEvent.backgroundColor }}></div>

                                <h3 className="text-xl font-bold text-slate-800 mb-1 ml-3 mt-1">
                                    {selectedEvent.extendedProps.patientName}
                                </h3>
                                <p className="text-slate-500 font-medium mb-5 ml-3 text-sm">
                                    {selectedEvent.title.split(' - ')[1] || 'Consulta General'}
                                </p>

                                <div className="space-y-4 ml-3">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                            Horario
                                        </p>
                                        <p className="text-slate-700 font-bold capitalize text-base">
                                            {new Date(selectedEvent.start).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                        <p className="text-slate-500 font-medium font-mono text-sm mt-0.5">
                                            {new Date(selectedEvent.start).toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            {' - '}
                                            {new Date(selectedEvent.end).toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-slate-200/60">
                                        <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            Médico Tratante
                                        </p>
                                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm w-fit">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ backgroundColor: selectedEvent.backgroundColor }}></div>
                                            <p className="text-slate-700 font-bold text-sm tracking-tight">{selectedEvent.extendedProps.providerName}</p>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-slate-200/60 flex items-center gap-6">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                                Estado
                                            </p>
                                            <span className={`inline-block text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm
                                                ${selectedEvent.extendedProps.status === 'attended' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' :
                                                    selectedEvent.extendedProps.status === 'cancelled' ? 'bg-red-100 text-red-700 border border-red-200/50' :
                                                        'bg-sky-100 text-sky-700 border border-sky-200/50'}`}
                                            >
                                                {selectedEvent.extendedProps.status === 'attended' ? 'Atendido' : selectedEvent.extendedProps.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                                Ubicación
                                            </p>
                                            <p className="text-slate-700 font-bold text-sm">
                                                {selectedEvent.extendedProps.is_domicilio ? 'Visita a Domicilio' : selectedEvent.extendedProps.resourceName}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedEvent.extendedProps.notes && (
                                        <div className="pt-3 border-t border-slate-200/60">
                                            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><line x1="9" x2="15" y1="9" y2="9" /><line x1="9" x2="15" y1="13" y2="13" /><line x1="9" x2="11" y1="17" y2="17" /></svg>
                                                Notas de Cita
                                            </p>
                                            <p className="text-slate-600 bg-white p-3 rounded-xl border border-slate-200/60 shadow-inner text-sm leading-relaxed">
                                                {selectedEvent.extendedProps.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* FullCalendar Mobile Customizations */
                .fc-wrapper .fc {
                    --fc-border-color: #e2e8f0;
                    --fc-button-bg-color: #f1f5f9;
                    --fc-button-border-color: #e2e8f0;
                    --fc-button-text-color: #475569;
                    --fc-button-hover-bg-color: #e2e8f0;
                    --fc-button-hover-border-color: #cbd5e1;
                    --fc-button-active-bg-color: #0284c7;
                    --fc-button-active-border-color: #0284c7;
                    --fc-button-active-text-color: #ffffff;
                    --fc-today-bg-color: #f0f9ff;
                    --fc-neutral-bg-color: #f8fafc;
                    --fc-event-border-color: transparent;
                    --fc-page-bg-color: #ffffff;
                }

                .fc-wrapper .fc-toolbar-title {
                    font-size: 1.1rem !important;
                    font-weight: 700 !important;
                    color: #1e293b;
                    text-transform: capitalize;
                }

                .fc-wrapper .fc-header-toolbar {
                    padding: 0.75rem !important;
                    margin-bottom: 0 !important;
                    background-color: #ffffff;
                    border-bottom: 1px solid #f1f5f9;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                
                /* Tweak specifically for smaller mobile buttons */
                @media (max-width: 640px) {
                    .fc-wrapper .fc-toolbar-chunk:nth-child(1) { /* prev/next/today */
                       display: flex;
                       width: 100%;
                       justify-content: space-between;
                       margin-bottom: 0.5rem;
                    }
                    .fc-wrapper .fc-toolbar-chunk:nth-child(2) { /* title */
                        width: 100%;
                        text-align: center;
                        margin-bottom: 0.5rem;
                    }
                    .fc-wrapper .fc-toolbar-chunk:nth-child(3) { /* views */
                        width: 100%;
                        display: flex;
                        justify-content: center;
                    }
                    .fc-wrapper .fc-toolbar-title {
                        font-size: 1.25rem !important;
                    }
                }

                .fc-wrapper .fc-button {
                    font-weight: 600 !important;
                    text-transform: capitalize;
                    padding: 0.35rem 0.6rem !important;
                    border-radius: 0.5rem !important;
                    box-shadow: none !important;
                }
                .fc-wrapper .fc-button-group {
                    border-radius: 0.5rem;
                    overflow: hidden;
                }
                .fc-wrapper .fc-button-group .fc-button {
                    border-radius: 0 !important;
                }
                
                .fc-wrapper .fc-event {
                    border-radius: 4px;
                    padding: 2px 4px;
                    cursor: pointer;
                    font-size: 0.75rem;
                    border: none;
                    transition: opacity 0.2s;
                }
                .fc-wrapper .fc-event:hover {
                    opacity: 0.9;
                }
                .fc-wrapper .fc-timegrid-event .fc-event-main {
                    padding: 2px;
                }
                .fc-wrapper .fc-col-header-cell-cushion {
                    padding: 8px 4px !important;
                    font-weight: 600;
                    color: #475569;
                    text-transform: capitalize;
                }
                .fc-wrapper .fc-timegrid-slot-label {
                    font-size: 0.75rem;
                    color: #64748b;
                }
            `}</style>
        </div>
    );
};
