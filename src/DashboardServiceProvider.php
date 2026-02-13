<?php

namespace Saucy\Dashboard;

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
}
