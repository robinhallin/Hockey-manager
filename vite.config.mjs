import {defineConfig} from 'vite';
// Development preview only. GitHub Pages continues to serve the tracked static files.
export default defineConfig({server:{host:'0.0.0.0',port:4173,strictPort:true,allowedHosts:['terminal.local']}});
