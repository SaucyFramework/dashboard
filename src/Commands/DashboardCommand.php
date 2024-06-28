<?php

namespace Saucy\Dashboard\Commands;

use Illuminate\Console\Command;

class DashboardCommand extends Command
{
    public $signature = 'dashboard';

    public $description = 'My command';

    public function handle(): int
    {
        $this->comment('All done');

        return self::SUCCESS;
    }
}
