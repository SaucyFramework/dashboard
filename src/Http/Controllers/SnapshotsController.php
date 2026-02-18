<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Saucy\Core\Subscriptions\Metrics\ProjectionSnapshotStore;

class SnapshotsController
{
    public function show(
        string $streamId,
        Request $request,
        ProjectionSnapshotStore $snapshotStore,
    ): JsonResponse {
        $hours = (int) $request->query('hours', 24);
        $hours = min($hours, 168);

        $from = new \DateTime("-{$hours} hours");
        $to = new \DateTime('now');

        $snapshots = $snapshotStore->getForStreamBetween($streamId, $from, $to);

        return response()->json([
            'snapshots' => array_map(fn ($s) => [
                'position' => $s->position,
                'max_position' => $s->maxPosition,
                'recorded_at' => $s->recordedAt->format('Y-m-d H:i:s'),
            ], $snapshots),
        ]);
    }
}
