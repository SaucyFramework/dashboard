<?php

namespace Saucy\Dashboard;

use Illuminate\Support\Facades\Blade;
use Livewire\Livewire;
use Saucy\Dashboard\Filament\Pages\Dashboard;
use Saucy\Dashboard\Filament\Pages\Projections;
use Saucy\Dashboard\Filament\Pages\ShowProjection;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class DashboardServiceProvider extends PackageServiceProvider
{
    public function packageBooted(): void
    {
        Blade::anonymousComponentPath(__DIR__.'/../resources/views/components', 'saucy-dashboard');
        Livewire::component('saucy-dashboard::dashboard', Dashboard::class);
        Livewire::component('saucy-dashboard::projections', Projections::class);
        Livewire::component('saucy-dashboard::show-projection', ShowProjection::class);
    }

    public function configurePackage(Package $package): void
    {
        /*
         * This class is a Package Service Provider
         *
         * More info: https://github.com/spatie/laravel-package-tools
         */
        $package
            ->name('saucy-dashboard')
            ->hasConfigFile()
            ->hasViews()
            ->hasRoutes('web')
            ->hasAssets();
//            ->hasAssets();
//            ->hasMigration('create_dashboard_table')
//            ->hasCommand(DashboardCommand::class);
    }
}
