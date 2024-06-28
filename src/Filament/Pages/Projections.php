<?php

namespace Saucy\Dashboard\Filament\Pages;

use Livewire\Component;
use Livewire\Features\SupportPageComponents\BaseLayout;
use Saucy\Core\Subscriptions\AllStream\AllStreamSubscriptionRegistry;
use Saucy\Core\Subscriptions\Infra\RunningProcess;
use Saucy\Core\Subscriptions\Infra\RunningProcesses;

final class Projections extends Component
{
    public function navigate(string $streamId): void
    {
        $this->redirect(route('saucy-dashboard.projections.show', ['streamId' => $streamId]));
    }

    public function render(AllStreamSubscriptionRegistry $registry, RunningProcesses $runningProcesses)
    {
        $data = [];
        $allRunning = $runningProcesses->all();
        foreach ($registry->streams as $streamId => $stream) {
            $data[$streamId] = [
                'stream' => $stream,
                'process' => array_values(array_filter($allRunning, fn (RunningProcess $process) => $process->subscriptionId === $streamId))[0] ?? null,
            ];
        }
        return view('saucy-dashboard::projections', [
            'streams' => $data,
        ])
            ->layout('saucy-dashboard::components.layouts.app', ['title' => 'Projections']);
    }
}
