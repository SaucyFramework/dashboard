# Saucy Dashboard — Insights & Analytics Briefing

Proposed changes to `saucy/saucy` core to support richer monitoring in the dashboard package. These are listed in priority order.

---

## 1. New migration: indexes on `event_store` for analytics queries

**Problem**: The `event_store` table has no index on `created_at` or standalone `message_type`. With millions of rows, the following queries require full table scans:

- Event throughput over time (`GROUP BY DATE_FORMAT(created_at, ...)`)
- Event type distribution (`GROUP BY message_type`)

**Current indexes**:
```
idempotency_index:            UNIQUE (stream_name, message_id)
optimistic_lock_index:        UNIQUE (stream_name, stream_position)
reconstitution_index:         INDEX  (stream_name, stream_position)
stream_type_projection_index: INDEX  (stream_type, global_position, message_type)
```

**Proposed new migration** — add two indexes:
```php
$table->index(['created_at', 'message_type'], 'event_analytics_index');
```

This single composite index covers both use cases:
- Throughput queries: range scan on `created_at` (leftmost prefix), e.g. `WHERE created_at >= NOW() - INTERVAL 24 HOUR GROUP BY HOUR(created_at)` — the DB only touches the 24h slice of the index, not the full table.
- Type distribution (time-bounded): `WHERE created_at >= ... GROUP BY message_type` — uses both columns.
- Global type distribution (all time): a standalone `message_type` index would be needed for this, but in practice a time-bounded distribution (last 7d/30d) is more useful and avoids scanning millions of rows.

**Write path impact**: One additional index to maintain on insert. Since events are append-only and `created_at` is monotonically increasing, inserts always go to the end of the B-tree — negligible overhead.

---

## 2. New table: `projection_snapshots` for position history

**Problem**: We want to show projection lag over time (catch-up curves, falling-behind trends). The only current source is the activity log, which has two issues:
- Hard-capped at 100 rows per `getLog()` call
- Purged after 1 week by default
- Not designed for time-series analysis

**Proposed new table**:
```php
Schema::create('projection_snapshots', function (Blueprint $table) {
    $table->id();
    $table->string('stream_id');
    $table->unsignedBigInteger('position');
    $table->unsignedBigInteger('max_position');
    $table->dateTime('recorded_at');

    $table->index(['stream_id', 'recorded_at']);
});
```

**Recording mechanism** — two options:

**Option A: Piggyback on checkpoint store** (minimal change)
In `AllStreamSubscription::poll()`, after each `store_checkpoint`, also write a snapshot row. This gives granular data (one row per commit batch) but could be high volume. Mitigate by only recording every N-th checkpoint or every X seconds.

**Option B: Periodic snapshot job** (decoupled, recommended)
A scheduled artisan command (e.g. every minute via `schedule:run`) that reads all checkpoint positions + max event ID and writes a snapshot row per projection. Predictable volume: `num_projections × 1440 rows/day`. Easy to reason about retention. Could be registered in the dashboard's service provider:

```php
// In DashboardServiceProvider or a new Saucy core provider
$schedule->command('saucy:snapshot-positions')->everyMinute();
```

**Retention**: A `saucy:purge-snapshots` command (or built into the snapshot command) that keeps e.g. 7 days of per-minute data, then downsamples to hourly for older data.

**Dashboard usage**: Line chart per projection showing `position / max_position` over time. Immediately reveals:
- Replay catch-up curves
- Projections falling behind during traffic spikes
- How long a full replay takes (useful for capacity planning)

---

## 3. Error tracking in the poll loop

**Problem**: If a projector throws during `handle()`, the entire poll cycle fails. The exception bubbles up into Laravel's queue system. There is no record in Saucy's own tables of what happened — you have to dig through `failed_jobs` or logs. The dashboard can't show error rates or which events are problematic.

**Proposed change in `AllStreamSubscription::poll()`**:

Wrap the event handling in a try/catch. On failure:
1. Log an activity entry with type `error` containing the event type, global position, and exception message
2. Auto-pause the subscription with reason containing the error
3. Store checkpoint at the position _before_ the failing event so it can be retried

