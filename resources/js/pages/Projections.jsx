import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../api';
import { usePolling } from '../hooks/usePolling';
import { useNotifications } from '../hooks/useNotifications';
import StatusIndicator from '../components/StatusIndicator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Rocket, RefreshCw, AlertTriangle, Skull } from 'lucide-react';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'running', label: 'Running', variant: 'success' },
    { key: 'paused', label: 'Paused', variant: 'warning' },
    { key: 'standby', label: 'Standby', variant: 'info' },
    { key: 'behind', label: 'Behind', variant: 'outline' },
];

function getStatus(p) {
    if (!p.has_process) return 'standby';
    if (p.paused) return 'paused';
    return 'running';
}

export default function Projections() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const { data, loading } = usePolling(() => get('/projections'), 2000);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortKey, setSortKey] = useState('stream');
    const [sortDir, setSortDir] = useState('asc');
    const [selected, setSelected] = useState(new Set());
    const [showReplayConfirm, setShowReplayConfirm] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);

    const projections = data?.projections || [];
    const maxPosition = data?.max_position || 0;

    function handleSort(key) {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }

    const filtered = useMemo(() => {
        let result = projections;

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p => p.stream_id.toLowerCase().includes(q));
        }

        if (statusFilter !== 'all') {
            result = result.filter(p => {
                const status = getStatus(p);
                if (statusFilter === 'behind') {
                    return maxPosition > 0 && p.position < maxPosition;
                }
                return status === statusFilter;
            });
        }

        result = [...result].sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'stream':
                    cmp = a.stream_id.localeCompare(b.stream_id);
                    break;
                case 'position':
                    cmp = a.position - b.position;
                    break;
                case 'progress':
                    cmp = (maxPosition > 0 ? a.position / maxPosition : 0) - (maxPosition > 0 ? b.position / maxPosition : 0);
                    break;
                case 'status': {
                    const order = { running: 0, paused: 1, standby: 2 };
                    cmp = (order[getStatus(a)] ?? 3) - (order[getStatus(b)] ?? 3);
                    break;
                }
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [projections, search, statusFilter, sortKey, sortDir, maxPosition]);

    const filteredIds = useMemo(() => new Set(filtered.map(p => p.stream_id)), [filtered]);
    const visibleSelected = useMemo(() => {
        const s = new Set();
        for (const id of selected) {
            if (filteredIds.has(id)) s.add(id);
        }
        return s;
    }, [selected, filteredIds]);

    const allVisibleSelected = filtered.length > 0 && visibleSelected.size === filtered.length;
    const someVisibleSelected = visibleSelected.size > 0 && !allVisibleSelected;

    function toggleSelectAll() {
        if (allVisibleSelected) {
            setSelected(prev => {
                const next = new Set(prev);
                for (const p of filtered) next.delete(p.stream_id);
                return next;
            });
        } else {
            setSelected(prev => {
                const next = new Set(prev);
                for (const p of filtered) next.add(p.stream_id);
                return next;
            });
        }
    }

    function toggleSelect(streamId) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(streamId)) {
                next.delete(streamId);
            } else {
                next.add(streamId);
            }
            return next;
        });
    }

    async function handleBulkAction(action, message) {
        if (visibleSelected.size === 0) return;
        setBulkLoading(true);
        try {
            await Promise.all(
                [...visibleSelected].map(id => post(`/projections/${id}/${action}`))
            );
            notify(`${message} ${visibleSelected.size} projection${visibleSelected.size !== 1 ? 's' : ''}`);
            setSelected(new Set());
        } catch {
            notify('Some actions failed');
        } finally {
            setBulkLoading(false);
        }
    }

    async function handleBulkTrigger() {
        await handleBulkAction('trigger', 'Triggered');
    }

    async function handleBulkReplay() {
        setShowReplayConfirm(false);
        await handleBulkAction('replay', 'Replay started for');
    }

    function SortIcon({ column }) {
        if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
        return sortDir === 'asc'
            ? <ArrowUp className="h-3 w-3 ml-1" />
            : <ArrowDown className="h-3 w-3 ml-1" />;
    }

    function SortableHead({ column, children }) {
        return (
            <TableHead
                className="cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort(column)}
            >
                <span className="inline-flex items-center">
                    {children}
                    <SortIcon column={column} />
                </span>
            </TableHead>
        );
    }

    function lagDisplay(position) {
        if (maxPosition === 0) return null;
        const pct = Math.round((position / maxPosition) * 100);
        const behind = maxPosition - position;

        if (behind === 0) {
            return (
                <div className="flex items-center gap-2">
                    <Progress value={100} className="w-20" />
                    <Badge variant="success" className="text-[10px]">up to date</Badge>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2">
                <Progress value={pct} className="w-20" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{behind.toLocaleString()} behind</span>
            </div>
        );
    }

    return (
        <>
            <header>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Projections</h1>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Projections</CardTitle>
                            <CardDescription>All registered event sourcing projections</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Search & Filters */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search projections..."
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
                                            onClick={() => setStatusFilter(f.key)}
                                            className="text-xs h-8"
                                        >
                                            {f.label}
                                            {f.key !== 'all' && data && (
                                                <span className="ml-1 opacity-70">
                                                    {f.key === 'behind'
                                                        ? projections.filter(p => maxPosition > 0 && p.position < maxPosition).length
                                                        : projections.filter(p => getStatus(p) === f.key).length
                                                    }
                                                </span>
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Bulk Actions Bar */}
                            {visibleSelected.size > 0 && (
                                <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
                                    <span className="text-sm font-medium">
                                        {visibleSelected.size} selected
                                    </span>
                                    <div className="flex items-center gap-2 ml-auto">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={bulkLoading}
                                            onClick={handleBulkTrigger}
                                        >
                                            {bulkLoading ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Rocket className="h-4 w-4 mr-2" />
                                            )}
                                            Trigger
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={bulkLoading}
                                            onClick={() => setShowReplayConfirm(true)}
                                        >
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Replay
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelected(new Set())}
                                        >
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
                                <div className="text-sm text-muted-foreground py-8 text-center">
                                    {projections.length === 0
                                        ? 'No projections registered'
                                        : 'No projections match your filters'
                                    }
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={allVisibleSelected}
                                                    ref={el => { if (el) el.indeterminate = someVisibleSelected; }}
                                                    onChange={toggleSelectAll}
                                                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                                                />
                                            </TableHead>
                                            <SortableHead column="stream">Stream</SortableHead>
                                            <SortableHead column="position">Position</SortableHead>
                                            <SortableHead column="progress">Progress</SortableHead>
                                            <SortableHead column="status">Status</SortableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((p) => (
                                            <TableRow
                                                key={p.stream_id}
                                                className={`cursor-pointer ${selected.has(p.stream_id) ? 'bg-muted/50' : ''}`}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.has(p.stream_id)}
                                                        onChange={() => toggleSelect(p.stream_id)}
                                                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                                                    />
                                                </TableCell>
                                                <TableCell
                                                    className="font-medium"
                                                    onClick={() => navigate(`${basePath}/projections/${p.stream_id}`)}
                                                >
                                                    {p.stream_id}
                                                </TableCell>
                                                <TableCell
                                                    className="text-muted-foreground"
                                                    onClick={() => navigate(`${basePath}/projections/${p.stream_id}`)}
                                                >
                                                    {p.position.toLocaleString()}
                                                </TableCell>
                                                <TableCell onClick={() => navigate(`${basePath}/projections/${p.stream_id}`)}>
                                                    {lagDisplay(p.position)}
                                                </TableCell>
                                                <TableCell onClick={() => navigate(`${basePath}/projections/${p.stream_id}`)}>
                                                    <div className="flex items-center gap-2">
                                                        {p.has_process ? (
                                                            p.paused ? (
                                                                <StatusIndicator color="orange" label={p.paused_reason} />
                                                            ) : (
                                                                <StatusIndicator color="green" label={p.status} />
                                                            )
                                                        ) : (
                                                            <StatusIndicator color="blue" label="standby" />
                                                        )}
                                                        {p.poison_message_count > 0 && (
                                                            <Badge variant="destructive" className="text-[10px] gap-1">
                                                                <Skull className="h-3 w-3" />
                                                                {p.poison_message_count}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {/* Result count */}
                            {data && (
                                <div className="text-xs text-muted-foreground">
                                    {filtered.length === projections.length
                                        ? `${projections.length} projection${projections.length !== 1 ? 's' : ''}`
                                        : `${filtered.length} of ${projections.length} projections`
                                    }
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Replay Confirmation Dialog */}
            <Dialog open={showReplayConfirm} onClose={() => setShowReplayConfirm(false)}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Confirm Bulk Replay
                    </DialogTitle>
                    <DialogDescription>
                        This will replay {visibleSelected.size} projection{visibleSelected.size !== 1 ? 's' : ''} from the beginning. All existing read model data for these projections will be rebuilt.
                    </DialogDescription>
                </DialogHeader>
                <div className="px-6 pb-2">
                    <div className="rounded-md border bg-muted/50 p-3 max-h-40 overflow-y-auto">
                        <ul className="space-y-1 text-sm">
                            {[...visibleSelected].map(id => (
                                <li key={id} className="text-muted-foreground font-mono text-xs">{id}</li>
                            ))}
                        </ul>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowReplayConfirm(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleBulkReplay} disabled={bulkLoading}>
                        {bulkLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Replay {visibleSelected.size} projection{visibleSelected.size !== 1 ? 's' : ''}
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
}
