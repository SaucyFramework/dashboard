<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Saucy\Core\Events\Streams\AggregateStreamName;
use Saucy\Core\Subscriptions\StreamSubscription\StreamSubscriptionReplayManager;
use Saucy\Core\Subscriptions\StreamSubscription\StreamSubscriptionRegistry;
use Saucy\Core\Subscriptions\StreamSubscription\SyncStreamSubscriptionRegistry;

class AggregateProjectionActionsController
{
    public function __construct(
        private StreamSubscriptionReplayManager $replayManager,
        private StreamSubscriptionRegistry $asyncRegistry,
        private SyncStreamSubscriptionRegistry $syncRegistry,
    ) {}

    public function replayAll(string $subscriptionId): JsonResponse
    {
        try {
            $batch = $this->replayManager->replayAll($subscriptionId);

            return response()->json([
                'success' => true,
                'message' => 'Replay started for all aggregate instances',
                'batch_id' => $batch->id,
                'total_jobs' => $batch->totalJobs,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function triggerAll(string $subscriptionId): JsonResponse
    {
        try {
            $batch = $this->replayManager->triggerAll($subscriptionId);

            return response()->json([
                'success' => true,
                'message' => 'Trigger started for all aggregate instances',
                'batch_id' => $batch->id,
                'total_jobs' => $batch->totalJobs,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function replayInstance(string $subscriptionId, string $aggregateId): JsonResponse
    {
        try {
            $subscription = $this->resolveSubscription($subscriptionId);
            $streamName = new AggregateStreamName($subscription->aggregateType, $aggregateId);
            $this->replayManager->replayStream($subscriptionId, $streamName);

            return response()->json([
                'success' => true,
                'message' => "Replay completed for aggregate {$aggregateId}",
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function triggerInstance(string $subscriptionId, string $aggregateId): JsonResponse
    {
        try {
            $subscription = $this->resolveSubscription($subscriptionId);
            $streamName = new AggregateStreamName($subscription->aggregateType, $aggregateId);
            $messagesHandled = $subscription->poll($streamName);

            return response()->json([
                'success' => true,
                'message' => "Triggered aggregate {$aggregateId}, processed {$messagesHandled} events",
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    private function resolveSubscription(string $subscriptionId): \Saucy\Core\Subscriptions\StreamSubscription\StreamSubscription
    {
        try {
            return $this->asyncRegistry->get($subscriptionId);
        } catch (\Exception) {
            return $this->syncRegistry->get($subscriptionId);
        }
    }
}
