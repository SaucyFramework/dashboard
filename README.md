# Saucy Dashboard

[![Latest Version on Packagist](https://img.shields.io/packagist/v/saucy/dashboard.svg?style=flat-square)](https://packagist.org/packages/saucy/dashboard)
[![GitHub Tests Action Status](https://img.shields.io/github/actions/workflow/status/SaucyFramework/dashboard/run-tests.yml?branch=main&label=tests&style=flat-square)](https://github.com/SaucyFramework/dashboard/actions?query=workflow%3Arun-tests+branch%3Amain)
[![Total Downloads](https://img.shields.io/packagist/dt/saucy/dashboard.svg?style=flat-square)](https://packagist.org/packages/saucy/dashboard)

A monitoring dashboard for the Saucy event sourcing framework's projections. Provides a React-based UI to view projection status, activity logs, and manage projections (pause, resume, replay, trigger).

## Installation

Install the package via composer:

```bash
composer require saucy/dashboard
```

Publish the frontend assets:

```bash
php artisan vendor:publish --tag="saucy-dashboard-assets"
```

> **Important:** Re-run this command after updating the package to get the latest frontend build.

Optionally, publish the config file:

```bash
php artisan vendor:publish --tag="saucy-dashboard-config"
```

## Configuration

The published config file (`config/saucy-dashboard.php`):

```php
return [
    'password' => env('SAUCY_DASHBOARD_PASSWORD', null),
];
```

### Password Protection

By default the dashboard is open to anyone. To require a password, add to your `.env`:

```
SAUCY_DASHBOARD_PASSWORD=your-secret-password
```

When set, visitors must enter the password on a login screen. The authenticated session is managed via Laravel's session driver.

## Usage

Once installed, navigate to:

```
https://your-app.com/saucy-dashboard
```

The dashboard provides:

- **Dashboard** — main overview page
- **Projections** — lists all registered projections with their position and status (running, paused, standby), auto-refreshes every 2 seconds
- **Projection detail** — click a projection to see its activity log (refreshes every second) and action buttons:
  - **Pause / Resume** — pause or resume the projection
  - **Replay** — trigger a full replay from the beginning
  - **Trigger** — manually start the process

## Testing

```bash
composer test
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security Vulnerabilities

Please review [our security policy](../../security/policy) on how to report security vulnerabilities.

## Credits

- [Robertbaelde](https://github.com/Robertbaelde)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
