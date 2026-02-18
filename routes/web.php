<?php

use Illuminate\Support\Facades\Route;
use Saucy\Dashboard\Http\Controllers\AnalyticsController;
use Saucy\Dashboard\Http\Controllers\AuthController;
use Saucy\Dashboard\Http\Controllers\EventStoreController;
use Saucy\Dashboard\Http\Controllers\PoisonMessagesController;
use Saucy\Dashboard\Http\Controllers\ProjectionActionsController;
use Saucy\Dashboard\Http\Controllers\ProjectionsController;
use Saucy\Dashboard\Http\Controllers\SnapshotsController;
use Saucy\Dashboard\Http\Controllers\StatsController;
use Saucy\Dashboard\Http\Middleware\Authenticate;

Route::group([
    'middleware' => ['web'],
    'prefix' => 'saucy-dashboard',
], function () {
    Route::get('api/auth/check', [AuthController::class, 'check']);
    Route::post('api/auth/login', [AuthController::class, 'login']);
    Route::post('api/auth/logout', [AuthController::class, 'logout']);

    Route::group(['middleware' => [Authenticate::class]], function () {
        Route::get('api/stats', StatsController::class);
        Route::get('api/projections', [ProjectionsController::class, 'index']);
        Route::get('api/projections/{streamId}', [ProjectionsController::class, 'show']);
        Route::post('api/projections/{streamId}/pause', [ProjectionActionsController::class, 'pause']);
        Route::post('api/projections/{streamId}/resume', [ProjectionActionsController::class, 'resume']);
        Route::post('api/projections/{streamId}/trigger', [ProjectionActionsController::class, 'trigger']);
        Route::post('api/projections/{streamId}/replay', [ProjectionActionsController::class, 'replay']);

        Route::get('api/analytics/throughput', [AnalyticsController::class, 'eventThroughput']);
        Route::get('api/analytics/event-types', [AnalyticsController::class, 'eventTypeDistribution']);
        Route::get('api/analytics/processing-speed', [AnalyticsController::class, 'processingSpeed']);
        Route::get('api/snapshots/{streamId}', [SnapshotsController::class, 'show']);

        Route::get('api/poison-messages', [PoisonMessagesController::class, 'index']);
        Route::get('api/poison-messages/{id}', [PoisonMessagesController::class, 'show']);
        Route::post('api/poison-messages/{id}/retry', [PoisonMessagesController::class, 'retry']);
        Route::post('api/poison-messages/{id}/skip', [PoisonMessagesController::class, 'skip']);
        Route::post('api/poison-messages/bulk-retry', [PoisonMessagesController::class, 'bulkRetry']);
        Route::post('api/poison-messages/bulk-skip', [PoisonMessagesController::class, 'bulkSkip']);

        Route::get('api/events/stream-names', [EventStoreController::class, 'streamNames']);
        Route::get('api/events/types', [EventStoreController::class, 'types']);
        Route::get('api/events/new-count', [EventStoreController::class, 'newEventsCount']);
        Route::get('api/events/{globalPosition}', [EventStoreController::class, 'show']);
        Route::get('api/events', [EventStoreController::class, 'index']);

        Route::get('{any?}', function () {
            return view('saucy-dashboard::app');
        })->where('any', '.*')->name('saucy-dashboard');
    });
});
