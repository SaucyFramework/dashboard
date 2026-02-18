import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../api';
import { usePolling } from '../hooks/usePolling';
import { useNotifications } from '../hooks/useNotifications';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Loader2, Search, X, RotateCcw, SkipForward, AlertTriangle, CheckCircle2 } from 'lucide-react';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

const STATUS_FILTERS = [
    { key: 'poisoned', label: 'Poisoned' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'skipped', label: 'Skipped' },
    { key: 'all', label: 'All' },
];

const statusBadgeVariant = {
    poisoned: 'destructive',
    resolved: 'success',
    skipped: 'secondary',
};

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(' ', 'T') + 'Z');
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function PoisonMessages() {
    const navigate = useNavigate();
    const { notify } = useNotifications();

    const [statusFilter, setStatusFilter] = useState('poisoned');
    const [search, setSearch] = useState('');
    const [subscriptionFilter, setSubscriptionFilter] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [showBulkRetryConfirm, setShowBulkRetryConfirm] = useState(false);
    const [showBulkSkipConfirm, setShowBulkSkipConfirm] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(new Set());

    const queryParams = new URLSearchParams();
    queryParams.set('status', statusFilter);
    if (subscriptionFilter) queryParams.set('subscription', subscriptionFilter);

    const { data, loading } = usePolling(() => get(`/poison-messages?${queryParams.toString()}`), 3000);

    const messages = data?.poison_messages || [];
    const counts = data?.counts || {};

    const subscriptions = useMemo(() => {
        const subs = new Set(messages.map(m => m.subscription_id));
        return [...subs].sort();
    }, [messages]);

    const filtered = useMemo(() => {
        if (!search) return messages;
        const q = search.toLowerCase();
        return messages.filter(m =>
            m.stream_name.toLowerCase().includes(q) ||
            m.error_message.toLowerCase().includes(q) ||
            m.subscription_id.toLowerCase().includes(q)
        );
    }, [messages, search]);

    const visibleSelected = useMemo(() => {
        const ids = new Set(filtered.map(m => m.id));
        const s = new Set();
        for (const id of selected) {
            if (ids.has(id)) s.add(id);
        }
        return s;
    }, [selected, filtered]);

    const allVisibleSelected = filtered.length > 0 && visibleSelected.size === filtered.length;
    const someVisibleSelected = visibleSelected.size > 0 && !allVisibleSelected;

    function toggleSelectAll() {
        if (allVisibleSelected) {
            setSelected(prev => {
                const next = new Set(prev);
                for (const m of filtered) next.delete(m.id);
                return next;
            });
        } else {
            setSelected(prev => {
                const next = new Set(prev);
                for (const m of filtered) next.add(m.id);
                return next;
            });
        }
    }

    function toggleSelect(id) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleRetry(id) {
        setActionLoading(prev => new Set(prev).add(id));
        try {
            const result = await post(`/poison-messages/${id}/retry`);
            notify(result.message);
        } catch {
            notify('Retry failed');
        } finally {
            setActionLoading(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }

    async function handleSkip(id) {
        setActionLoading(prev => new Set(prev).add(id));
        try {
            const result = await post(`/poison-messages/${id}/skip`);
            notify(result.message);
        } catch {
            notify('Skip failed');
        } finally {
            setActionLoading(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }

    async function handleBulkAction(action) {
        const ids = [...visibleSelected];
        setBulkLoading(true);
        setShowBulkRetryConfirm(false);
        setShowBulkSkipConfirm(false);
        try {
            const result = await post(`/poison-messages/bulk-${action}`, { ids });
            const results = result.results || {};
            const successes = Object.values(results).filter(r => r.success).length;
            const failures = Object.values(results).filter(r => !r.success).length;
            if (failures === 0) {
                notify(`${action === 'retry' ? 'Retried' : 'Skipped'} ${successes} message${successes !== 1 ? 's' : ''}`);
            } else {
                notify(`${successes} succeeded, ${failures} failed`);
            }
            setSelected(new Set());
        } catch {
            notify('Bulk action failed');
        } finally {
            setBulkLoading(false);
        }
    }

    const showCheckboxes = statusFilter === 'poisoned';

    return (
        <>
            <header>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Poison Messages</h1>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Poison Messages</CardTitle>
                            <CardDescription>Events that failed during projection processing</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by stream, error, or subscription..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9 pr-9"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    {STATUS_FILTERS.map(f => (
                                        <Button
                                            key={f.key}
                                            variant={statusFilter === f.key ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => { setStatusFilter(f.key); setSelected(new Set()); }}
                                            className="text-xs h-8"
                                        >
                                            {f.label}
                                            {f.key !== 'all' && counts[f.key] !== undefined && (
                                                <span className="ml-1 opacity-70">{counts[f.key]}</span>
                                            )}
                                        </Button>
                                    ))}
                                </div>
                                {subscriptions.length > 1 && (
                                    <select
                                        value={subscriptionFilter}
                                        onChange={(e) => setSubscriptionFilter(e.target.value)}
                                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                    >
                                        <option value="">All subscriptions</option>
                                        {subscriptions.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Bulk Actions */}
                            {showCheckboxes && visibleSelected.size > 0 && (
                                <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
                                    <span className="text-sm font-medium">{visibleSelected.size} selected</span>
                                    <div className="flex items-center gap-2 ml-auto">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={bulkLoading}
                                            onClick={() => setShowBulkRetryConfirm(true)}
                                        >
                                            {bulkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                                            Retry
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={bulkLoading}
                                            onClick={() => setShowBulkSkipConfirm(true)}
                                        >
                                            <SkipForward className="h-4 w-4 mr-2" />
                                            Skip
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Table */}
                            {loading && !data ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading...
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                                    <p className="text-sm font-medium">No poison messages found</p>
                                    <p className="text-xs">All events are processing correctly</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {showCheckboxes && (
                                                <TableHead className="w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={allVisibleSelected}
                                                        ref={el => { if (el) el.indeterminate = someVisibleSelected; }}
                                                        onChange={toggleSelectAll}
                                                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                                                    />
                                                </TableHead>
                                            )}
                                            <TableHead>Subscription</TableHead>
                                            <TableHead>Stream</TableHead>
                                            <TableHead>Error</TableHead>
                                            <TableHead>Retries</TableHead>
                                            <TableHead>Poisoned</TableHead>
                                            <TableHead>Status</TableHead>
                                            {statusFilter === 'poisoned' && <TableHead>Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map(m => (
                                            <TableRow
                                                key={m.id}
                                                className={`cursor-pointer ${selected.has(m.id) ? 'bg-muted/50' : ''}`}
                                            >
                                                {showCheckboxes && (
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected.has(m.id)}
                                                            onChange={() => toggleSelect(m.id)}
                                                            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell
                                                    className="font-medium text-xs"
                                                    onClick={() => navigate(`${basePath}/poison-messages/${m.id}`)}
                                                >
                                                    <Badge variant="outline" className="text-[10px]">{m.subscription_id}</Badge>
                                                </TableCell>
                                                <TableCell
                                                    className="text-muted-foreground text-xs max-w-[200px] truncate"
                                                    title={m.stream_name}
                                                    onClick={() => navigate(`${basePath}/poison-messages/${m.id}`)}
                                                >
                                                    {m.stream_name}
                                                </TableCell>
                                                <TableCell
                                                    className="text-destructive text-xs max-w-[250px] truncate"
                                                    title={m.error_message}
                                                    onClick={() => navigate(`${basePath}/poison-messages/${m.id}`)}
                                                >
                                                    {m.error_message}
                                                </TableCell>
                                                <TableCell
                                                    className="text-muted-foreground text-xs"
                                                    onClick={() => navigate(`${basePath}/poison-messages/${m.id}`)}
                                                >
                                                    {m.retry_count}
                                                </TableCell>
                                                <TableCell
                                                    className="text-muted-foreground text-xs whitespace-nowrap"
                                                    title={m.poisoned_at}
                                                    onClick={() => navigate(`${basePath}/poison-messages/${m.id}`)}
                                                >
                                                    {timeAgo(m.poisoned_at)}
                                                </TableCell>
                                                <TableCell onClick={() => navigate(`${basePath}/poison-messages/${m.id}`)}>
                                                    <Badge variant={statusBadgeVariant[m.status] || 'secondary'} className="text-[10px]">
                                                        {m.status}
                                                    </Badge>
                                                </TableCell>
                                                {statusFilter === 'poisoned' && (
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2"
                                                                disabled={actionLoading.has(m.id)}
                                                                onClick={() => handleRetry(m.id)}
                                                                title="Retry"
                                                            >
                                                                {actionLoading.has(m.id) ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    <RotateCcw className="h-3 w-3" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2"
                                                                disabled={actionLoading.has(m.id)}
                                                                onClick={() => handleSkip(m.id)}
                                                                title="Skip"
                                                            >
                                                                <SkipForward className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {/* Count */}
                            {data && filtered.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                    {filtered.length} message{filtered.length !== 1 ? 's' : ''}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Bulk Retry Confirmation */}
            <Dialog open={showBulkRetryConfirm} onClose={() => setShowBulkRetryConfirm(false)}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-primary" />
                        Confirm Bulk Retry
                    </DialogTitle>
                    <DialogDescription>
                        Retry {visibleSelected.size} poison message{visibleSelected.size !== 1 ? 's' : ''}? Each event will be re-processed through its projector.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowBulkRetryConfirm(false)}>Cancel</Button>
                    <Button onClick={() => handleBulkAction('retry')} disabled={bulkLoading}>
                        {bulkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                        Retry {visibleSelected.size} message{visibleSelected.size !== 1 ? 's' : ''}
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* Bulk Skip Confirmation */}
            <Dialog open={showBulkSkipConfirm} onClose={() => setShowBulkSkipConfirm(false)}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Confirm Bulk Skip
                    </DialogTitle>
                    <DialogDescription>
                        Skip {visibleSelected.size} poison message{visibleSelected.size !== 1 ? 's' : ''}? These events will not be processed and their streams will be unblocked.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowBulkSkipConfirm(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => handleBulkAction('skip')} disabled={bulkLoading}>
                        {bulkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SkipForward className="h-4 w-4 mr-2" />}
                        Skip {visibleSelected.size} message{visibleSelected.size !== 1 ? 's' : ''}
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
}
