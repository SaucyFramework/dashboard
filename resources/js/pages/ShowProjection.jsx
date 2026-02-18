import { useParams, Link } from 'react-router-dom';
import { get, post } from '../api';
import { usePolling } from '../hooks/usePolling';
import { useNotifications } from '../hooks/useNotifications';
import ActivityExtra from '../components/ActivityExtra';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { ChartContainer, ChartTooltipContent, getChartColor } from '../components/ui/chart';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Play, Pause, RefreshCw, Rocket, Loader2, Settings, Skull, TrendingUp, Timer, ExternalLink } from 'lucide-react';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

const activityTypeBadge = {
    store_checkpoint: 'secondary',
    loading_events: 'info',
    loaded_events: 'info',
    queue_timeout: 'warning',
    started_poll: 'secondary',
    prepare_replay: 'default',
    handled_message: 'secondary',
    error: 'destructive',
    poison_message: 'destructive',
};

function formatTime(value) {
    if (!value) return '';
    const d = new Date(value.replace(' ', 'T'));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatShortType(type) {
    if (!type) return '';
    const parts = type.split(/[._-]/);
    return parts[parts.length - 1] || type;
}

export default function ShowProjection() {
    const { streamId } = useParams();
    const { notify } = useNotifications();
    const { data, loading } = usePolling(() => get(`/projections/${streamId}`), 1000);
    const { data: snapshotData } = usePolling(() => get(`/snapshots/${streamId}?hours=24`), 15000);
    const { data: speedData } = usePolling(() => get(`/analytics/processing-speed?stream_id=${streamId}&hours=24`), 15000);

    const paused = data?.paused ?? false;
    const activity = data?.activity || [];
    const position = data?.position ?? 0;
    const maxPosition = data?.max_position ?? 0;
    const config = data?.config;
    const process = data?.process;
    const poisonMessageCount = data?.poison_message_count ?? 0;
    const projectorClass = data?.projector_class;
    const projectorFilePath = data?.projector_file_path;
    const progressPct = maxPosition > 0 ? Math.round((position / maxPosition) * 100) : 0;
    const behind = maxPosition - position;

    const snapshots = snapshotData?.snapshots || [];
    const lagData = snapshots.map(s => ({
        time: s.recorded_at,
        position: s.position,
        max_position: s.max_position,
        lag: s.max_position - s.position,
        pct: s.max_position > 0 ? Math.round((s.position / s.max_position) * 100) : 100,
    }));

    const processingSpeed = speedData?.processing_speed || [];
    // Aggregate per-type processing times across all entries
    const typeSpeedMap = {};
    processingSpeed.forEach(entry => {
        if (!entry.per_type) return;
        Object.entries(entry.per_type).forEach(([type, metrics]) => {
            if (!typeSpeedMap[type]) {
                typeSpeedMap[type] = { count: 0, total_time: 0, max_time: 0 };
            }
            typeSpeedMap[type].count += metrics.count || 0;
            typeSpeedMap[type].total_time += metrics.total_time || 0;
            typeSpeedMap[type].max_time = Math.max(typeSpeedMap[type].max_time, metrics.max_time || 0);
        });
    });
    const typeSpeedData = Object.entries(typeSpeedMap)
        .map(([type, m]) => ({
            type: formatShortType(type),
            full_type: type,
            avg_ms: m.count > 0 ? Math.round((m.total_time / m.count) * 1000 * 100) / 100 : 0,
            max_ms: Math.round(m.max_time * 1000 * 100) / 100,
            count: m.count,
        }))
        .sort((a, b) => b.avg_ms - a.avg_ms)
        .slice(0, 10);

    const speedTimeline = processingSpeed.map(e => ({
        time: e.occurred_at,
        eps: e.events_per_second,
        avg_ms: e.avg_time_ms,
    }));

    async function handleAction(action, message) {
        await post(`/projections/${streamId}/${action}`);
        notify(message);
    }

    return (
        <>
            <header>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                {streamId.replace(/_/g, ' ')}
                            </h1>
                            {projectorClass && (
                                <div className="mt-1 flex items-center gap-1.5">
                                    {projectorFilePath ? (
                                        <a
                                            href={`phpstorm://open?file=${encodeURIComponent(projectorFilePath)}&line=1`}
                                            className="text-sm font-mono text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                                        >
                                            {projectorClass}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    ) : (
                                        <span className="text-sm font-mono text-muted-foreground">{projectorClass}</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {paused ? (
                                <Button variant="outline" onClick={() => handleAction('resume', 'Projection resumed')}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Resume
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={() => handleAction('pause', 'Projection paused')}>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pause
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => handleAction('replay', 'Projection replay started')}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Replay
                            </Button>
                            <Button onClick={() => handleAction('trigger', 'Process started')}>
                                <Rocket className="h-4 w-4 mr-2" />
                                Trigger
                            </Button>
                        </div>
                    </div>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
                    {/* Progress & Process Info */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Progress</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Progress value={progressPct} className="h-3" />
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {position.toLocaleString()} / {maxPosition.toLocaleString()} events
                                    </span>
                                    {behind === 0 ? (
                                        <Badge variant="success">up to date</Badge>
                                    ) : (
                                        <span className="text-muted-foreground">{behind.toLocaleString()} behind</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Process</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {process ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Status</span>
                                            <Badge variant={paused ? 'warning' : 'success'}>{process.status || 'active'}</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Process ID</span>
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{process.process_id?.slice(0, 12)}</code>
                                        </div>
                                        {process.expires_at && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Expires at</span>
                                                <span className="text-xs">{process.expires_at}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No active process</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Projection Lag Over Time */}
                    {lagData.length > 1 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-base">Position History</CardTitle>
                                </div>
                                <CardDescription>Projection position vs max events over the last 24 hours</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer className="h-[250px]">
                                    <AreaChart data={lagData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="posGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                                                <stop offset="100%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="maxGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis
                                            dataKey="time"
                                            tickFormatter={formatTime}
                                            tick={{ fontSize: 11 }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                                        />
                                        <Tooltip content={<ChartTooltipContent
                                            labelFormatter={formatTime}
                                            valueFormatter={v => v.toLocaleString()}
                                        />} />
                                        <Area
                                            type="monotone"
                                            dataKey="max_position"
                                            name="Max Events"
                                            stroke="hsl(var(--primary))"
                                            fill="url(#maxGradient)"
                                            strokeWidth={1}
                                            strokeDasharray="4 4"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="position"
                                            name="Position"
                                            stroke="hsl(160, 60%, 45%)"
                                            fill="url(#posGradient)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Processing Speed Charts */}
                    {(speedTimeline.length > 1 || typeSpeedData.length > 0) && (
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Events per second over time */}
                            {speedTimeline.length > 1 && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <Timer className="h-4 w-4 text-muted-foreground" />
                                            <CardTitle className="text-base">Processing Speed</CardTitle>
                                        </div>
                                        <CardDescription>Events per second over time</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer className="h-[200px]">
                                            <LineChart data={speedTimeline} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                                <XAxis
                                                    dataKey="time"
                                                    tickFormatter={formatTime}
                                                    tick={{ fontSize: 11 }}
                                                    interval="preserveStartEnd"
                                                />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <Tooltip content={<ChartTooltipContent
                                                    labelFormatter={formatTime}
                                                    valueFormatter={v => `${v.toLocaleString()} e/s`}
                                                />} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="eps"
                                                    name="Events/sec"
                                                    stroke="hsl(var(--primary))"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Avg processing time per event type */}
                            {typeSpeedData.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Handler Performance</CardTitle>
                                        <CardDescription>Average processing time per event type (ms)</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer className="h-[200px]">
                                            <BarChart data={typeSpeedData} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                                                <XAxis type="number" tick={{ fontSize: 11 }} unit="ms" />
                                                <YAxis
                                                    type="category"
                                                    dataKey="type"
                                                    tick={{ fontSize: 10 }}
                                                    width={100}
                                                />
                                                <Tooltip content={<ChartTooltipContent
                                                    valueFormatter={v => `${v}ms`}
                                                />} />
                                                <Bar dataKey="avg_ms" name="Avg" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                                                    {typeSpeedData.map((_, i) => (
                                                        <Cell key={i} fill={getChartColor(i)} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Stream Config */}
                    {config && (
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-sm font-medium">Configuration</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block">Page size</span>
                                        <span className="font-medium">{config.page_size}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Commit batch</span>
                                        <span className="font-medium">{config.commit_batch_size}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Queue</span>
                                        <span className="font-medium">{config.queue || 'default'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Event types</span>
                                        <span className="font-medium">{Array.isArray(config.event_types) ? config.event_types.length : 'all'}</span>
                                    </div>
                                </div>
                                {Array.isArray(config.event_types) && config.event_types.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {config.event_types.map((t) => (
                                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Poison Messages Warning */}
                    {poisonMessageCount > 0 && (
                        <Card className="border-destructive/50">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Skull className="h-5 w-5 text-destructive flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-destructive">
                                            {poisonMessageCount} poison message{poisonMessageCount !== 1 ? 's' : ''}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Events are failing during processing for this projection
                                        </p>
                                    </div>
                                    <Link to={`${basePath}/poison-messages?subscription=${streamId}`}>
                                        <Button variant="destructive" size="sm">
                                            View Messages
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Activity Log */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading && !data ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading...
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Message</TableHead>
                                            <TableHead>Occurred at</TableHead>
                                            <TableHead>Extra</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activity.map((a, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <Badge variant={activityTypeBadge[a.type] || 'secondary'} className="text-[10px]">
                                                        {a.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{a.message}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{a.occurred_at}</TableCell>
                                                <TableCell className="text-xs">
                                                    <ActivityExtra type={a.type} data={a.data} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
