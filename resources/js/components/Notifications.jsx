import { CheckCircle, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export default function Notifications() {
    const { notifications, dismiss } = useNotifications();

    return (
        <div className="z-50 fixed inset-0 flex flex-col items-end justify-start px-4 py-6 pointer-events-none sm:p-6 space-y-4">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className="max-w-sm w-full pointer-events-auto rounded-lg border bg-card p-4 shadow-lg animate-in slide-in-from-top-2 fade-in duration-300"
                >
                    <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-card-foreground flex-1">{n.message}</p>
                        <button
                            onClick={() => dismiss(n.id)}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