```php
// In the event processing loop:
try {
    $this->messageConsumer->handle($message);
} catch (\Throwable $e) {
    $this->activityStreamLogger->log(new SubscriptionActivity(
        streamId: $this->subscriptionId,
        type: 'error',
        message: $e->getMessage(),
        occurredAt: new \DateTime(),
        data: [
            'global_position' => $storedEvent->globalPosition,
            'event_type' => $storedEvent->eventType,
            'exception_class' => get_class($e),
        ],
    ));
    // pause so it doesn't keep retrying in a tight loop
    throw $e; // or pause + break, depending on desired behavior
}
```

**Dashboard usage**: Error timeline, error rate per projection, "last error" display on projection detail page, error type distribution.

**Open question**: Should the subscription auto-pause on error, or keep retrying? Auto-pause is safer (prevents infinite retry loops), but some errors are transient. Consider a configurable retry count before pausing.

---

## 4. Activity log improvements

### 4a. Pagination support for `getLog()`

**Problem**: `IlluminateActivityStreamLogger::getLog()` is hard-capped at `->take(100)`. The dashboard can't fetch historical activity for charts.

**Proposed change**: Add optional pagination parameters:
```php
public function getLog(?string $streamId, int $limit = 100, int $offset = 0): array;
```

Or better, a dedicated method for time-range queries:
```php
public function getLogBetween(string $streamId, \DateTime $from, \DateTime $to): array;
```

### 4b. Indexes on `subscription_activity_stream_log`

**Problem**: The table has no indexes. Queries filtering by `stream_id` or `type` are full scans.

**Proposed new migration**:
```php
$table->index(['stream_id', 'occurred_at']);
$table->index(['stream_id', 'type', 'occurred_at']);
```

### 4c. Add `ActivityStreamLogger` to `StreamSubscription`

**Problem**: Only `AllStreamSubscription` logs activity. `StreamSubscription` (per-aggregate projectors) has no `ActivityStreamLogger` injected, so those projections are invisible to the dashboard.

**Proposed change**: Add `ActivityStreamLogger` as a constructor dependency to `StreamSubscription` and log the same activity types as `AllStreamSubscription`.

### 4d. Configurable retention

**Problem**: The purge default is 1 week, hard-coded. Users running dashboards may want longer retention for trend analysis.

**Proposed change**: Make it configurable via the Saucy config:
```php
// config/saucy.php
'activity_log_retention_days' => 30,
```

---

## 5. Processing speed metrics (no core changes needed)

The `store_checkpoint` activity entries already contain per-event-type processing metrics in `data.messages_processed`:

```json
{
    "OrderPlaced": { "count": 15, "total_time": 0.342, "max_time": 0.048 },
    "OrderShipped": { "count": 8, "total_time": 0.091, "max_time": 0.022 }
}
```

This data is already being captured — the dashboard just needs to query and visualize it. No core changes required.

**Dashboard usage**:
- Average/max processing time per event type (identify slow handlers)
- Processing throughput per projection (events/second)
- Slowest handlers ranking

---

## 6. Process history (nice to have)

**Problem**: Process rows are deleted when they expire or stop. There's no record of past processes, restarts, or uptime.

**Proposed new table**:
```php
Schema::create('process_history', function (Blueprint $table) {
    $table->id();
    $table->string('subscription_id');
    $table->string('process_id');
    $table->string('event'); // 'started', 'stopped', 'expired', 'paused', 'resumed'
    $table->dateTime('occurred_at');

    $table->index(['subscription_id', 'occurred_at']);
});
```

Write to this table in `RunningProcesses::start()`, `stop()`, `pause()`, `resume()`.

**Dashboard usage**: Uptime timeline, restart frequency, stability score per projection.

**Priority**: Lower than items 1-4. The activity log partially covers this (via `started_poll` entries), but a dedicated table is cleaner.

---

## Summary

| # | Change | Scope | Priority |
|---|--------|-------|----------|
| 1 | `event_store` analytics index | New migration | High |
| 2 | `projection_snapshots` table + snapshot command | New migration + command | High |
| 3 | Error tracking in poll loop | `AllStreamSubscription` change | High |
| 4a | Activity log pagination | `ActivityStreamLogger` interface | Medium |
| 4b | Activity log indexes | New migration | Medium |
| 4c | Activity logging for `StreamSubscription` | `StreamSubscription` change | Medium |
| 4d | Configurable retention | Config + `purgeOld()` | Low |
| 5 | Processing speed charts | Dashboard only (no core changes) | High |
| 6 | Process history table | New migration + `RunningProcesses` change | Low |
