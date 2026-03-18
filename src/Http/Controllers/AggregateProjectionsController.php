<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Saucy\Core\Projections\ProjectorMap;
use Saucy\Core\Projections\ProjectorType;
use Saucy\Core\Subscriptions\MessageConsumption\MessageConsumerThatResetsStreamBeforeReplay;
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

            $projectorClass = null;
            $projectorFilePath = null;
            $async = true;
            $supportsReplay = $subscription->messageConsumer instanceof MessageConsumerThatResetsStreamBeforeReplay;
            foreach ($projectorMap->getProjectorConfigs() as $config) {
                if ($config->projectorType !== ProjectorType::AggregateInstance) {
                    continue;
                }
                $subId = (string) Str::of($config->projectorClass)->snake();
                if ($subId === $subscription->subscriptionId) {
                    $projectorClass = $config->projectorClass;
                    $async = $config->async;
                    if (class_exists($projectorClass)) {
                        try {
                            $reflection = new \ReflectionClass($projectorClass);
                            $projectorFilePath = $reflection->getFileName();
                        } catch (\Throwable) {
                        }
                    }
                    break;
                }
            }

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
        } catch (\Exception) {
            $subscription = $syncRegistry->get($subscriptionId);
        }

        $projectorClass = null;
        $projectorFilePath = null;
        $async = true;
        $supportsReplay = $subscription->messageConsumer instanceof MessageConsumerThatResetsStreamBeforeReplay;
        foreach ($projectorMap->getProjectorConfigs() as $config) {
            if ($config->projectorType !== ProjectorType::AggregateInstance) {
                continue;
            }
            $subId = (string) Str::of($config->projectorClass)->snake();
            if ($subId === $subscriptionId) {
                $projectorClass = $config->projectorClass;
                $async = $config->async;
                if (class_exists($projectorClass)) {
                    try {
                        $reflection = new \ReflectionClass($projectorClass);
                        $projectorFilePath = $reflection->getFileName();
                    } catch (\Throwable) {
                    }
                }
                break;
            }
        }

        $poisonMessageCount = DB::table('poison_messages')
            ->where('subscription_id', $subscriptionId)
            ->where('status', 'poisoned')
            ->count();

        $search = $request->query('search', '');
        $sortBy = $request->query('sort', 'aggregate_id');
        $sortDir = $request->query('dir', 'asc');
        $perPage = (int) $request->query('per_page', '50');
        $page = (int) $request->query('page', '1');

        $checkpointPrefix = $subscription->subscriptionId . '_' . $subscription->aggregateType . '###';

        $query = DB::table('aggregate_instances as ai')
            ->leftJoin('checkpoint_store as cs', 'cs.stream_identifier', '=', DB::raw('CONCAT(?, ai.aggregate_id)'))
            ->addBinding($checkpointPrefix, 'join')
            ->where('ai.aggregate_type', $subscription->aggregateType)
            ->when($search !== '', fn ($q) => $q->where('ai.aggregate_id', 'like', '%' . $search . '%'))
            ->selectRaw('ai.aggregate_id, ai.stream_position as max_position, COALESCE(cs.position, 0) as position, (ai.stream_position - COALESCE(cs.position, 0)) as `lag`');

        $instanceCount = DB::table('aggregate_instances')
            ->where('aggregate_type', $subscription->aggregateType)
            ->when($search !== '', fn ($q) => $q->where('aggregate_id', 'like', '%' . $search . '%'))
            ->count();

        $sortColumn = match ($sortBy) {
            'lag' => '`lag`',
            'position' => '`position`',
            'max_position' => '`max_position`',
            default => '`ai`.`aggregate_id`',
        };

        $sortDirection = $sortDir === 'desc' ? 'desc' : 'asc';

        $instances = $query
            ->orderByRaw("{$sortColumn} {$sortDirection}")
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get()
            ->map(fn ($row) => [
                'aggregate_id' => $row->aggregate_id,
                'position' => (int) $row->position,
                'max_position' => (int) $row->max_position,
            ])
            ->toArray();

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
}
