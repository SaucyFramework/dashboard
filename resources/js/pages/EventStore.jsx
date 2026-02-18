import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { MultiSelect } from '../components/ui/multi-select';
import { cn } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';
import { JsonView, defaultStyles, darkStyles, collapseAllNested, allExpanded } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import {
    Loader2,
    Search,
    X,
    ChevronRight,
    ChevronDown,
    CheckCircle2,
    Clock,
    Radio,
    RefreshCw,
    ExternalLink,
    Copy,
    Check,
    ChevronsUpDown,
    Filter,
} from 'lucide-react';

function CopyButton({ text, className }) {
    const [copied, setCopied] = useState(false);
    function handleCopy(e) {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }
    return (
        <button onClick={handleCopy} className={cn('text-muted-foreground hover:text-foreground transition-colors', className)} title="Copy">
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </button>
    );
}

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

function formatShortType(type) {
    if (!type) return '';
    const parts = type.split('\\');
    return parts[parts.length - 1] || type;
}

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

export default function EventStore() {
    // Filter state
    const [streamFilter, setStreamFilter] = useState('');
    const [typeFilters, setTypeFilters] = useState([]);
    const [autoPoll, setAutoPoll] = useState(false);

    // Event list state
    const [events, setEvents] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Detail state
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventDetail, setEventDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Autocomplete state
    const [streamSearch, setStreamSearch] = useState('');
    const [streamSuggestions, setStreamSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const autocompleteRef = useRef(null);

    // Event types for dropdown
    const [eventTypes, setEventTypes] = useState([]);
    const [eventTypeClassMap, setEventTypeClassMap] = useState({});

    // Auto-poll state
    const [newEventsCount, setNewEventsCount] = useState(0);

    // Sentinel ref for infinite scroll
    const sentinelRef = useRef(null);

    // Track if filters changed to reset list
    const filtersRef = useRef({ stream: '', types: [] });

    // Fetch event types on mount
    useEffect(() => {
        get('/events/types').then(data => {
            const types = data.types || [];
            setEventTypes(types.map(t => t.type));
            const classMap = {};
            types.forEach(t => { if (t.class) classMap[t.type] = t.class; });
            setEventTypeClassMap(classMap);
        }).catch(() => {});
    }, []);

    // Fetch events
    const fetchEvents = useCallback(async (cursor = null, append = false) => {
        if (!append) setLoading(true);

        const params = new URLSearchParams();
        params.set('limit', '50');
        if (typeFilters.length > 0) params.set('types', typeFilters.join(','));
        if (streamFilter) params.set('stream', streamFilter);
        if (cursor) params.set('cursor', cursor);

        try {
            const data = await get(`/events?${params.toString()}`);
            if (append) {
                setEvents(prev => [...prev, ...(data.events || [])]);
            } else {
                setEvents(data.events || []);
            }
            setNextCursor(data.next_cursor);
            setHasMore(data.has_more);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [typeFilters, streamFilter]);

    // Initial load + filter changes
    useEffect(() => {
        setSelectedEvent(null);
        setEventDetail(null);
        setNewEventsCount(0);
        fetchEvents();
        filtersRef.current = { stream: streamFilter, types: typeFilters };
    }, [fetchEvents]);

    // Infinite scroll observer
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
                    setLoadingMore(true);
                    fetchEvents(nextCursor, true);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading, nextCursor, fetchEvents]);

    // Auto-poll for new events
    useEffect(() => {
        if (!autoPoll || events.length === 0) return;

        const highestPosition = events[0]?.global_position;
        if (!highestPosition) return;

        const interval = setInterval(async () => {
            const params = new URLSearchParams();
            params.set('since', highestPosition);
            if (typeFilters.length > 0) params.set('types', typeFilters.join(','));
            if (streamFilter) params.set('stream', streamFilter);

            try {
                const data = await get(`/events/new-count?${params.toString()}`);
                setNewEventsCount(data.count || 0);
            } catch {
                // ignore
            }
        }, 2500);

        return () => clearInterval(interval);
    }, [autoPoll, events, typeFilters, streamFilter]);

    // Stream name autocomplete (debounced)
    useEffect(() => {
        if (!streamSearch || streamSearch.length < 2) {
            setStreamSuggestions([]);
            return;
        }
        const timeout = setTimeout(async () => {
            try {
                const data = await get(`/events/stream-names?q=${encodeURIComponent(streamSearch)}`);
                setStreamSuggestions(data.stream_names || []);
                setShowSuggestions(true);
            } catch {
                setStreamSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [streamSearch]);

    // Close autocomplete on outside click
    useEffect(() => {
        function handleClick(e) {
            if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Toggle event detail
    async function toggleEventDetail(globalPosition) {
        if (selectedEvent === globalPosition) {
            setSelectedEvent(null);
            setEventDetail(null);
            return;
        }

        setSelectedEvent(globalPosition);
        setDetailLoading(true);
        setEventDetail(null);

        try {
            const data = await get(`/events/${globalPosition}`);
            setEventDetail(data);
        } catch {
            setEventDetail(null);
        } finally {
            setDetailLoading(false);
        }
    }

    function handleStreamClick(streamName) {
        setStreamFilter(streamName);
        setStreamSearch(streamName);
    }

    function clearStreamFilter() {
        setStreamFilter('');
        setStreamSearch('');
        setStreamSuggestions([]);
    }

    function selectSuggestion(name) {
        setStreamFilter(name);
        setStreamSearch(name);
        setShowSuggestions(false);
    }

    function handleStreamSearchChange(value) {
        setStreamSearch(value);
        if (!value) {
            setStreamFilter('');
        }
    }

    function handleStreamSearchKeyDown(e) {
        if (e.key === 'Enter' && streamSearch) {
            setStreamFilter(streamSearch);
            setShowSuggestions(false);
        }
    }

    function loadNewEvents() {
        setNewEventsCount(0);
        fetchEvents();
    }

    function handleRefresh() {
        fetchEvents();
    }

    return (
        <>
            <header>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Event Store</h1>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Event Store</CardTitle>
                            <CardDescription>Browse and inspect events in the event store</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filter bar */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Stream name autocomplete */}
                                <div className="relative flex-1" ref={autocompleteRef}>
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filter by stream name..."
                                        value={streamSearch}
                                        onChange={(e) => handleStreamSearchChange(e.target.value)}
                                        onKeyDown={handleStreamSearchKeyDown}
                                        onFocus={() => streamSuggestions.length > 0 && setShowSuggestions(true)}
                                        className="pl-9 pr-9"
                                    />
                                    {streamSearch && (
                                        <button
                                            onClick={clearStreamFilter}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                    {/* Autocomplete dropdown */}
                                    {showSuggestions && streamSuggestions.length > 0 && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
                                            {streamSuggestions.map(name => (
                                                <button
                                                    key={name}
                                                    type="button"
                                                    onClick={() => selectSuggestion(name)}
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors truncate"
                                                    title={name}
                                                >
                                                    {name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Event type multi-select */}
                                <MultiSelect
                                    options={eventTypes}
                                    selected={typeFilters}
                                    onChange={setTypeFilters}
                                    placeholder="All event types"
                                    searchPlaceholder="Search event types..."
                                    formatLabel={(t) => t}
                                    formatSubLabel={(t) => eventTypeClassMap[t] || null}
                                    className="min-w-[220px]"
                                />

                                {/* Auto-poll toggle */}
                                <Button
                                    variant={autoPoll ? 'default' : 'outline'}
                                    size="default"
                                    onClick={() => { setAutoPoll(!autoPoll); setNewEventsCount(0); }}
                                    className="gap-2"
                                >
                                    <Radio className={cn('h-4 w-4', autoPoll && 'animate-pulse')} />
                                    Live
                                </Button>

                                {/* Manual refresh */}
                                {!autoPoll && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleRefresh}
                                        title="Refresh"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            {/* Active filters display */}
                            {(streamFilter || typeFilters.length > 0) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-muted-foreground">Active filters:</span>
                                    {streamFilter && (
                                        <Badge variant="secondary" className="gap-1 text-xs">
                                            Stream: {streamFilter}
                                            <button onClick={clearStreamFilter} className="ml-1 hover:text-foreground">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    )}
                                    {typeFilters.map(t => (
                                        <Badge key={t} variant="secondary" className="gap-1 text-xs">
                                            {formatShortType(t)}
                                            <button onClick={() => setTypeFilters(prev => prev.filter(v => v !== t))} className="ml-1 hover:text-foreground">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* New events banner */}
                            {newEventsCount > 0 && (
                                <button
                                    onClick={loadNewEvents}
                                    className="w-full rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                                >
                                    {newEventsCount} new event{newEventsCount !== 1 ? 's' : ''} — click to load
                                </button>
                            )}

                            {/* Table */}
                            {loading && events.length === 0 ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading events...
                                </div>
                            ) : events.length === 0 ? (
                                <div className="text-sm text-muted-foreground py-8 text-center">
                                    No events found
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-8" />
                                                <TableHead className="w-24">#</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Stream</TableHead>
                                                <TableHead className="w-16">Pos</TableHead>
                                                <TableHead className="w-28">Time</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {events.map(event => (
                                                <Fragment key={event.global_position}>
                                                    <TableRow
                                                        className={cn(
                                                            'cursor-pointer',
                                                            selectedEvent === event.global_position && 'bg-muted/50',
                                                        )}
                                                        onClick={() => toggleEventDetail(event.global_position)}
                                                    >
                                                        <TableCell className="w-8">
                                                            {selectedEvent === event.global_position
                                                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            }
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            {event.global_position.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-[10px] font-mono" title={event.message_type}>
                                                                {formatShortType(event.message_type)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell
                                                            className="text-xs max-w-[250px] truncate text-muted-foreground hover:text-primary hover:underline cursor-pointer"
                                                            title={event.stream_name}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStreamClick(event.stream_name);
                                                            }}
                                                        >
                                                            {event.stream_name}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                                            {event.stream_position}
                                                        </TableCell>
                                                        <TableCell
                                                            className="text-xs text-muted-foreground whitespace-nowrap"
                                                            title={event.created_at}
                                                        >
                                                            {timeAgo(event.created_at)}
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Expanded detail row */}
                                                    {selectedEvent === event.global_position && (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="bg-muted/30 p-0">
                                                                <EventDetail
                                                                    loading={detailLoading}
                                                                    detail={eventDetail}
                                                                    onFilterType={(type) => setTypeFilters(prev => prev.includes(type) ? prev : [...prev, type])}
                                                                    onFilterStream={handleStreamClick}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* Infinite scroll sentinel */}
                            <div ref={sentinelRef} className="h-1" />

                            {/* Loading more spinner */}
                            {loadingMore && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading more...
                                </div>
                            )}

                            {/* Count */}
                            {events.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                    {events.length} event{events.length !== 1 ? 's' : ''} loaded
                                    {hasMore && ' — scroll for more'}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}

function JsonBlock({ label, data, isDark, maxHeight = 'max-h-80' }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">{label}</h4>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={expanded ? 'Collapse all' : 'Expand all'}
                    >
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                        {expanded ? 'Collapse' : 'Expand'}
                    </button>
                    <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Copy JSON"
                    >
                        {copied
                            ? <><Check className="h-3.5 w-3.5 text-green-500" />Copied</>
                            : <><Copy className="h-3.5 w-3.5" />Copy</>
                        }
                    </button>
                </div>
            </div>
            <div className={cn('text-xs font-mono bg-muted rounded-md p-3 overflow-x-auto overflow-y-auto', maxHeight)}>
                <JsonView
                    data={data}
                    shouldExpandNode={expanded ? allExpanded : collapseAllNested}
                    clickToExpandNode
                    style={isDark ? darkStyles : defaultStyles}
                />
            </div>
        </div>
    );
}

function EventDetail({ loading, detail, onFilterType, onFilterStream }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading event details...
            </div>
        );
    }

    if (!detail) return null;

    const { event, projections } = detail;

    return (
        <div className="p-4 space-y-4">
            {/* Event type */}
            <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Event type:</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{event.message_type}</code>
                <CopyButton text={event.message_type} />
                <button
                    onClick={() => onFilterType(event.message_type)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Filter by this event type"
                >
                    <Filter className="h-3 w-3" />
                </button>
            </div>

            {/* Event class with IDE link */}
            {event.event_class && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Class:</span>
                    {event.event_file_path ? (
                        <a
                            href={`phpstorm://open?file=${encodeURIComponent(event.event_file_path)}&line=1`}
                            className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                            {event.event_class}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    ) : (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{event.event_class}</code>
                    )}
                    <CopyButton text={event.event_class} />
                </div>
            )}

            {/* Stream name */}
            <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Stream:</span>
                <button
                    onClick={() => onFilterStream(event.stream_name)}
                    className="font-mono text-xs text-primary hover:underline"
                >
                    {event.stream_name}
                </button>
                <CopyButton text={event.stream_name} />
            </div>

            {/* Message ID */}
            <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Message ID:</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{event.message_id}</code>
                <CopyButton text={event.message_id} />
            </div>

            {/* Payload */}
            {event.payload && (
                <JsonBlock label="Payload" data={event.payload} isDark={isDark} maxHeight="max-h-80" />
            )}

            {/* Metadata */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
                <JsonBlock label="Metadata" data={event.metadata} isDark={isDark} maxHeight="max-h-40" />
            )}

            {/* Projections */}
            {projections && projections.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium mb-2">Projections</h4>
                    <div className="space-y-1.5">
                        {projections.map(p => (
                            <div key={p.subscription_id} className="flex items-center gap-2 text-xs">
                                {p.has_processed ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 dark:text-green-400 shrink-0" />
                                ) : (
                                    <Clock className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
                                )}
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Link
                                        to={`${basePath}/projections/${p.subscription_id}`}
                                        className="font-mono text-primary hover:underline truncate"
                                        title={p.projector_class}
                                    >
                                        {p.subscription_id}
                                    </Link>
                                    <span className="text-muted-foreground whitespace-nowrap">
                                        @ {p.checkpoint_position.toLocaleString()}
                                    </span>
                                    <Badge
                                        variant={p.has_processed ? 'success' : 'warning'}
                                        className="text-[9px] px-1.5 py-0"
                                    >
                                        {p.has_processed ? 'processed' : 'pending'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
