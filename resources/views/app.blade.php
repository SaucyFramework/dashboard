<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Saucy Dashboard</title>
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css">
        <link href="{{ asset('vendor/saucy-dashboard/app.css') }}" rel="stylesheet">
    </head>
    <body class="h-full">
        <div id="app"></div>
        <script>
            window.__SAUCY_CONFIG__ = {
                basePath: '/saucy-dashboard'
            };
        </script>
        <script src="{{ asset('vendor/saucy-dashboard/app.js') }}"></script>
    </body>
</html>
