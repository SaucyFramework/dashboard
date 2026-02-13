import { useNavigate } from 'react-router-dom';
import { get } from '../api';
import { usePolling } from '../hooks/usePolling';
import StatusIndicator from '../components/StatusIndicator';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

export default function Projections() {
    const navigate = useNavigate();
    const { data, loading } = usePolling(() => get('/projections'), 2000);

    const projections = data?.projections || [];

    return (
        <>
            <header>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">Projections</h1>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <div className="px-4 py-5 sm:p-6">
                            <div className="px-4 sm:px-6 lg:px-8">
                                <div className="sm:flex sm:items-center">
                                    <div className="sm:flex-auto">
                                        <h1 className="text-base font-semibold leading-6 text-gray-900">Projections</h1>
                                        <p className="mt-2 text-sm text-gray-700"></p>
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
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Stream</th>
                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Position</th>
                                                            <th scope="col" className="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {projections.map((p) => (
                                                            <tr
                                                                key={p.stream_id}
                                                                onClick={() => navigate(`${basePath}/projections/${p.stream_id}`)}
                                                                className="cursor-pointer hover:bg-gray-50"
                                                            >
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{p.stream_id}</td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{p.position}</td>
                                                                <td className="py-4 pl-0 pr-4 text-sm leading-6 sm:pr-8 lg:pr-20">
                                                                    {p.has_process ? (
                                                                        p.paused ? (
                                                                            <StatusIndicator color="orange" label={p.paused_reason} />
                                                                        ) : (
                                                                            <StatusIndicator color="green" label={p.status} />
                                                                        )
                                                                    ) : (
                                                                        <StatusIndicator color="blue" label="standby" />
                                                                    )}
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
