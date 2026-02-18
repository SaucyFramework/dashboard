# Poison Messages Dashboard Feature

Instructions for adding poison message management to the Saucy Dashboard.

## Overview

The core Saucy package now includes a poison message system that detects, records, and manages events that repeatedly fail during projection. The dashboard needs a UI to list, inspect, retry, and skip these poison messages.

### Core Concepts

- **Poison Message**: An event that failed all retry attempts (~60s exponential backoff) during projection
- **Failure Modes**: `Halt` (stop subscription), `PauseStream` (skip failing stream, continue others), `SkipMessage` (skip single event, continue)
- **Statuses**: `poisoned` (active failure), `resolved` (successfully retried), `skipped` (manually skipped)
- **Paused Streams**: Derived from the poison_messages table — a stream is "paused" if it has unresolved poison messages

### Services Available

The core package exposes these for dependency injection:

```php
// List, retry, skip poison messages
Saucy\Core\Subscriptions\PoisonMessages\PoisonMessageManager::class

// Direct store access (query poison_messages table)
Saucy\Core\Subscriptions\PoisonMessages\PoisonMessageStore::class
```

**PoisonMessageManager methods:**
- `listUnresolved(?string $subscriptionId = null): Collection` — returns `PoisonMessage` objects
- `retry(int $poisonMessageId): void` — re-processes the event, marks resolved on success, re-poisons on failure
- `skip(int $poisonMessageId): void` — marks as skipped, unblocks stream

**PoisonMessageStore methods:**
- `getUnresolved(?string $subscriptionId = null): array`
- `getUnresolvedForStream(string $subscriptionId, string $streamName): array`
- `hasUnresolvedForStream(string $subscriptionId, string $streamName): bool`
- `get(int $id): PoisonMessage`
- `store(PoisonMessage $message): void`
- `resolve(int $id): void`
- `skip(int $id): void`

**PoisonMessage value object:**
```php
final readonly class PoisonMessage {
    public ?int $id;
    public string $subscriptionId;
    public int $globalPosition;
    public string $messageId;
    public string $streamName;
    public string $errorMessage;
    public string $stackTrace;
    public int $retryCount;
    public PoisonMessageStatus $status;      // poisoned, resolved, skipped
    public DateTimeImmutable $poisonedAt;
    public ?DateTimeImmutable $resolvedAt;
}
```

---

## Backend: API Endpoints

Add these routes to `routes/web.php` inside the authenticated group, following the existing pattern:

### Routes

```php
// Poison Messages
Route::get('api/poison-messages', [PoisonMessagesController::class, 'index']);
Route::get('api/poison-messages/{id}', [PoisonMessagesController::class, 'show']);
Route::post('api/poison-messages/{id}/retry', [PoisonMessagesController::class, 'retry']);
Route::post('api/poison-messages/{id}/skip', [PoisonMessagesController::class, 'skip']);

// Bulk actions
Route::post('api/poison-messages/bulk-retry', [PoisonMessagesController::class, 'bulkRetry']);
Route::post('api/poison-messages/bulk-skip', [PoisonMessagesController::class, 'bulkSkip']);
```

### Controller: `PoisonMessagesController`

Create `src/Http/Controllers/PoisonMessagesController.php`.

#### `GET /api/poison-messages` — List

Query params: `?subscription=`, `?status=` (default: `poisoned`), `?stream=`

Response:
```json
{
  "poison_messages": [
    {
      "id": 1,
      "subscription_id": "balance_projector",
      "global_position": 4523,
      "message_id": "01JKABC...",
      "stream_name": "bank_account-01JK...",
      "error_message": "Division by zero",
      "retry_count": 9,
      "status": "poisoned",
      "poisoned_at": "2025-06-15 14:32:00",
      "resolved_at": null
    }
  ],
  "counts": {
    "poisoned": 3,
    "resolved": 12,
    "skipped": 2
  }
}
```

The `counts` object provides summary stats for the badge/header. Use `PoisonMessageStore::getUnresolved()` for the list and run count queries for the summary.

#### `GET /api/poison-messages/{id}` — Detail

Response:
```json
{
  "poison_message": {
    "id": 1,
    "subscription_id": "balance_projector",
    "global_position": 4523,
    "message_id": "01JKABC...",
    "stream_name": "bank_account-01JK...",
    "error_message": "Division by zero",
    "stack_trace": "...",
    "retry_count": 9,
    "status": "poisoned",
    "poisoned_at": "2025-06-15 14:32:00",
    "resolved_at": null
  }
}
```

#### `POST /api/poison-messages/{id}/retry` — Retry

Calls `PoisonMessageManager::retry($id)`. Catches exceptions to return failure details.

Response (success):
```json
{ "success": true, "message": "Poison message #1 retried successfully and resolved." }
```

Response (retry failed):
```json
{ "success": false, "message": "Retry failed: Division by zero" }
```

#### `POST /api/poison-messages/{id}/skip` — Skip

Calls `PoisonMessageManager::skip($id)`.

Response:
```json
{ "success": true, "message": "Poison message #1 has been skipped." }
```

#### `POST /api/poison-messages/bulk-retry` and `bulk-skip`

Body: `{ "ids": [1, 2, 3] }`

Response:
```json
{
  "success": true,
  "results": {
    "1": { "success": true },
    "2": { "success": false, "error": "Division by zero" },
    "3": { "success": true }
  }
}
```

---

