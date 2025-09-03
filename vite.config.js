import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
    base: './',
    plugins: [
        vue(),
        vuetify({ autoImport: true }),
    ],
    server: {
        port: 3000,
    },
    build: {
        outDir: 'dist',
    },
});
