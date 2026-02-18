import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projections from './pages/Projections';
import ShowProjection from './pages/ShowProjection';
import PoisonMessages from './pages/PoisonMessages';
import ShowPoisonMessage from './pages/ShowPoisonMessage';
import EventStore from './pages/EventStore';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

function ProtectedRoute({ children }) {
    const { authenticated, passwordRequired, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-full bg-background flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
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
        <ThemeProvider>
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
                    <Route path="events" element={<EventStore />} />
                    <Route path="poison-messages" element={<PoisonMessages />} />
                    <Route path="poison-messages/:id" element={<ShowPoisonMessage />} />
                </Route>
                <Route path="*" element={<Navigate to={basePath} replace />} />
            </Routes>
        </ThemeProvider>
    );
}
