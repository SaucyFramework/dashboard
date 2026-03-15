<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Saucy\Core\Projections\Replay\BackgroundReplayManager;
use Saucy\Core\Subscriptions\AllStream\AllStreamSubscriptionProcessManager;

class ProjectionActionsController
{
    public function __construct(
        private AllStreamSubscriptionProcessManager $processManager,
        private BackgroundReplayManager $backgroundReplayManager,
    ) {}

    public function pause(string $streamId): JsonResponse
    {
        $this->processManager->pause($streamId);

        return response()->json(['success' => true, 'message' => 'Projection paused']);
    }

    public function resume(string $streamId): JsonResponse
    {
        $this->processManager->resume($streamId);

        return response()->json(['success' => true, 'message' => 'Projection resumed']);
    }

    public function trigger(string $streamId): JsonResponse
    {
        $this->processManager->startProcess($streamId);

        return response()->json(['success' => true, 'message' => 'Process started']);
    }

    public function replay(string $streamId): JsonResponse
    {
        $this->processManager->replaySubscription($streamId);

        return response()->json(['success' => true, 'message' => 'Projection replay started']);
    }

    public function triggerBackgroundReplay(string $streamId): JsonResponse
    {
        try {
            $this->backgroundReplayManager->triggerReplay($streamId);

            return response()->json(['success' => true, 'message' => 'Background replay triggered']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function startBackgroundReplay(string $streamId): JsonResponse
    {
        try {
            $this->backgroundReplayManager->startReplay($streamId);

            return response()->json(['success' => true, 'message' => 'Background replay started']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function swapBackgroundReplay(string $streamId): JsonResponse
    {
        try {
            $this->backgroundReplayManager->swapReplay($streamId);

            return response()->json(['success' => true, 'message' => 'Replay swapped to live']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function cancelBackgroundReplay(string $streamId): JsonResponse
    {
        try {
            $this->backgroundReplayManager->cancelReplay($streamId);

            return response()->json(['success' => true, 'message' => 'Background replay cancelled']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
