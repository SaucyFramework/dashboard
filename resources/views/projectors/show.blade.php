<div>
    <header>
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-between">
            <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">{{str_replace('_', ' ', $streamId)}}</h1>
            <div class="mt-5 flex lg:ml-4 lg:mt-0">
                @if($paused)
                    <span class="ml-3 hidden sm:block">
                  <button  wire:loading.class="opacity-50" wire:click="resume" type="button" class="inline-flex items-center rounded-md bg-orange-600/10 px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-800/20">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="-ml-0.5 mr-1.5 h-5 w-5">
                        <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
                    </svg>

                    Resume
                  </button>
                </span>
                @else
                    <span class="ml-3 hidden sm:block">
                  <button  wire:loading.class="opacity-50" wire:click="pause" type="button" class="inline-flex items-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-800/20">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="-ml-0.5 mr-1.5 h-5 w-5" >
                        <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clip-rule="evenodd" />
                      </svg>
                    Pause
                  </button>
                </span>
                @endif
                <span class="ml-3 hidden sm:block">
                  <button  wire:loading.class="opacity-50" wire:click="startReplay" type="button" class="inline-flex items-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-800/20">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="-ml-0.5 mr-1.5 h-5 w-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
                    </svg>
                    Replay
                  </button>
                </span>
                <span class="sm:ml-3">
                  <button wire:loading.class="opacity-50" wire:click="trigger" type="button" class="inline-flex items-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="-ml-0.5 mr-1.5 h-5 w-5" >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                    </svg>
                    Trigger
                  </button>
                </span>
            </div>
        </div>
    </header>
    <main>
        <div class="mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div class="overflow-hidden rounded-lg bg-white shadow">
                <div class="px-4 py-5 sm:p-6">
                    <div class="px-4 sm:px-6 lg:px-8">
                        <div class="sm:flex sm:items-center">
                            <div class="sm:flex-auto">
                                <h1 class="text-base font-semibold leading-6 text-gray-900">Projections</h1>
                                <p class="mt-2 text-sm text-gray-700"></p>
                            </div>
                        </div>
                        <div class="mt-8 flow-root">
                            <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <table class="min-w-full divide-y divide-gray-300">
                                        <thead>
                                        <tr>
                                            <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Type</th>
                                            <th scope="col" class="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20">Message</th>
                                            <th scope="col" class="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20">Occurred at</th>
                                            <th scope="col" class="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20">extra </th>
                                        </tr>
                                        </thead>
                                        <tbody class="divide-y divide-gray-200" wire:poll.keep-alive.1s >
                                        @foreach($activity as $a)
                                            <tr>
                                                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">{{$a->type}}</td>
                                                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">{{$a->message}}</td>
                                                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">{{$a->occurredAt->format('Y-m-d H:i:s')}}</td>
                                                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">
                                                    @if($a->type === 'store_checkpoint')
                                                        new position: {{$a->data['position'] ?? 'na'}} <br>
                                                        @foreach($a->data['messages_processed'] ?? [] as $key => $data)
                                                            {{$key}}: count: {{$data['count']}}, max time:{{$data['max_time']}}, total_time:{{$data['total_time']}} <br>
                                                        @endforeach
                                                    @endif
                                                    @if($a->type === 'loading_events')
                                                        from: {{$a->data['fromPosition'] ?? 'na'}}
                                                    @endif
                                                    @if($a->type === 'handled_message')
                                                        id: {{$a->data['message_id'] ?? 'na'}} <br>
                                                        type: {{$a->data['type'] ?? 'na'}} <br>
                                                        duration: {{$a->data['time_to_handle'] ?? 'na'}}ms <br>
                                                    @endif
                                                </td>
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
