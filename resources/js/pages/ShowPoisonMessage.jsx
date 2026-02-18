import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post } from '../api';
import { usePolling } from '../hooks/usePolling';
import { useNotifications } from '../hooks/useNotifications';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { ArrowLeft, RotateCcw, SkipForward, Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

const basePath = window.__SAUCY_CONFIG__?.basePath || '/saucy-dashboard';

const statusBadgeVariant = {
    poisoned: 'destructive',
    resolved: 'success',
    skipped: 'secondary',
};

export default function ShowPoisonMessage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const { data, loading } = usePolling(() => get(`/poison-messages/${id}`), 2000);

    const [retrying, setRetrying] = useState(false);
    const [skipping, setSkipping] = useState(false);
    const [retryError, setRetryError] = useState(null);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [traceExpanded, setTraceExpanded] = useState(false);

    const msg = data?.poison_message;
    const isPoisoned = msg?.status === 'poisoned';

    async function handleRetry() {
        setRetrying(true);
        setRetryError(null);
        try {
            const result = await post(`/poison-messages/${id}/retry`);
            if (result.success) {
                notify(result.message);
            } else {
                setRetryError(result.message);
            }
        } catch {
            setRetryError('Retry request failed');
        } finally {
            setRetrying(false);
        }
    }

    async function handleSkip() {
        setShowSkipConfirm(false);
        setSkipping(true);
        try {
            const result = await post(`/poison-messages/${id}/skip`);
            notify(result.message);
        } catch {
            notify('Skip failed');
        } finally {
            setSkipping(false);
        }
    }

    if (loading && !data) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-16 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
            </div>
        );
    }

    if (!msg) return null;

    return (
        <>
            <header>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`${basePath}/poison-messages`)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                Poison Message #{msg.id}
                            </h1>
                            <Badge variant={statusBadgeVariant[msg.status] || 'secondary'}>
                                {msg.status}
                            </Badge>
                        </div>
                    </div>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
                    {/* Message Info */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Message Info</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Subscription</span>
                                    <Badge variant="outline">{msg.subscription_id}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Stream</span>
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded max-w-[300px] truncate" title={msg.stream_name}>
                                        {msg.stream_name}
                                    </code>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Global Position</span>
                                    <span className="font-medium">{msg.global_position?.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Message ID</span>
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{msg.message_id}</code>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Retry Count</span>
                                    <span className="font-medium">{msg.retry_count}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Poisoned At</span>
                                    <span className="text-xs">{msg.poisoned_at}</span>
                                </div>
                                {msg.resolved_at && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Resolved At</span>
                                        <span className="text-xs">{msg.resolved_at}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Error Details */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Error Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                                <p className="text-sm text-destructive font-medium">{msg.error_message}</p>
                            </div>

                            {retryError && (
                                <div className="rounded-md bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-3">
                                    <p className="text-sm text-orange-800 dark:text-orange-400 font-medium">Last retry failed: {retryError}</p>
                                </div>
                            )}

                            {msg.stack_trace && (
                                <div>
                                    <button
                                        onClick={() => setTraceExpanded(!traceExpanded)}
                                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {traceExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        Stack Trace
                                    </button>
                                    {traceExpanded && (
                                        <div className="mt-2 bg-muted rounded-md p-4 overflow-x-auto">
                                            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                                                {msg.stack_trace}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    {isPoisoned && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <Button onClick={handleRetry} disabled={retrying || skipping}>
                                        {retrying ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                        )}
                                        Retry
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowSkipConfirm(true)}
                                        disabled={retrying || skipping}
                                    >
                                        {skipping ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <SkipForward className="h-4 w-4 mr-2" />
                                        )}
                                        Skip
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            {/* Skip Confirmation */}
            <Dialog open={showSkipConfirm} onClose={() => setShowSkipConfirm(false)}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Skip Poison Message
                    </DialogTitle>
                    <DialogDescription>
                        Skip this poison message? The event at position {msg.global_position?.toLocaleString()} will not be processed and the stream will be unblocked.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSkipConfirm(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleSkip}>
                        <SkipForward className="h-4 w-4 mr-2" />
                        Skip Message
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
}
