import { defineConfig } from 'vite';
import viteSentryConsolePlugin from './vite-sentry-console-plugin';

export default defineConfig({
  plugins: [
    // viteSentryConsolePlugin({
    //   logFilePath: './sentry-console-logs.json',
    //   commandFilePath: './console-commands.json',
    //   sentryDsn: null, // Disable Sentry to avoid CDN issues
    //   captureConsole: true,
    //   enableCommandExecution: false // Disable command execution to avoid syntax errors
    // })
  ],
  server: {
    port: 8080,
    host: true,
    watch: {
      usePolling: true,
      interval: 100
    },
    hmr: {
      port: 8080
    }
  },
  resolve: {
    preserveSymlinks: true
  }
});