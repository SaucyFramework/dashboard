<?php

namespace Saucy\Dashboard\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Authenticate
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('saucy-dashboard.password') === null) {
            return $next($request);
        }

        if ($request->session()->get('saucy-dashboard.authenticated') === true) {
            return $next($request);
        }

        if ($request->expectsJson() || $request->is('*/api/*')) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        return $next($request);
    }
}
