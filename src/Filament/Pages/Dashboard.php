<?php

namespace Saucy\Dashboard\Filament\Pages;

use Livewire\Component;
use Livewire\Features\SupportPageComponents\BaseLayout;

final class Dashboard extends Component
{
    public function render()
    {
        return view('saucy-dashboard::dashboard')
            ->layout('saucy-dashboard::components.layouts.app', ['title' => 'Dashboard']);
    }
}
