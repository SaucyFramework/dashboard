import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { get, post } from '../api';
import { usePolling } from '../hooks/usePolling';
import { useNotifications } from '../hooks/useNotifications';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import {
    RefreshCw, Rocket, Loader2, Settings, ExternalLink,
    Search, X, AlertTriangle, Boxes, Skull,
    ArrowUpDown, ArrowUp, ArrowDown,
    ChevronLeft, ChevronRight,
} from 'lucide-react';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

export default function ShowAggregateProjection() {
    const { subscriptionId: rawSubscriptionId } = useParams();
    const subscriptionId = rawSubscriptionId;
    const encodedSubscriptionId = encodeURIComponent(subscriptionId);
    const { notify } = useNotifications();

    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortKey, setSortKey] = useState('aggregate_id');
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [showReplayAllConfirm, setShowReplayAllConfirm] = useState(false);
    const [showReplayInstanceConfirm, setShowReplayInstanceConfirm] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [instanceActionLoading, setInstanceActionLoading] = useState(new Set());
    const debounceRef = useRef(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(1);
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchInput]);

    const fetchInstances = useCallback(() => {
        const params = new URLSearchParams({
            sort: sortKey,
            dir: sortDir,
            page: String(page),
            per_page: '50',
        });
        if (debouncedSearch) params.set('search', debouncedSearch);
        return get(`/aggregate-projections/${encodedSubscriptionId}?${params}`);
    }, [encodedSubscriptionId, debouncedSearch, sortKey, sortDir, page]);

    const { data, loading, refetch } = usePolling(fetchInstances, 10000);

    const projectorClass = data?.projector_class;
    const projectorFilePath = data?.projector_file_path;
    const aggregateType = data?.aggregate_type;
    const instanceCount = data?.instance_count ?? 0;
    const poisonMessageCount = data?.poison_message_count ?? 0;
    const supportsReplay = data?.supports_replay ?? false;
    const config = data?.config;
    const instances = data?.instances || [];
    const pagination = data?.pagination;
    const async = data?.async ?? true;

    function handleSort(key) {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(1);
    }

    async function handleReplayAll() {
        setShowReplayAllConfirm(false);
        setActionLoading(true);
        try {
            const result = await post(`/aggregate-projections/${encodedSubscriptionId}/replay-all`);
            if (result.success) {
                notify(`Replay started: ${result.total_jobs} aggregate instances queued`);
            } else {
                notify(result.message || 'Failed to start replay');
            }
        } catch {
            notify('Failed to start replay');
        } finally {
            setActionLoading(false);
        }
    }

    async function handleTriggerAll() {
        setActionLoading(true);
        try {
            const result = await post(`/aggregate-projections/${encodedSubscriptionId}/trigger-all`);
            if (result.success) {
                notify(`Trigger started: ${result.total_jobs} aggregate instances queued`);
            } else {
                notify(result.message || 'Failed to trigger');
            }
        } catch {
            notify('Failed to trigger');
        } finally {
            setActionLoading(false);
        }
    }

    async function handleReplayInstance(aggregateId) {
        setShowReplayInstanceConfirm(null);
        setInstanceActionLoading(prev => new Set(prev).add(aggregateId));
        try {
            const result = await post(`/aggregate-projections/${encodedSubscriptionId}/instances/${aggregateId}/replay`);
            if (result.success) {
                notify(`Replay completed for ${aggregateId}`);
                refetch();
            } else {
                notify(result.message || 'Failed to replay instance');
            }
        } catch {
            notify('Failed to replay instance');
        } finally {
            setInstanceActionLoading(prev => {
                const next = new Set(prev);
                next.delete(aggregateId);
                return next;
            });
        }
    }

    async function handleTriggerInstance(aggregateId) {
        setInstanceActionLoading(prev => new Set(prev).add(aggregateId));
        try {
            const result = await post(`/aggregate-projections/${encodedSubscriptionId}/instances/${aggregateId}/trigger`);
            if (result.success) {
                notify(`Trigger started for ${aggregateId}`);
            } else {
                notify(result.message || 'Failed to trigger instance');
            }
        } catch {
            notify('Failed to trigger instance');
        } finally {
            setInstanceActionLoading(prev => {
                const next = new Set(prev);
                next.delete(aggregateId);
                return next;
            });
        }
    }

    return (
        <>
            <header>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                {subscriptionId.replace(/_/g, ' ')}
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
                            {supportsReplay && (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowReplayAllConfirm(true)}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                    )}
                                    Replay All
                                </Button>
                            )}
                            <Button onClick={handleTriggerAll} disabled={actionLoading}>
                                {actionLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Rocket className="h-4 w-4 mr-2" />
                                )}
                                Trigger All
                            </Button>
                        </div>
                    </div>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Aggregate Type</CardTitle>
                                <Boxes className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <code className="text-lg font-bold">{aggregateType || '-'}</code>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Instances</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{instanceCount.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">known aggregate instances</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Mode</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Badge variant={async ? 'info' : 'secondary'} className="text-sm">
                                    {async ? 'Async' : 'Sync'}
                                </Badge>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Config */}
                    {config && (
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-sm font-medium">Configuration</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 text-sm">
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
                                            Events are failing during processing. Failed aggregate streams are halted individually without affecting others.
                                        </p>
                                    </div>
                                    <Link to={`${basePath}/poison-messages?subscription=${encodedSubscriptionId}`}>
                                        <Button variant="destructive" size="sm">
                                            View Messages
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Instances */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Aggregate Instances</CardTitle>
                            <CardDescription>Individual aggregate streams for this projector</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Search */}
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by aggregate ID..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="pl-9 pr-9"
                                />
                                {searchInput && (
                                    <button
                                        onClick={() => setSearchInput('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {loading && !data ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading...
                                </div>
                            ) : instances.length === 0 ? (
                                <div className="text-sm text-muted-foreground py-8 text-center">
                                    {!search
                                        ? 'No aggregate instances found'
                                        : 'No instances match your search'
                                    }
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead
                                                className="cursor-pointer select-none hover:text-foreground transition-colors"
                                                onClick={() => handleSort('aggregate_id')}
                                            >
                                                <span className="inline-flex items-center">
                                                    Aggregate ID
                                                    {sortKey === 'aggregate_id'
                                                        ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />)
                                                        : <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
                                                    }
                                                </span>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer select-none hover:text-foreground transition-colors"
                                                onClick={() => handleSort('lag')}
                                            >
                                                <span className="inline-flex items-center">
                                                    Progress
                                                    {sortKey === 'lag'
                                                        ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />)
                                                        : <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
                                                    }
                                                </span>
                                            </TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {instances.map((instance) => {
                                            const isLoading = instanceActionLoading.has(instance.aggregate_id);
                                            const behind = instance.max_position - instance.position;
                                            const pct = instance.max_position > 0 ? Math.round((instance.position / instance.max_position) * 100) : 100;
                                            return (
                                                <TableRow key={instance.aggregate_id}>
                                                    <TableCell>
                                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                            {instance.aggregate_id}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={pct} className="w-16" />
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                {instance.position} / {instance.max_position}
                                                            </span>
                                                            {behind > 0 && (
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    {behind} behind
                                                                </Badge>
                                                            )}
                                                            {behind === 0 && instance.max_position > 0 && (
                                                                <Badge variant="success" className="text-[10px]">
                                                                    up to date
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {supportsReplay && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    disabled={isLoading}
                                                                    onClick={() => setShowReplayInstanceConfirm(instance.aggregate_id)}
                                                                >
                                                                    {isLoading ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                                    )}
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={isLoading}
                                                                onClick={() => handleTriggerInstance(instance.aggregate_id)}
                                                            >
                                                                <Rocket className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}

                            {pagination && (
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-muted-foreground">
                                        {instanceCount} instance{instanceCount !== 1 ? 's' : ''}
                                        {pagination.last_page > 1 && ` — page ${pagination.page} of ${pagination.last_page}`}
                                    </div>
                                    {pagination.last_page > 1 && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={pagination.page <= 1}
                                                onClick={() => setPage(p => p - 1)}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={pagination.page >= pagination.last_page}
                                                onClick={() => setPage(p => p + 1)}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Replay All Confirmation */}
            <Dialog open={showReplayAllConfirm} onClose={() => setShowReplayAllConfirm(false)}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Replay All Instances
                    </DialogTitle>
                    <DialogDescription>
                        This will reset the entire projection and replay all {instanceCount.toLocaleString()} aggregate instances from the beginning. Each instance will be processed as a separate queued job.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowReplayAllConfirm(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleReplayAll} disabled={actionLoading}>
                        {actionLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Replay All ({instanceCount.toLocaleString()})
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* Replay Instance Confirmation */}
            <Dialog open={showReplayInstanceConfirm !== null} onClose={() => setShowReplayInstanceConfirm(null)}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-blue-500" />
                        Replay Aggregate Instance
                    </DialogTitle>
                    <DialogDescription>
                        This will reset and replay the projection for aggregate <code className="text-xs bg-muted px-1 py-0.5 rounded">{showReplayInstanceConfirm}</code>. This runs instantly.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowReplayInstanceConfirm(null)}>
                        Cancel
                    </Button>
                    <Button onClick={() => handleReplayInstance(showReplayInstanceConfirm)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Replay
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
}
