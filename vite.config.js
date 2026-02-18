import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    publicDir: false,
    build: {
        outDir: 'resources/dist',
        emptyOutDir: true,
        rollupOptions: {
            input: 'resources/js/main.jsx',
            output: {
                entryFileNames: 'app.js',
                assetFileNames: 'app.[ext]',
            },
        },
    },
});
