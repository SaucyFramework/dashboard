<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <title>{{ $title ?? 'Page Title' }} test</title>

        <link href="/vendor/saucy-dashboard/test.css" rel="stylesheet">
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css">
    </head>
    <body class="h-full">
        <x-saucy-dashboard::notifications />
        <div class="min-h-full bg-slate-50">
            <nav class="border-b border-gray-200 bg-white">
                <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div class="flex h-16 justify-between">
                        <div class="flex">
                            <div class="flex flex-shrink-0 items-center">
    {{--                            <img class="block h-8 w-auto lg:hidden" src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600" alt="Your Company">--}}
    {{--                            <img class="hidden h-8 w-auto lg:block" src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600" alt="Your Company">--}}
                            </div>
                            <div class="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                                <!-- Current: "border-indigo-500 text-gray-900", Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700" -->
                                @foreach([
                                    'dashboard',
//                                    'events',
                                    'projections',
                                ] as $navRoute)
                                    @if(\Illuminate\Support\Facades\Request::routeIs('saucy-dashboard.' . $navRoute . '*'))
                                        <a href="{{ route('saucy-dashboard.' . $navRoute) }}" class="inline-flex items-center border-b-2 border-indigo-500 px-1 pt-1 text-sm font-medium text-gray-900" aria-current="page">{{ucfirst($navRoute)}}</a>
                                    @else
                                        <a href="{{ route('saucy-dashboard.' . $navRoute) }}" class="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">{{ucfirst($navRoute)}}</a>
                                    @endif
                                @endforeach
                            </div>
                        </div>
                        <div class="hidden sm:ml-6 sm:flex sm:items-center">
                        </div>
                    </div>
                </div>
            </nav>

            <div class="py-10">
               {{$slot}}
            </div>
        </div>
    </body>
</html>
