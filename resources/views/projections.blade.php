<div>
    <header>
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">Projections</h1>
        </div>
    </header>
    <main>
        <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div class="overflow-hidden rounded-lg bg-white shadow">
                <div class="px-4 py-5 sm:p-6">
                    <div class="px-4 sm:px-6 lg:px-8">
                        <div class="sm:flex sm:items-center">
                            <div class="sm:flex-auto">
                                <h1 class="text-base font-semibold leading-6 text-gray-900">Projections</h1>
                                <p class="mt-2 text-sm text-gray-700"></p>
                            </div>
                            <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                            </div>
                        </div>
                        <div class="mt-8 flow-root">
                            <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <table class="min-w-full divide-y divide-gray-300">
                                        <thead>
                                        <tr>
                                            <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Stream</th>
                                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Position</th>
                                            <th scope="col" class="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20">Status</th>
                                        </tr>
                                        </thead>
                                        <tbody class="divide-y divide-gray-200" wire:poll.keep-alive>
                                        @foreach($streams as $streamIdentifier => $data)
                                            <tr wire:click="navigate('{{$streamIdentifier}}')">
                                                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{{$streamIdentifier}}</td>
                                                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{$data['stream']->checkpointStore->get($streamIdentifier)->position}}</td>
                                                @if($data['process'] !== null)
                                                    @if($data['process']->paused)
                                                        <td class="py-4 pl-0 pr-4 text-sm leading-6 sm:pr-8 lg:pr-20">
                                                            <div class="flex items-center justify-end gap-x-2 sm:justify-start">
                                                                <div class="flex-none rounded-full bg-orange-400/10 p-1 text-orange-400">
                                                                    <div class="h-1.5 w-1.5 rounded-full bg-current"></div>
                                                                </div>
                                                                <div class="hidden text-black sm:block">{{$data['process']->pausedReason}}</div>
                                                            </div>
                                                        </td>
                                                    @else
                                                        <td class="py-4 pl-0 pr-4 text-sm leading-6 sm:pr-8 lg:pr-20">
                                                            <div class="flex items-center justify-end gap-x-2 sm:justify-start">
                                                                <div class="flex-none rounded-full bg-green-400/10 p-1 text-green-400">
                                                                    <div class="h-1.5 w-1.5 rounded-full bg-current"></div>
                                                                </div>
                                                                <div class="hidden text-black sm:block">{{$data['process']?->status}}</div>
                                                            </div>
                                                        </td>
                                                    @endif
                                                @else
                                                    <td class="py-4 pl-0 pr-4 text-sm leading-6 sm:pr-8 lg:pr-20">
                                                        <div class="flex items-center justify-end gap-x-2 sm:justify-start">
                                                            <div class="flex-none rounded-full bg-blue-400/10 p-1 text-blue-400">
                                                                <div class="h-1.5 w-1.5 rounded-full bg-current"></div>
                                                            </div>
                                                            <div class="hidden text-black sm:block">standby</div>
                                                        </div>
                                                    </td>
                                                @endif
                                            </tr>
                                        @endforeach
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</div>
