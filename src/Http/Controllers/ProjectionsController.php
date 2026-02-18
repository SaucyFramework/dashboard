<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Saucy\Core\Projections\ProjectorMap;
use Saucy\Core\Subscriptions\AllStream\AllStreamSubscriptionRegistry;
use Saucy\Core\Subscriptions\Checkpoints\CheckpointNotFound;
use Saucy\Core\Subscriptions\Infra\RunningProcess;
use Saucy\Core\Subscriptions\Infra\RunningProcesses;
use Saucy\Core\Subscriptions\Metrics\ActivityStreamLogger;

class ProjectionsController
{
    public function index(AllStreamSubscriptionRegistry $registry, RunningProcesses $runningProcesses): JsonResponse
    {
        $maxPosition = DB::table('event_store')->max('global_position') ?? 0;
        $data = [];
        $allRunning = $runningProcesses->all();

        $poisonCounts = DB::table('poison_messages')
            ->where('status', 'poisoned')
            ->selectRaw('subscription_id, count(*) as count')
            ->groupBy('subscription_id')
            ->pluck('count', 'subscription_id');

        foreach ($registry->streams as $streamId => $stream) {
            $process = array_values(array_filter($allRunning, fn (RunningProcess $process) => $process->subscriptionId === $streamId))[0] ?? null;

            try {
                $position = $stream->checkpointStore->get($streamId)->position;
            } catch (CheckpointNotFound) {
                $position = 0;
            }

            $data[] = [
                'stream_id' => $streamId,
                'position' => $position,
                'paused' => $process?->paused ?? false,
                'paused_reason' => $process?->pausedReason,
                'status' => $process?->status,
                'has_process' => $process !== null,
                'poison_message_count' => $poisonCounts[$streamId] ?? 0,
            ];
        }

        return response()->json([
            'projections' => $data,
            'max_position' => $maxPosition,
        ]);
    }

    public function show(
        string $streamId,
        AllStreamSubscriptionRegistry $registry,
        ActivityStreamLogger $activityStreamLogger,
        RunningProcesses $runningProcesses,
        ProjectorMap $projectorMap,
    ): JsonResponse {
        $maxPosition = DB::table('event_store')->max('global_position') ?? 0;
        $stream = $registry->get($streamId);
        $allRunning = $runningProcesses->all();
        $process = array_values(array_filter($allRunning, fn (RunningProcess $p) => $p->subscriptionId === $streamId))[0] ?? null;

        try {
            $position = $stream->checkpointStore->get($streamId)->position;
        } catch (CheckpointNotFound) {
            $position = 0;
        }

        $activity = array_map(fn ($a) => [
            'type' => $a->type,
            'message' => $a->message,
            'occurred_at' => $a->occurredAt->format('Y-m-d H:i:s'),
            'data' => $a->data,
        ], $activityStreamLogger->getLog($streamId));

        $poisonMessageCount = DB::table('poison_messages')
            ->where('subscription_id', $streamId)
            ->where('status', 'poisoned')
            ->count();

        // Resolve projector class from ProjectorMap
        $projectorClass = null;
        $projectorFilePath = null;
        foreach ($projectorMap->getProjectorConfigs() as $config) {
            $subId = (string) Str::of($config->projectorClass)->afterLast('\\')->snake();
            if ($subId === $streamId) {
                $projectorClass = $config->projectorClass;
                if (class_exists($projectorClass)) {
                    try {
                        $projectorFilePath = (new \ReflectionClass($projectorClass))->getFileName();
                    } catch (\Throwable) {
                    }
                }
                break;
            }
        }

        return response()->json([
            'stream_id' => $streamId,
            'paused' => $runningProcesses->isPaused($streamId),
            'position' => $position,
            'max_position' => $maxPosition,
            'poison_message_count' => $poisonMessageCount,
            'projector_class' => $projectorClass,
            'projector_file_path' => $projectorFilePath,
            'config' => [
                'page_size' => $stream->streamOptions->pageSize,
                'commit_batch_size' => $stream->streamOptions->commitBatchSize,
                'event_types' => $stream->streamOptions->eventTypes,
                'queue' => $stream->streamOptions->queue,
            ],
            'process' => $process ? [
                'process_id' => $process->processId,
                'status' => $process->status,
                'expires_at' => $process->expiresAt->format('Y-m-d H:i:s'),
                'last_status_at' => $process->lastStatusAt?->format('Y-m-d H:i:s'),
            ] : null,
            'activity' => $activity,
        ]);
    }
}
