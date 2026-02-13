<?php

use Illuminate\Support\Facades\Route;
use Saucy\Dashboard\Http\Controllers\AuthController;
use Saucy\Dashboard\Http\Controllers\ProjectionActionsController;
use Saucy\Dashboard\Http\Controllers\ProjectionsController;
use Saucy\Dashboard\Http\Middleware\Authenticate;

Route::group([
    'middleware' => ['web'],
    'prefix' => 'saucy-dashboard',
], function () {
    Route::get('api/auth/check', [AuthController::class, 'check']);
    Route::post('api/auth/login', [AuthController::class, 'login']);
    Route::post('api/auth/logout', [AuthController::class, 'logout']);

    Route::group(['middleware' => [Authenticate::class]], function () {
        Route::get('api/projections', [ProjectionsController::class, 'index']);
        Route::get('api/projections/{streamId}', [ProjectionsController::class, 'show']);
        Route::post('api/projections/{streamId}/pause', [ProjectionActionsController::class, 'pause']);
        Route::post('api/projections/{streamId}/resume', [ProjectionActionsController::class, 'resume']);
        Route::post('api/projections/{streamId}/trigger', [ProjectionActionsController::class, 'trigger']);
        Route::post('api/projections/{streamId}/replay', [ProjectionActionsController::class, 'replay']);

        Route::get('{any?}', function () {
            return view('saucy-dashboard::app');
        })->where('any', '.*')->name('saucy-dashboard');
    });
});
