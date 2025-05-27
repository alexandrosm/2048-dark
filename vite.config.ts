import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true, // Listen on all addresses, including LAN and WSL
    port: 5173,
    watch: {
      // Use polling for WSL2
      usePolling: true,
      interval: 100
    },
    hmr: {
      // HMR settings for WSL
      protocol: 'ws',
      host: 'localhost'
    }
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