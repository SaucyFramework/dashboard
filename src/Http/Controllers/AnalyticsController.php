<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController
{
    public function eventThroughput(Request $request): JsonResponse
    {
        $hours = (int) $request->query('hours', 24);
        $hours = min($hours, 168); // max 7 days

        $rows = DB::table('event_store')
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour, COUNT(*) as count")
            ->where('created_at', '>=', now()->subHours($hours))
            ->groupByRaw("DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')")
            ->orderBy('hour')
            ->get();

        return response()->json([
            'throughput' => $rows->map(fn (object $row) => [
                'hour' => $row->hour,
                'count' => (int) $row->count,
            ]),
        ]);
    }

    public function eventTypeDistribution(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 7);
        $days = min($days, 30);

        $rows = DB::table('event_store')
            ->selectRaw('message_type, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('message_type')
            ->orderByDesc('count')
            ->limit(20)
            ->get();

        return response()->json([
            'event_types' => $rows->map(fn (object $row) => [
                'type' => $row->message_type,
                'count' => (int) $row->count,
            ]),
        ]);
    }

    public function processingSpeed(Request $request): JsonResponse
    {
        $streamId = $request->query('stream_id');
        $hours = (int) $request->query('hours', 24);
        $hours = min($hours, 168);

        $query = DB::table('subscription_activity_stream_log')
            ->where('type', 'store_checkpoint')
            ->where('occurred_at', '>=', now()->subHours($hours))
            ->orderBy('occurred_at');

        if ($streamId) {
            $query->where('stream_id', $streamId);
        }

        $rows = $query->get();

        $entries = [];
        foreach ($rows as $row) {
            $data = is_string($row->data) ? json_decode($row->data, true) : (array) $row->data;
            $messagesProcessed = $data['messages_processed'] ?? [];

            if (empty($messagesProcessed)) {
                continue;
            }

            $totalCount = 0;
            $totalTime = 0;
            $maxTime = 0;

            foreach ($messagesProcessed as $typeMetrics) {
                if (is_array($typeMetrics)) {
                    $totalCount += $typeMetrics['count'] ?? 0;
                    $totalTime += $typeMetrics['total_time'] ?? 0;
                    $maxTime = max($maxTime, $typeMetrics['max_time'] ?? 0);
                }
            }

            if ($totalCount > 0) {
                $entries[] = [
                    'stream_id' => $row->stream_id,
                    'occurred_at' => $row->occurred_at,
                    'events_processed' => $totalCount,
                    'total_time_ms' => round($totalTime * 1000, 1),
                    'avg_time_ms' => round(($totalTime / $totalCount) * 1000, 2),
                    'max_time_ms' => round($maxTime * 1000, 2),
                    'events_per_second' => $totalTime > 0 ? round($totalCount / $totalTime, 1) : 0,
                    'per_type' => $messagesProcessed,
                ];
            }
        }

        return response()->json([
            'processing_speed' => $entries,
        ]);
    }
}
