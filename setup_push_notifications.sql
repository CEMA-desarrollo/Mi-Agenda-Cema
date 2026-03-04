-- Script SQL para configurar Notificaciones Push en Supabase
-- Ejecuta este script manualmente en el SQL Editor de tu proyecto Supabase: "hllsgkkgaetkqmobsqbt"

-- 1. Crear la tabla de suscripciones Push
DROP TABLE IF EXISTS public.push_subscriptions;
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(provider_id)
);

-- Habilitar Seguridad a Nivel de Filas (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Seguridad (RLS)
-- Permitir al usuario anónimo/autenticado insertar o actualizar su propia suscripción 
-- (asumiendo que confías en la verificación del dashboard o webhook, o en este caso PWA)
CREATE POLICY "Permitir inserción anonima" ON public.push_subscriptions
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permitir lectura anonima" ON public.push_subscriptions
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir actualización anonima" ON public.push_subscriptions
    FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Permitir eliminación anonima" ON public.push_subscriptions
    FOR DELETE TO anon, authenticated USING (true);

-- 3. Añadir columna a citas para rastrear notificaciones locales
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT FALSE;

-- 4. Crear el Webhook/Trigger que dispara la notificación cuando se inserta una cita
-- Reemplazaremos la URL de la función abajo una vez que se despliegue.
-- Por ahora creamos la función de postgres genérica.

CREATE OR REPLACE FUNCTION public.notify_new_appointment()
RETURNS trigger AS $$
BEGIN
  -- Hacemos una llamada HTTP hacia tu Edge Function (o webhook de n8n alternativamente).
  -- Como no tenemos la Edge function desplegada aún, por ahora esta función solo dejará log.
  
  -- NOTA PARA EL USUARIO: Aprobaste notificaciones.
  -- Usaremos Supabase Edge Functions para enviar la solicitud real de Push a Google/Apple.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger asociado a la tabla de appointments
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_appointment();
