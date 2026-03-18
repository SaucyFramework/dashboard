<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Saucy\Core\Projections\ProjectorConfig;
use Saucy\Core\Projections\ProjectorMap;
use Saucy\Core\Projections\ProjectorType;
use Saucy\Core\Subscriptions\Checkpoints\CheckpointNotFound;
use Saucy\Core\Subscriptions\MessageConsumption\MessageConsumerThatResetsStreamBeforeReplay;
use Saucy\Core\Subscriptions\StreamSubscription\StreamSubscription;
use Saucy\Core\Subscriptions\StreamSubscription\StreamSubscriptionRegistry;
use Saucy\Core\Subscriptions\StreamSubscription\SyncStreamSubscriptionRegistry;

class AggregateProjectionsController
{
    public function index(
        StreamSubscriptionRegistry $asyncRegistry,
        SyncStreamSubscriptionRegistry $syncRegistry,
        ProjectorMap $projectorMap,
    ): JsonResponse {
        $data = [];

        $poisonCounts = DB::table('poison_messages')
            ->where('status', 'poisoned')
            ->selectRaw('subscription_id, count(*) as count')
            ->groupBy('subscription_id')
            ->pluck('count', 'subscription_id');

        $instanceCounts = DB::table('aggregate_instances')
            ->selectRaw('aggregate_type, count(*) as count')
            ->groupBy('aggregate_type')
            ->pluck('count', 'aggregate_type');

        $allSubscriptions = array_merge(
            array_values($asyncRegistry->streams),
            array_values($syncRegistry->streams),
        );

        // Deduplicate by subscription ID
        $seen = [];
        foreach ($allSubscriptions as $subscription) {
            if (isset($seen[$subscription->subscriptionId])) {
                continue;
            }
            $seen[$subscription->subscriptionId] = true;

            $instanceCount = (int) ($instanceCounts[$subscription->aggregateType] ?? 0);

            $config = self::findProjectorConfig($projectorMap, $subscription->subscriptionId);
            $projectorClass = $config?->projectorClass;
            $async = $config?->async ?? true;
            $projectorFilePath = self::resolveFilePath($projectorClass);
            $supportsReplay = $subscription->messageConsumer instanceof MessageConsumerThatResetsStreamBeforeReplay;

            $data[] = [
                'subscription_id' => $subscription->subscriptionId,
                'aggregate_type' => $subscription->aggregateType,
                'instance_count' => $instanceCount,
                'async' => $async,
                'supports_replay' => $supportsReplay,
                'projector_class' => $projectorClass,
                'projector_file_path' => $projectorFilePath,
                'poison_message_count' => $poisonCounts[$subscription->subscriptionId] ?? 0,
                'config' => [
                    'event_types' => $subscription->streamOptions->eventTypes,
                    'queue' => $subscription->streamOptions->queue,
                ],
            ];
        }

        return response()->json([
            'aggregate_projections' => $data,
        ]);
    }

    public function show(
        string $subscriptionId,
        Request $request,
        StreamSubscriptionRegistry $asyncRegistry,
        SyncStreamSubscriptionRegistry $syncRegistry,
        ProjectorMap $projectorMap,
    ): JsonResponse {
        try {
            $subscription = $asyncRegistry->get($subscriptionId);
        } catch (\RuntimeException) {
            $subscription = $syncRegistry->get($subscriptionId);
        }

        $config = self::findProjectorConfig($projectorMap, $subscriptionId);
        $projectorClass = $config?->projectorClass;
        $async = $config?->async ?? true;
        $projectorFilePath = self::resolveFilePath($projectorClass);
        $supportsReplay = $subscription->messageConsumer instanceof MessageConsumerThatResetsStreamBeforeReplay;

        $poisonMessageCount = DB::table('poison_messages')
            ->where('subscription_id', $subscriptionId)
            ->where('status', 'poisoned')
            ->count();

        $search = $request->query('search', '');
        $sortBy = $request->query('sort', 'aggregate_id');
        $sortDir = $request->query('dir', 'asc');
        $perPage = (int) $request->query('per_page', '50');
        $page = (int) $request->query('page', '1');

        $instanceQuery = DB::table('aggregate_instances')
            ->where('aggregate_type', $subscription->aggregateType)
            ->when($search !== '', fn ($q) => $q->where('aggregate_id', 'like', '%' . $search . '%'));

        $instanceCount = (clone $instanceQuery)->count();

        if (in_array($sortBy, ['lag', 'position'], true)) {
            // For sort by position/lag, we need checkpoint data — load all matching instances,
            // read checkpoints via the store (respecting DynamoDB), sort and paginate in PHP.
            $instances = $instanceQuery
                ->select('aggregate_id', 'stream_position as max_position')
                ->get()
                ->map(fn ($row) => self::enrichWithCheckpoint($row, $subscription))
                ->sortBy($sortBy, SORT_REGULAR, $sortDir === 'desc')
                ->values()
                ->slice(($page - 1) * $perPage, $perPage)
                ->values()
                ->toArray();
        } else {
            // For sort by aggregate_id, paginate in SQL then batch-read checkpoints.
            $instances = $instanceQuery
                ->select('aggregate_id', 'stream_position as max_position')
                ->orderBy('aggregate_id', $sortDir === 'desc' ? 'desc' : 'asc')
                ->offset(($page - 1) * $perPage)
                ->limit($perPage)
                ->get()
                ->map(fn ($row) => self::enrichWithCheckpoint($row, $subscription))
                ->toArray();
        }

        return response()->json([
            'subscription_id' => $subscriptionId,
            'aggregate_type' => $subscription->aggregateType,
            'instance_count' => $instanceCount,
            'async' => $async,
            'supports_replay' => $supportsReplay,
            'projector_class' => $projectorClass,
            'projector_file_path' => $projectorFilePath,
            'poison_message_count' => $poisonMessageCount,
            'config' => [
                'event_types' => $subscription->streamOptions->eventTypes,
                'queue' => $subscription->streamOptions->queue,
            ],
            'instances' => $instances,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $instanceCount,
                'last_page' => (int) ceil($instanceCount / $perPage),
            ],
        ]);
    }

    /**
     * @return array{aggregate_id: string, position: int, max_position: int}
     */
    private static function enrichWithCheckpoint(object $row, StreamSubscription $subscription): array
    {
        $streamName = new \Saucy\Core\Events\Streams\AggregateStreamName(
            $subscription->aggregateType,
            $row->aggregate_id,
        );

        try {
            $position = $subscription->checkpointStore->get($subscription->getId($streamName))->position;
        } catch (CheckpointNotFound) {
            $position = 0;
        }

        return [
            'aggregate_id' => $row->aggregate_id,
            'position' => $position,
            'max_position' => (int) $row->max_position,
            'lag' => (int) $row->max_position - $position,
        ];
    }

    private static function findProjectorConfig(ProjectorMap $projectorMap, string $subscriptionId): ?ProjectorConfig
    {
        foreach ($projectorMap->getProjectorConfigs() as $config) {
            if ($config->projectorType !== ProjectorType::AggregateInstance) {
                continue;
            }
            $subId = $config->name ?? (string) Str::of($config->projectorClass)->afterLast('\\')->snake();
            if ($subId === $subscriptionId) {
                return $config;
            }
        }
        return null;
    }

    private static function resolveFilePath(?string $projectorClass): ?string
    {
        if ($projectorClass === null || !class_exists($projectorClass)) {
            return null;
        }
        try {
            return (new \ReflectionClass($projectorClass))->getFileName() ?: null;
        } catch (\Throwable) {
            return null;
        }
    }
}
