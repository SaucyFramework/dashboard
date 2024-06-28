<?php

use Illuminate\Support\Facades\Route;
use Saucy\Dashboard\Filament\Pages\Dashboard;
use Saucy\Dashboard\Filament\Pages\Projections;
use Saucy\Dashboard\Filament\Pages\ShowProjection;

Route::group([
    'middleware' => ['web'],
    'prefix' => 'saucy-dashboard',
    'as' => 'saucy-dashboard.',
], function () {
    Route::get('/', Dashboard::class)->name('dashboard');
    Route::get('projections', Projections::class)->name('projections');
    Route::get('projections/{streamId}', ShowProjection::class)->name('projections.show');
});
