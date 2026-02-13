import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projections from './pages/Projections';
import ShowProjection from './pages/ShowProjection';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

function ProtectedRoute({ children }) {
    const { authenticated, passwordRequired, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-full bg-slate-50 flex items-center justify-center">
                <p className="text-sm text-gray-500">Loading...</p>
            </div>
        );
    }

    if (passwordRequired && !authenticated) {
        return <Login />;
    }

    return children;
}

export default function App() {
    return (
        <Routes>
            <Route
                path={basePath}
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="projections" element={<Projections />} />
                <Route path="projections/:streamId" element={<ShowProjection />} />
            </Route>
            <Route path="*" element={<Navigate to={basePath} replace />} />
        </Routes>
    );
}
