import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
            ],
            refresh: [
                'resources/css/app.css',
                'resources/views/**',
            ],
            // publicDirectory: '',
            // buildDirectory: 'saucy-dashboard',
        }),
    ],
});
