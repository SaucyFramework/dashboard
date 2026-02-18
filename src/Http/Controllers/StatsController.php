<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Saucy\Core\Subscriptions\AllStream\AllStreamSubscriptionRegistry;
use Saucy\Core\Subscriptions\Checkpoints\CheckpointNotFound;
use Saucy\Core\Subscriptions\Infra\RunningProcess;
use Saucy\Core\Subscriptions\Infra\RunningProcesses;

class StatsController
{
    public function __invoke(AllStreamSubscriptionRegistry $registry, RunningProcesses $runningProcesses): JsonResponse
    {
        $maxPosition = DB::table('event_store')->max('global_position') ?? 0;
        $allRunning = $runningProcesses->all();

        $running = 0;
        $paused = 0;
        $standby = 0;
        $behind = 0;

        foreach ($registry->streams as $streamId => $stream) {
            $process = array_values(array_filter($allRunning, fn (RunningProcess $process) => $process->subscriptionId === $streamId))[0] ?? null;

            if ($process !== null) {
                if ($process->paused) {
                    $paused++;
                } else {
                    $running++;
                }
            } else {
                $standby++;
            }

            try {
                $position = $stream->checkpointStore->get($streamId)->position;
            } catch (CheckpointNotFound) {
                $position = 0;
            }

            if ($position < $maxPosition) {
                $behind++;
            }
        }

        $poisonCounts = [
            'poisoned' => DB::table('poison_messages')->where('status', 'poisoned')->count(),
            'resolved' => DB::table('poison_messages')->where('status', 'resolved')->count(),
            'skipped' => DB::table('poison_messages')->where('status', 'skipped')->count(),
        ];

        return response()->json([
            'total_events' => $maxPosition,
            'projections' => [
                'total' => count($registry->streams),
                'running' => $running,
                'paused' => $paused,
                'standby' => $standby,
                'behind' => $behind,
            ],
            'poison_messages' => $poisonCounts,
        ]);
    }
}
