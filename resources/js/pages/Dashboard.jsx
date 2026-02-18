import { Link } from 'react-router-dom';
import { get } from '../api';
import { usePolling } from '../hooks/usePolling';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ChartContainer, ChartTooltipContent, getChartColor } from '../components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { Layers, Database, Play, Pause, AlertTriangle, Skull, Loader2 } from 'lucide-react';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

function formatHour(value) {
    if (!value) return '';
    const d = new Date(value.replace(' ', 'T'));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatShortType(type) {
    if (!type) return '';
    const parts = type.split(/[._-]/);
    return parts[parts.length - 1] || type;
}

export default function Dashboard() {
    const { data: stats } = usePolling(() => get('/stats'), 5000);
    const { data: throughputData, loading: throughputLoading } = usePolling(() => get('/analytics/throughput?hours=24'), 30000);
    const { data: eventTypesData, loading: eventTypesLoading } = usePolling(() => get('/analytics/event-types?days=7'), 60000);

    const throughput = throughputData?.throughput || [];
    const eventTypes = eventTypesData?.event_types || [];
    const totalEventTypesCount = eventTypes.reduce((sum, e) => sum + e.count, 0);

    return (
        <>
            <header>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Poison Messages Banner */}
                    {(stats?.poison_messages?.poisoned ?? 0) > 0 && (
                        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-destructive">
                                    {stats.poison_messages.poisoned} unresolved poison message{stats.poison_messages.poisoned !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-destructive/80">Events are failing during projection processing</p>
                            </div>
                            <Link to={`${basePath}/poison-messages`}>
                                <Button variant="destructive" size="sm">View Messages</Button>
                            </Link>
                        </div>
                    )}

                    {/* Stat Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                                <Database className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats?.total_events?.toLocaleString() ?? '-'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Running</CardTitle>
                                <Play className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{stats?.projections?.running ?? '-'}</div>
                                <p className="text-xs text-muted-foreground">of {stats?.projections?.total ?? '-'} projections</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Paused</CardTitle>
                                <Pause className="h-4 w-4 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600">{stats?.projections?.paused ?? '-'}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Behind</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats?.projections?.behind ?? '-'}</div>
                                <p className="text-xs text-muted-foreground">not caught up</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Poison Messages</CardTitle>
                                <Skull className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${(stats?.poison_messages?.poisoned ?? 0) > 0 ? 'text-destructive' : ''}`}>
                                    {stats?.poison_messages?.poisoned ?? '-'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {stats?.poison_messages?.resolved ?? 0} resolved, {stats?.poison_messages?.skipped ?? 0} skipped
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row */}
                    <div className="grid gap-6 md:grid-cols-2 mb-6">
                        {/* Event Throughput Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Event Throughput</CardTitle>
                                <CardDescription>Events per hour over the last 24 hours</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {throughputLoading && !throughputData ? (
                                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Loading...
                                    </div>
                                ) : throughput.length === 0 ? (
                                    <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                                        No events in the last 24 hours
                                    </div>
                                ) : (
                                    <ChartContainer className="h-[250px]">
                                        <AreaChart data={throughput} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis
                                                dataKey="hour"
                                                tickFormatter={formatHour}
                                                tick={{ fontSize: 11 }}
                                                className="text-muted-foreground"
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11 }}
                                                className="text-muted-foreground"
                                                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                                            />
                                            <Tooltip content={<ChartTooltipContent labelFormatter={formatHour} />} />
                                            <Area
                                                type="monotone"
                                                dataKey="count"
                                                name="Events"
                                                stroke="hsl(var(--primary))"
                                                fill="url(#throughputGradient)"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Event Type Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Event Types</CardTitle>
                                <CardDescription>Distribution over the last 7 days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {eventTypesLoading && !eventTypesData ? (
                                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Loading...
                                    </div>
                                ) : eventTypes.length === 0 ? (
                                    <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                                        No event data available
                                    </div>
                                ) : (
                                    <div className="flex h-[250px]">
                                        <div className="w-1/2">
                                            <ChartContainer className="h-full">
                                                <PieChart>
                                                    <Pie
                                                        data={eventTypes.slice(0, 8)}
                                                        dataKey="count"
                                                        nameKey="type"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={40}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                    >
                                                        {eventTypes.slice(0, 8).map((_, i) => (
                                                            <Cell key={i} fill={getChartColor(i)} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<ChartTooltipContent
                                                        labelFormatter={formatShortType}
                                                        valueFormatter={v => `${v.toLocaleString()} (${totalEventTypesCount > 0 ? Math.round(v / totalEventTypesCount * 100) : 0}%)`}
                                                    />} />
                                                </PieChart>
                                            </ChartContainer>
                                        </div>
                                        <div className="w-1/2 flex flex-col justify-center gap-1.5 pl-2 overflow-y-auto">
                                            {eventTypes.slice(0, 8).map((e, i) => (
                                                <div key={e.type} className="flex items-center gap-2 text-xs">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: getChartColor(i) }}
                                                    />
                                                    <span className="text-muted-foreground truncate flex-1" title={e.type}>
                                                        {formatShortType(e.type)}
                                                    </span>
                                                    <span className="font-medium tabular-nums">{e.count.toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {eventTypes.length > 8 && (
                                                <div className="text-xs text-muted-foreground">
                                                    +{eventTypes.length - 8} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Quick Actions</CardTitle>
                            <CardDescription>Monitor your event sourcing projections</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link to={`${basePath}/projections`}>
                                <Button variant="outline">
                                    <Layers className="h-4 w-4 mr-2" />
                                    View Projections
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
