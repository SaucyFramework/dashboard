import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { NotificationProvider } from '../hooks/useNotifications';
import Notifications from './Notifications';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

function navLinkClass({ isActive }) {
    return isActive
        ? 'inline-flex items-center border-b-2 border-indigo-500 px-1 pt-1 text-sm font-medium text-gray-900'
        : 'inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700';
}

export default function Layout() {
    const { logout, passwordRequired } = useAuth();

    return (
        <NotificationProvider>
            <div className="min-h-full bg-slate-50">
                <nav className="border-b border-gray-200 bg-white">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 justify-between">
                            <div className="flex">
                                <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                                    <NavLink to={basePath} end className={navLinkClass}>
                                        Dashboard
                                    </NavLink>
                                    <NavLink to={`${basePath}/projections`} className={navLinkClass}>
                                        Projections
                                    </NavLink>
                                </div>
                            </div>
                            {passwordRequired && (
                                <div className="hidden sm:ml-6 sm:flex sm:items-center">
                                    <button
                                        onClick={logout}
                                        className="text-sm font-medium text-gray-500 hover:text-gray-700"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </nav>
                <div className="py-10">
                    <Outlet />
                </div>
            </div>
            <Notifications />
        </NotificationProvider>
    );
}
