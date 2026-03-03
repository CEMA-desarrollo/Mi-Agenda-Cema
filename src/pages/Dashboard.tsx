import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity, Users, ClipboardList, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar as CalendarIcon } from 'lucide-react';

interface PatientAppt {
    id: string;
    title: string;
    time: string;
    startTimeDate: Date;
    patientName?: string;
    historyNumber?: string;
    doctorName?: string;
}

interface ProcedureCount {
    name: string;
    count: number;
    patients: PatientAppt[];
}

export const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [totalAppointments, setTotalAppointments] = useState(0);
    const [procedureCounts, setProcedureCounts] = useState<ProcedureCount[]>([]);
    const [doctorName, setDoctorName] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expandedProcedure, setExpandedProcedure] = useState<string | null>(null);

    useEffect(() => {
        loadDailyStats();
    }, [selectedDate]);

    const loadDailyStats = async () => {
        try {
            setLoading(true);

            // 1. Obtener usuario actual
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) throw userError;

            // El ID del doctor viene en los metadatos de app (o user_metadata dependiendo de cómo se guardó)
            const providerId = userData.user.user_metadata?.provider_local_id || userData.user.app_metadata?.provider_local_id;

            // Obtener nombre del doctor
            const { data: providerData } = await supabase
                .from('providers')
                .select('name')
                .eq('local_id', providerId)
                .single();

            // Si el nombre del doctor no existe directamente, es porque es la cuenta MASTER
            // En el sistema CitaLocal, la cuenta de la clínica suele tener ID 1 o no estar ligada a un médico físico.
            const isMaster = userData.user.email?.toLowerCase().includes('cema') || providerId === 1 || !providerId;

            if (isMaster) {
                setDoctorName('Clínica CEMA (Global)');
            } else if (providerData) {
                setDoctorName(providerData.name);
            }

            // 2. Definir rango de fechas basado en 'selectedDate'
            const todayStart = startOfDay(selectedDate).toISOString();
            const todayEnd = endOfDay(selectedDate).toISOString();

            // 3. Consultar Citas
            let query = supabase
                .from('appointments')
                .select(`
                    local_id,
                    title,
                    start_time,
                    patients (
                        first_name,
                        last_name,
                        history_number
                    ),
                    providers (
                        name
                    ),
                    appointment_procedures (
                        procedures (
                            name
                        )
                    )
                `)
                .gte('start_time', todayStart)
                .lte('start_time', todayEnd);

            if (!isMaster && providerId) {
                query = query.eq('provider_local_id', providerId);
            }

            const { data: appointments, error: apptError } = await query;

            if (apptError) throw apptError;

            // 4. Calcular estadísticas
            setTotalAppointments(appointments?.length || 0);

            // Contar procedimientos y agrupar pacientes
            const pCounts: Record<string, { count: number, patients: PatientAppt[] }> = {};

            appointments?.forEach(appt => {
                const patientData = Array.isArray(appt.patients) ? appt.patients[0] : appt.patients;
                const pFirst = patientData?.first_name || '';
                const pLast = patientData?.last_name || '';
                const pName = `${pFirst} ${pLast}`.trim();
                const histNo = patientData?.history_number || 'N/A';

                const providerData = Array.isArray(appt.providers) ? appt.providers[0] : appt.providers;
                const docName = providerData?.name || 'No Asignado';

                const apptInfo: PatientAppt = {
                    id: String(appt.local_id),
                    title: pName || appt.title || 'Sin Título',
                    time: appt.start_time ? format(new Date(appt.start_time), 'h:mm a') : '',
                    startTimeDate: appt.start_time ? new Date(appt.start_time) : new Date(0),
                    patientName: pName,
                    historyNumber: histNo,
                    doctorName: docName
                };

                // Si la cita tiene procedimientos enlazados
                if (appt.appointment_procedures && appt.appointment_procedures.length > 0) {
                    appt.appointment_procedures.forEach((ap: any) => {
                        const pName = ap.procedures?.name || 'Procedimiento Desconocido';
                        if (!pCounts[pName]) pCounts[pName] = { count: 0, patients: [] };
                        pCounts[pName].count++;
                        pCounts[pName].patients.push(apptInfo);
                    });
                } else {
                    const fallbackName = appt.title || 'Consulta General';
                    if (!pCounts[fallbackName]) pCounts[fallbackName] = { count: 0, patients: [] };
                    pCounts[fallbackName].count++;
                    pCounts[fallbackName].patients.push(apptInfo);
                }
            });

            // Convertir objeto a array para renderizado, y ordenar los pacientes por hora
            const sortedCounts = Object.entries(pCounts)
                .map(([name, data]) => {
                    // Ordenar pacientes cronológicamente
                    const sortedPatients = data.patients.sort((a, b) => a.startTimeDate.getTime() - b.startTimeDate.getTime());
                    return { name, count: data.count, patients: sortedPatients };
                })
                .sort((a, b) => b.count - a.count); // Ordenar de mayor a menor según cantidad de pacientes

            setProcedureCounts(sortedCounts);

        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
    const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
    const handleToday = () => setSelectedDate(new Date());

    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const dayFormatted = format(selectedDate, "EEEE, d 'de' MMMM", { locale: es });

    const toggleAccordion = (name: string) => {
        setExpandedProcedure(prev => prev === name ? null : name);
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-primary-600 text-white px-6 pt-8 pb-6 shadow-md rounded-b-3xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">Tu Rendimiento</h1>
                        {doctorName && <p className="font-medium text-white/90 text-sm">{doctorName}</p>}
                    </div>
                    <button
                        onClick={handleToday}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${isToday ? 'bg-white/20 border-transparent' : 'border-white/40 hover:bg-white/10'
                            }`}
                    >
                        Hoy
                    </button>
                </div>

                {/* Date Navigator */}
                <div className="mt-6 flex items-center justify-between bg-white/10 rounded-xl p-2 backdrop-blur-sm">
                    <button onClick={handlePrevDay} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <ChevronLeft size={20} />
                    </button>

                    <div className="relative flex flex-col items-center group">
                        <span className="text-sm font-semibold capitalize pointer-events-none">{dayFormatted}</span>
                        {/* Selector de fecha nativo superpuesto pero invisible */}
                        <input
                            type="date"
                            value={format(selectedDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                if (e.target.value) {
                                    // Parse local date strictly
                                    const [year, month, day] = e.target.value.split('-');
                                    setSelectedDate(new Date(Number(year), Number(month) - 1, Number(day)));
                                }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        />
                    </div>

                    <button onClick={handleNextDay} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 px-4 py-6">

                {/* Main Stat Card / Hero */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary-100 p-4 rounded-xl text-primary-600">
                            <Users size={32} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Pacientes la fecha</p>
                            <h2 className="text-4xl font-bold text-slate-800">{totalAppointments}</h2>
                        </div>
                    </div>
                </div>

                {/* Section Title */}
                <div className="flex items-center gap-2 mb-4 px-2">
                    <Activity className="text-slate-400" size={20} />
                    <h3 className="text-lg font-bold text-slate-700">Desglose de Procedimientos</h3>
                </div>

                {/* Procedures Accordion */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {procedureCounts.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {procedureCounts.map((proc, index) => {
                                const isExpanded = expandedProcedure === proc.name;
                                return (
                                    <div key={index} className="flex flex-col">
                                        {/* Header Accordion */}
                                        <button
                                            onClick={() => toggleAccordion(proc.name)}
                                            className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors w-full text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-100 p-2 rounded-lg text-slate-500 flex-shrink-0">
                                                    <ClipboardList size={18} />
                                                </div>
                                                <span className="font-medium text-slate-700 leading-tight pr-2">{proc.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <div className="bg-primary-50 text-primary-700 font-bold px-3 py-1 rounded-full text-sm">
                                                    {proc.count}
                                                </div>
                                                {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                            </div>
                                        </button>

                                        {/* Body Accordion */}
                                        {isExpanded && (
                                            <div className="bg-slate-50 p-4 pt-1 border-t border-slate-100">
                                                <ul className="space-y-3">
                                                    {proc.patients.map((patient, pIdx) => (
                                                        <li key={pIdx} className="flex flex-col bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                            {/* Barra lateral de tiempo para diseño */}
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-400"></div>

                                                            <div className="flex justify-between items-start pl-2">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-slate-800 leading-tight">
                                                                        {patient.patientName || patient.title}
                                                                    </span>
                                                                    {patient.historyNumber && patient.historyNumber !== 'N/A' && (
                                                                        <span className="text-xs text-slate-500 font-medium">H.C: {patient.historyNumber}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1 mt-0.5 text-xs text-primary-700 font-semibold bg-primary-50 px-2 py-1 rounded">
                                                                    <CalendarIcon size={12} />
                                                                    <span>{patient.time}</span>
                                                                </div>
                                                            </div>

                                                            <div className="mt-2 pl-2 border-t border-slate-100 pt-2 flex items-center gap-1">
                                                                <Users size={12} className="text-slate-400" />
                                                                <span className="text-xs text-slate-500 italic">{patient.doctorName}</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            <ClipboardList className="mx-auto mb-3 opacity-20" size={48} />
                            <p>No hay pacientes o procedimientos para este día.</p>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};
