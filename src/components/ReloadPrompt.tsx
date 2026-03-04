import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export const ReloadPrompt = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            console.log('SW Registered:', r);
        },
        onRegisterError(error: Error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) {
        return null;
    }

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-sm">
            <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-2xl animate-fade-in-down">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        {needRefresh ? (
                            <RefreshCw className="w-6 h-6 text-primary-600 animate-spin-slow" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">
                            {needRefresh ? '¡Nueva versión disponible!' : 'App lista'}
                        </span>
                        <span className="text-xs text-slate-500">
                            {needRefresh
                                ? 'Haz clic en recargar para aplicar los cambios.'
                                : 'La app puede funcionar sin conexión.'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {needRefresh && (
                        <button
                            onClick={() => updateServiceWorker({ pwaRegister: true })}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                        >
                            Recargar
                        </button>
                    )}
                    <button
                        onClick={() => close()}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
