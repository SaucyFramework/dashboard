<?php

namespace Saucy\Dashboard;

use Saucy\Core\Framework\BuildSaucyProjectMappings;
use Saucy\Core\Projections\ProjectorMap;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class DashboardServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('saucy-dashboard')
            ->hasConfigFile()
            ->hasViews()
            ->hasRoutes('web')
            ->hasAssets();
    }

    public function packageBooted(): void
    {
        $this->app->bindIf(ProjectorMap::class, function ($app) {
            return $app->make(BuildSaucyProjectMappings::class)->get()->projectorMap;
        });
    }
}
