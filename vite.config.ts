import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        settings: 'settings.html'
      }
    }
  },
  server: {
    host: true, // Listen on all addresses (allows access from Windows host)
    port: 5173,
    watch: {
      // Use polling for WSL2
      usePolling: true,
      interval: 100 // Check for changes every 100ms
    },
    hmr: {
      // HMR settings for WSL
      protocol: 'ws',
      host: 'localhost',
      port: 24678 // Use specific port for WebSocket HMR
    }
  },
  resolve: {
    preserveSymlinks: true // Optimize for WSL2 file system
  },
  // Ensure service worker updates trigger page reload
  plugins: [
    {
      name: 'sw-hmr',
      handleHotUpdate({ file, server }) {
        if (file.endsWith('sw.js')) {
          server.ws.send({
            type: 'full-reload',
            path: '*'
          });
        }
      }
    }
  ]
})