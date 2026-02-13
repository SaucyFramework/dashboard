<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Saucy\Core\Subscriptions\AllStream\AllStreamSubscriptionRegistry;
use Saucy\Core\Subscriptions\Checkpoints\CheckpointNotFound;
use Saucy\Core\Subscriptions\Infra\RunningProcess;
use Saucy\Core\Subscriptions\Infra\RunningProcesses;
use Saucy\Core\Subscriptions\Metrics\ActivityStreamLogger;

class ProjectionsController
{
    public function index(AllStreamSubscriptionRegistry $registry, RunningProcesses $runningProcesses): JsonResponse
    {
        $data = [];
        $allRunning = $runningProcesses->all();

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
            ];
        }

        return response()->json(['projections' => $data]);
    }

    public function show(string $streamId, ActivityStreamLogger $activityStreamLogger, RunningProcesses $runningProcesses): JsonResponse
    {
        $activity = array_map(fn ($a) => [
            'type' => $a->type,
            'message' => $a->message,
            'occurred_at' => $a->occurredAt->format('Y-m-d H:i:s'),
            'data' => $a->data,
        ], $activityStreamLogger->getLog($streamId));

        return response()->json([
            'stream_id' => $streamId,
            'paused' => $runningProcesses->isPaused($streamId),
            'activity' => $activity,
        ]);
    }
}
