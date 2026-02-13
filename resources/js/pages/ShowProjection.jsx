import { useParams } from 'react-router-dom';
import { get, post } from '../api';
import { usePolling } from '../hooks/usePolling';
import { useNotifications } from '../hooks/useNotifications';
import ActivityExtra from '../components/ActivityExtra';

export default function ShowProjection() {
    const { streamId } = useParams();
    const { notify } = useNotifications();
    const { data, loading } = usePolling(() => get(`/projections/${streamId}`), 1000);

    const paused = data?.paused ?? false;
    const activity = data?.activity || [];

    async function handleAction(action, message) {
        await post(`/projections/${streamId}/${action}`);
        notify(message);
    }

    return (
        <>
            <header>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-between">
                    <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
                        {streamId.replace(/_/g, ' ')}
                    </h1>
                    <div className="mt-5 flex lg:ml-4 lg:mt-0">
                        {paused ? (
                            <span className="ml-3 hidden sm:block">
                                <button
                                    onClick={() => handleAction('resume', 'Projection resumed')}
                                    type="button"
                                    className="inline-flex items-center rounded-md bg-orange-600/10 px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-800/20"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="-ml-0.5 mr-1.5 h-5 w-5">
                                        <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                                    </svg>
                                    Resume
                                </button>
                            </span>
                        ) : (
                            <span className="ml-3 hidden sm:block">
                                <button
                                    onClick={() => handleAction('pause', 'Projection paused')}
                                    type="button"
                                    className="inline-flex items-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-800/20"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="-ml-0.5 mr-1.5 h-5 w-5">
                                        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                                    </svg>
                                    Pause
                                </button>
                            </span>
                        )}
                        <span className="ml-3 hidden sm:block">
                            <button
                                onClick={() => handleAction('replay', 'Projection replay started')}
                                type="button"
                                className="inline-flex items-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-800/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="-ml-0.5 mr-1.5 h-5 w-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
                                </svg>
                                Replay
                            </button>
                        </span>
                        <span className="sm:ml-3">
                            <button
                                onClick={() => handleAction('trigger', 'Process started')}
                                type="button"
                                className="inline-flex items-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="-ml-0.5 mr-1.5 h-5 w-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                                </svg>
                                Trigger
                            </button>
                        </span>
                    </div>
                </div>
            </header>
            <main>
                <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <div className="px-4 py-5 sm:p-6">
                            <div className="px-4 sm:px-6 lg:px-8">
                                <div className="sm:flex sm:items-center">
                                    <div className="sm:flex-auto">
                                        <h1 className="text-base font-semibold leading-6 text-gray-900">Activity</h1>
                                    </div>
                                </div>
                                <div className="mt-8 flow-root">
                                    <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                            {loading && !data ? (
                                                <p className="text-sm text-gray-500">Loading...</p>
                                            ) : (
                                                <table className="min-w-full divide-y divide-gray-300">
                                                    <thead>
                                                        <tr>
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Type</th>
                                                            <th scope="col" className="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20">Message</th>
                                                            <th scope="col" className="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20">Occurred at</th>
                                                            <th scope="col" className="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20">Extra</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {activity.map((a, i) => (
                                                            <tr key={i}>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">{a.type}</td>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">{a.message}</td>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">{a.occurred_at}</td>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">
                                                                    <ActivityExtra type={a.type} data={a.data} />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
