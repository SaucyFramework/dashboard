import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { NotificationProvider } from '../hooks/useNotifications';
import { usePolling } from '../hooks/usePolling';
import { get } from '../api';
import Notifications from './Notifications';
import { Button } from './ui/button';
import { Tooltip } from './ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';
import {
    LayoutDashboard,
    Layers,
    AlertTriangle,
    LogOut,
    Sun,
    Moon,
    Monitor,
    PanelLeftClose,
    PanelLeft,
    ChevronDown,
    Flame,
    ScrollText,
} from 'lucide-react';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

const navItems = [
    { to: basePath, end: true, icon: LayoutDashboard, label: 'Dashboard' },
    { to: `${basePath}/projections`, icon: Layers, label: 'Projections' },
    { to: `${basePath}/events`, icon: ScrollText, label: 'Event Store' },
    { to: `${basePath}/poison-messages`, icon: AlertTriangle, label: 'Poison Messages', badgeKey: 'poison' },
];

function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();

    const items = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ];

    return (
        <DropdownMenu>
            {({ open, setOpen }) => (
                <>
                    <DropdownMenuTrigger
                        onClick={() => setOpen(!open)}
                        className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                            'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                    >
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent open={open} align="start" className="bottom-full mb-1">
                        {items.map(item => (
                            <DropdownMenuItem
                                key={item.value}
                                onClick={() => { setTheme(item.value); setOpen(false); }}
                                className={cn(theme === item.value && 'bg-accent')}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </>
            )}
        </DropdownMenu>
    );
}

export default function Layout() {
    const { logout, passwordRequired } = useAuth();
    const { data: statsData } = usePolling(() => get('/stats'), 10000);
    const poisonCount = statsData?.poison_messages?.poisoned ?? 0;
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem('saucy-sidebar-collapsed') === 'true';
        } catch { return false; }
    });

    function toggleCollapsed() {
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem('saucy-sidebar-collapsed', String(next)); } catch {}
    }

    const badges = { poison: poisonCount };

    return (
        <NotificationProvider>
            <div className="flex h-screen bg-background overflow-hidden">
                {/* Sidebar */}
                <aside className={cn(
                    'flex flex-col border-r bg-sidebar transition-all duration-200 ease-in-out shrink-0',
                    collapsed ? 'w-16' : 'w-56',
                )}>
                    {/* Sidebar Header */}
                    <div className={cn(
                        'flex h-14 items-center border-b border-sidebar-border px-3',
                        collapsed ? 'justify-center' : 'gap-2',
                    )}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                            <Flame className="h-4 w-4" />
                        </div>
                        {!collapsed && (
                            <span className="text-sm font-semibold text-sidebar-foreground">Saucy</span>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 p-2">
                        {navItems.map(item => {
                            const Icon = item.icon;
                            const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;

                            const link = (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    className={({ isActive }) =>
                                        cn(
                                            'group flex items-center rounded-md text-sm font-medium transition-colors',
                                            collapsed ? 'justify-center h-10 w-full' : 'gap-3 px-3 py-2',
                                            isActive
                                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                        )
                                    }
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {!collapsed && (
                                        <>
                                            <span className="flex-1">{item.label}</span>
                                            {badgeCount > 0 && (
                                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                                                    {badgeCount}
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {collapsed && badgeCount > 0 && (
                                        <span className="absolute right-1 top-0.5 h-2 w-2 rounded-full bg-destructive" />
                                    )}
                                </NavLink>
                            );

                            if (collapsed) {
                                return (
                                    <Tooltip key={item.to} content={item.label} side="right">
                                        <div className="relative w-full">{link}</div>
                                    </Tooltip>
                                );
                            }
                            return link;
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className={cn(
                        'border-t border-sidebar-border p-2',
                        collapsed ? 'flex flex-col items-center gap-1' : 'space-y-1',
                    )}>
                        <ThemeSwitcher />

                        <button
                            onClick={toggleCollapsed}
                            className={cn(
                                'flex items-center rounded-md text-sm font-medium transition-colors',
                                'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                collapsed ? 'h-8 w-8 justify-center' : 'gap-3 px-3 py-2 w-full',
                            )}
                        >
                            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                            {!collapsed && <span>Collapse</span>}
                        </button>

                        {passwordRequired && (
                            <button
                                onClick={logout}
                                className={cn(
                                    'flex items-center rounded-md text-sm font-medium transition-colors',
                                    'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                    collapsed ? 'h-8 w-8 justify-center' : 'gap-3 px-3 py-2 w-full',
                                )}
                            >
                                <LogOut className="h-4 w-4" />
                                {!collapsed && <span>Logout</span>}
                            </button>
                        )}
                    </div>
                </aside>

                {/* Main content */}
                <div className="flex-1 overflow-auto min-h-0">
                    <div className="py-8">
                        <Outlet />
                    </div>
                </div>
            </div>
            <Notifications />
        </NotificationProvider>
    );
}
