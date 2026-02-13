<?php

namespace Saucy\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController
{
    public function check(Request $request): JsonResponse
    {
        $passwordRequired = config('saucy-dashboard.password') !== null;

        return response()->json([
            'authenticated' => ! $passwordRequired || $request->session()->get('saucy-dashboard.authenticated') === true,
            'password_required' => $passwordRequired,
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $configPassword = config('saucy-dashboard.password');

        if ($configPassword === null) {
            return response()->json(['authenticated' => true]);
        }

        if ($request->input('password') !== $configPassword) {
            return response()->json(['error' => 'Invalid password'], 401);
        }

        $request->session()->put('saucy-dashboard.authenticated', true);

        return response()->json(['authenticated' => true]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->session()->forget('saucy-dashboard.authenticated');

        return response()->json(['authenticated' => false]);
    }
}
