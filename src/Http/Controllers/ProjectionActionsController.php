<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Saucy\Core\Subscriptions\AllStream\AllStreamSubscriptionProcessManager;

class ProjectionActionsController
{
    public function __construct(
        private AllStreamSubscriptionProcessManager $processManager,
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
}
