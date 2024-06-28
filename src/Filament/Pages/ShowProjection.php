<?php

namespace Saucy\Dashboard\Filament\Pages;

use Livewire\Component;
use Livewire\Features\SupportPageComponents\BaseLayout;
use Saucy\Core\Subscriptions\AllStream\AllStreamSubscriptionProcessManager;
use Saucy\Core\Subscriptions\AllStream\AllStreamSubscriptionRegistry;
use Saucy\Core\Subscriptions\Infra\RunningProcesses;
use Saucy\Core\Subscriptions\Metrics\ActivityStreamLogger;

final class ShowProjection extends Component
{
    public string $streamId;
    public string $message;

    public function mount($streamId)
    {
        $this->streamId = $streamId;
    }

    public function pause(AllStreamSubscriptionProcessManager $allStreamSubscriptionProcessManager): void
    {
        $allStreamSubscriptionProcessManager->pause($this->streamId);
    }

    public function resume(AllStreamSubscriptionProcessManager $allStreamSubscriptionProcessManager): void
    {
        $allStreamSubscriptionProcessManager->resume($this->streamId);
    }

    public function trigger(AllStreamSubscriptionProcessManager $allStreamSubscriptionProcessManager): void
    {
        $allStreamSubscriptionProcessManager->startProcess($this->streamId);
        $this->dispatch('notify', message: 'Process started');
    }

    public function startReplay(AllStreamSubscriptionProcessManager $allStreamSubscriptionProcessManager): void
    {
        $allStreamSubscriptionProcessManager->replaySubscription($this->streamId);
        $this->dispatch('notify', message: 'projection replay started');
    }

    public function render(ActivityStreamLogger $activityStreamLogger, RunningProcesses $runningProcesses)
    {
        return view('saucy-dashboard::projectors.show', [
            'streams' => [],
            'paused' => $runningProcesses->isPaused($this->streamId),
            'activity' => $activityStreamLogger->getLog($this->streamId),
        ])
            ->layout('saucy-dashboard::components.layouts.app', ['title' => 'Projection: ' . $this->streamId]);
    }
}