## Frontend: Pages & Components

### 1. Navigation

Add a nav link in `Layout.jsx`:

```jsx
<NavLink to="poison-messages">
    <AlertTriangle className="h-4 w-4" />
    Poison Messages
</NavLink>
```

Consider showing a badge with the unresolved count next to the nav item. This count can come from the stats endpoint (see below).

### 2. Stats Integration

Extend `StatsController` to include poison message counts:

```json
{
  "total_events": 15000,
  "projections": { ... },
  "poison_messages": {
    "poisoned": 3,
    "resolved": 12,
    "skipped": 2
  }
}
```

Add a card on the `Dashboard.jsx` page showing the unresolved count, styled with the destructive/warning variant when > 0.

### 3. Poison Messages List Page (`PoisonMessages.jsx`)

Route: `/poison-messages`

This should follow the same pattern as `Projections.jsx`:

**Features:**
- **Polling**: `usePolling(() => get('/poison-messages'), 3000)` — 3-second refresh
- **Filters**:
  - Status tabs: `Poisoned` (default), `Resolved`, `Skipped`, `All`
  - Subscription dropdown (populated from distinct subscription_ids)
  - Search by stream name or error message
- **Table columns**:
  - Checkbox (for bulk actions)
  - ID
  - Subscription (badge)
  - Stream Name (truncated, with tooltip for full name)
  - Error (truncated to ~60 chars, red text)
  - Retries (count)
  - Poisoned At (relative time, e.g., "2 hours ago")
  - Status (badge: `poisoned` = destructive, `resolved` = success, `skipped` = secondary)
  - Actions (retry button, skip button — only for `poisoned` status)
- **Bulk actions toolbar** (visible when items selected):
  - "Retry Selected" button
  - "Skip Selected" button
  - Confirmation dialog before bulk actions
- **Empty state**: "No poison messages found" with a check icon — good news messaging
- **Click row** → navigate to detail page

### 4. Poison Message Detail Page (`ShowPoisonMessage.jsx`)

Route: `/poison-messages/:id`

**Features:**
- **Polling**: `usePolling(() => get('/poison-messages/${id}'), 2000)`
- **Back button** → return to list
- **Header**: Poison message ID + status badge
- **Cards layout** (similar to ShowProjection):

**Card 1: Message Info**
| Field | Value |
|-------|-------|
| Subscription | `balance_projector` |
| Stream | `bank_account-01JK...` |
| Global Position | `4523` |
| Message ID | `01JKABC...` |
| Retry Count | `9` |
| Poisoned At | `2025-06-15 14:32:00` |
| Resolved At | `—` |

**Card 2: Error Details**
- Error message in a red-tinted box
- Collapsible stack trace in a `<pre>` block with monospace font and horizontal scroll
- Consider syntax highlighting for the trace (PHP file paths + line numbers)

**Card 3: Actions**
- "Retry" button (primary, only visible when status = poisoned)
  - Shows loading spinner during retry
  - On success: toast notification + status updates via polling
  - On failure: shows the new error message inline
- "Skip" button (secondary/outline, only when status = poisoned)
  - Confirmation dialog: "Are you sure you want to skip this message? The event will not be processed."
- Both disabled when status is `resolved` or `skipped`

### 5. React Router Addition

In `App.jsx`, add:

```jsx
<Route path="poison-messages" element={<PoisonMessages />} />
<Route path="poison-messages/:id" element={<ShowPoisonMessage />} />
```

---

## UI/UX Recommendations

### Status Badges

Use the existing Badge component variants:

| Status | Variant | Color |
|--------|---------|-------|
| poisoned | `destructive` | Red |
| resolved | `success` | Green |
| skipped | `secondary` | Gray |

### Alerting in Navigation

When there are unresolved poison messages, the nav item should draw attention:
- Show a red dot or count badge next to "Poison Messages"
- On the Dashboard page, show a warning banner or destructive-colored stat card

### Stack Trace Display

```jsx
<div className="bg-muted rounded-md p-4 overflow-x-auto">
  <pre className="text-xs font-mono whitespace-pre-wrap break-words">
    {poisonMessage.stack_trace}
  </pre>
</div>
```

### Confirmation Dialogs

Use the existing `Dialog` component for:
- Bulk retry: "Retry {n} poison messages? This will re-process each event through its projector."
- Bulk skip: "Skip {n} poison messages? These events will not be processed and their streams will be unblocked."
- Single skip: "Skip this poison message? The event at position {globalPosition} will not be processed."

### Toast Notifications

Use `useNotifications()` for action feedback:
- Retry success: "Poison message #{id} resolved successfully"
- Retry failure: "Retry failed for #{id}: {error}" (this should persist longer than the default 2.5s)
- Skip success: "Poison message #{id} skipped"
- Bulk actions: "Retried {n} messages: {successes} resolved, {failures} failed"

---

## Relationship with Projections Page

The existing Projections detail page (`ShowProjection.jsx`) should also surface poison message info:

1. **Add a "Poison Messages" section** to the projection detail page when the subscription has unresolved poison messages
2. Show a warning badge next to projections that have active poison messages in the list view
3. Link from the projection detail page to the poison messages list filtered by that subscription: `/poison-messages?subscription={subscriptionId}`

This can be done by extending `ProjectionsController::show()` to include a `poison_message_count` field and `ProjectionsController::index()` to include a `has_poison_messages` boolean per projection.
