<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Saucy\Core\Projections\ProjectorMap;
use Saucy\Core\Serialisation\TypeMap;
use Saucy\Core\Subscriptions\AllStream\AllStreamSubscriptionRegistry;
use Saucy\Core\Subscriptions\Checkpoints\CheckpointStore;

class EventStoreController
{
    public function index(Request $request): JsonResponse
    {
        $cursor = $request->query('cursor');
        $limit = min((int) $request->query('limit', 50), 100);
        $types = array_filter(explode(',', $request->query('types', '')));
        $stream = $request->query('stream');

        $query = DB::table('event_store')
            ->select([
                'global_position',
                'message_id',
                'message_type',
                'stream_name',
                'stream_position',
                'created_at',
            ])
            ->orderByDesc('global_position')
            ->limit($limit + 1);

        if ($cursor !== null) {
            $query->where('global_position', '<', (int) $cursor);
        }

        if (count($types) === 1) {
            $query->where('message_type', $types[0]);
        } elseif (count($types) > 1) {
            $query->whereIn('message_type', $types);
        }

        if ($stream) {
            $query->where('stream_name', $stream);
        }

        $rows = $query->get();
        $hasMore = $rows->count() > $limit;
        $events = $rows->take($limit);

        $nextCursor = $hasMore && $events->isNotEmpty()
            ? $events->last()->global_position
            : null;

        return response()->json([
            'events' => $events->map(fn (object $row) => [
                'global_position' => (int) $row->global_position,
                'message_id' => $row->message_id,
                'message_type' => $row->message_type,
                'stream_name' => $row->stream_name,
                'stream_position' => (int) $row->stream_position,
                'created_at' => $row->created_at,
            ])->values(),
            'next_cursor' => $nextCursor,
            'has_more' => $hasMore,
        ]);
    }

    public function show(
        int $globalPosition,
        AllStreamSubscriptionRegistry $registry,
        CheckpointStore $checkpointStore,
        TypeMap $typeMap,
        ProjectorMap $projectorMap,
    ): JsonResponse {
        $row = DB::table('event_store')
            ->where('global_position', $globalPosition)
            ->first();

        if (! $row) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $payload = json_decode($row->payload, true);
        $metadata = $row->metadata ? json_decode($row->metadata, true) : null;

        // Resolve event class from TypeMap
        $eventClass = null;
        $eventFilePath = null;
        try {
            $eventClass = $typeMap->typeToClassName($row->message_type);
            if (class_exists($eventClass)) {
                $reflection = new \ReflectionClass($eventClass);
                $eventFilePath = $reflection->getFileName();
            }
        } catch (\Throwable) {
        }

        // Build subscriptionId → projectorConfig mapping
        $subscriptionToConfig = [];
        foreach ($projectorMap->getProjectorConfigs() as $config) {
            $subId = (string) Str::of($config->projectorClass)->afterLast('\\')->snake();
            $subscriptionToConfig[$subId] = $config;
        }

        // Get all checkpoints
        $checkpoints = [];
        foreach ($checkpointStore->getAll() as $checkpoint) {
            $checkpoints[$checkpoint->streamIdentifier] = $checkpoint->position;
        }

        // Determine which subscriptions handle this event type
        $projections = [];
        foreach ($registry->streams as $subscriptionId => $subscription) {
            $eventTypes = $subscription->streamOptions->eventTypes;

            // If eventTypes is set and non-empty, check if this event type is handled
            if ($eventTypes !== null && count($eventTypes) > 0 && ! in_array($row->message_type, $eventTypes, true)) {
                continue;
            }

            $checkpointPosition = $checkpoints[$subscriptionId] ?? 0;

            $projectorClass = null;
            $projectorFilePath = null;
            $config = $subscriptionToConfig[$subscriptionId] ?? null;
            if ($config) {
                $projectorClass = $config->projectorClass;
                if (class_exists($projectorClass)) {
                    try {
                        $reflection = new \ReflectionClass($projectorClass);
                        $projectorFilePath = $reflection->getFileName();
                    } catch (\Throwable) {
                    }
                }
            }

            $projections[] = [
                'subscription_id' => $subscriptionId,
                'projector_class' => $projectorClass,
                'projector_file_path' => $projectorFilePath,
                'has_processed' => $checkpointPosition >= (int) $row->global_position,
                'checkpoint_position' => $checkpointPosition,
            ];
        }

        return response()->json([
            'event' => [
                'global_position' => (int) $row->global_position,
                'message_id' => $row->message_id,
                'message_type' => $row->message_type,
                'event_class' => $eventClass,
                'event_file_path' => $eventFilePath,
                'stream_name' => $row->stream_name,
                'stream_position' => (int) $row->stream_position,
                'payload' => $payload,
                'metadata' => $metadata,
                'created_at' => $row->created_at,
            ],
            'projections' => $projections,
        ]);
    }

    public function streamNames(Request $request): JsonResponse
    {
        $q = $request->query('q', '');

        $query = DB::table('event_store')
            ->select('stream_name')
            ->distinct()
            ->orderBy('stream_name')
            ->limit(20);

        if ($q) {
            $query->where('stream_name', 'like', "%{$q}%");
        }

        return response()->json([
            'stream_names' => $query->pluck('stream_name'),
        ]);
    }

    public function types(TypeMap $typeMap): JsonResponse
    {
        $types = cache()->remember('saucy-dashboard:event-types', 60, function () use ($typeMap) {
            $messageTypes = DB::table('event_store')
                ->select('message_type')
                ->distinct()
                ->orderBy('message_type')
                ->pluck('message_type');

            return $messageTypes->map(function (string $messageType) use ($typeMap) {
                $className = null;
                try {
                    $className = $typeMap->typeToClassName($messageType);
                } catch (\Throwable) {
                }

                return [
                    'type' => $messageType,
                    'class' => $className,
                ];
            })->values();
        });

        return response()->json([
            'types' => $types,
        ]);
    }

    public function newEventsCount(Request $request): JsonResponse
    {
        $since = (int) $request->query('since', 0);
        $types = array_filter(explode(',', $request->query('types', '')));
        $stream = $request->query('stream');

        $query = DB::table('event_store')
            ->where('global_position', '>', $since);

        if (count($types) === 1) {
            $query->where('message_type', $types[0]);
        } elseif (count($types) > 1) {
            $query->whereIn('message_type', $types);
        }

        if ($stream) {
            $query->where('stream_name', $stream);
        }

        return response()->json([
            'count' => $query->count(),
            'max_position' => DB::table('event_store')->max('global_position') ?? 0,
        ]);
    }
}
