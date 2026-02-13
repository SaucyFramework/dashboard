import { useNotifications } from '../hooks/useNotifications';

export default function Notifications() {
    const { notifications, dismiss } = useNotifications();

    return (
        <div className="z-50 fixed inset-0 flex flex-col items-end justify-start px-4 py-6 pointer-events-none sm:p-6 space-y-4">
            {notifications.map((n) => (
                <div key={n.id} className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto">
                    <div className="rounded-lg shadow-lg overflow-hidden">
                        <div className="p-4">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-3 w-0 flex-1 pt-0.5">
                                    <p className="text-sm leading-5 font-medium text-gray-900">{n.message}</p>
                                </div>
                                <div className="ml-4 flex-shrink-0 flex">
                                    <button onClick={() => dismiss(n.id)} className="inline-flex text-gray-400 focus:outline-none focus:text-gray-500">
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
