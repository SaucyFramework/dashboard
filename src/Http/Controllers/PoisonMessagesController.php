<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Saucy\Core\Subscriptions\PoisonMessages\PoisonMessage;
use Saucy\Core\Subscriptions\PoisonMessages\PoisonMessageManager;
use Saucy\Core\Subscriptions\PoisonMessages\PoisonMessageStore;

class PoisonMessagesController
{
    public function index(Request $request, PoisonMessageStore $store): JsonResponse
    {
        $subscriptionId = $request->query('subscription');
        $status = $request->query('status', 'poisoned');
        $stream = $request->query('stream');

        $query = DB::table('poison_messages')->orderByDesc('id');

        if ($subscriptionId) {
            $query->where('subscription_id', $subscriptionId);
        }

        if ($stream) {
            $query->where('stream_name', 'like', "%{$stream}%");
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $rows = $query->get();

        $poisonMessages = $rows->map(fn (object $row) => [
            'id' => $row->id,
            'subscription_id' => $row->subscription_id,
            'global_position' => $row->global_position,
            'message_id' => $row->message_id,
            'stream_name' => $row->stream_name,
            'error_message' => $row->error_message,
            'retry_count' => $row->retry_count,
            'status' => $row->status,
            'poisoned_at' => $row->poisoned_at,
            'resolved_at' => $row->resolved_at,
        ]);

        $counts = [
            'poisoned' => DB::table('poison_messages')->where('status', 'poisoned')->count(),
            'resolved' => DB::table('poison_messages')->where('status', 'resolved')->count(),
            'skipped' => DB::table('poison_messages')->where('status', 'skipped')->count(),
        ];

        return response()->json([
            'poison_messages' => $poisonMessages,
            'counts' => $counts,
        ]);
    }

    public function show(int $id, PoisonMessageStore $store): JsonResponse
    {
        $message = $store->get($id);

        return response()->json([
            'poison_message' => $this->serializeMessage($message),
        ]);
    }

    public function retry(int $id, PoisonMessageManager $manager): JsonResponse
    {
        try {
            $manager->retry($id);

            return response()->json([
                'success' => true,
                'message' => "Poison message #{$id} retried successfully and resolved.",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Retry failed: '.$e->getMessage(),
            ]);
        }
    }

    public function skip(int $id, PoisonMessageManager $manager): JsonResponse
    {
        $manager->skip($id);

        return response()->json([
            'success' => true,
            'message' => "Poison message #{$id} has been skipped.",
        ]);
    }

    public function bulkRetry(Request $request, PoisonMessageManager $manager): JsonResponse
    {
        $ids = $request->input('ids', []);
        $results = [];

        foreach ($ids as $id) {
            try {
                $manager->retry($id);
                $results[$id] = ['success' => true];
            } catch (\Throwable $e) {
                $results[$id] = ['success' => false, 'error' => $e->getMessage()];
            }
        }

        return response()->json([
            'success' => true,
            'results' => $results,
        ]);
    }

    public function bulkSkip(Request $request, PoisonMessageManager $manager): JsonResponse
    {
        $ids = $request->input('ids', []);
        $results = [];

        foreach ($ids as $id) {
            try {
                $manager->skip($id);
                $results[$id] = ['success' => true];
            } catch (\Throwable $e) {
                $results[$id] = ['success' => false, 'error' => $e->getMessage()];
            }
        }

        return response()->json([
            'success' => true,
            'results' => $results,
        ]);
    }

    private function serializeMessage(PoisonMessage $message): array
    {
        return [
            'id' => $message->id,
            'subscription_id' => $message->subscriptionId,
            'global_position' => $message->globalPosition,
            'message_id' => $message->messageId,
            'stream_name' => $message->streamName,
            'error_message' => $message->errorMessage,
            'stack_trace' => $message->stackTrace,
            'retry_count' => $message->retryCount,
            'status' => $message->status->value,
            'poisoned_at' => $message->poisonedAt->format('Y-m-d H:i:s'),
            'resolved_at' => $message->resolvedAt?->format('Y-m-d H:i:s'),
        ];
    }
}
