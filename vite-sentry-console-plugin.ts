import { Plugin, ViteDevServer } from 'vite';
import fs from 'fs/promises';
import path from 'path';

interface SentryConsolePluginOptions {
  logFilePath?: string;
  commandFilePath?: string;
  sentryDsn?: string;
  enableInProduction?: boolean;
  sessionMode?: boolean;
  captureConsole?: boolean;
  enableCommandExecution?: boolean;
}

interface LogEntry {
  timestamp: string;
  type: 'sentry' | 'console' | 'command-result';
  data: any;
}

interface Command {
  id: string;
  code: string;
  timestamp: string;
  status: 'pending' | 'executed' | 'error';
  result?: any;
  error?: string;
}

function viteSentryConsolePlugin(options: SentryConsolePluginOptions = {}): Plugin {
  const {
    logFilePath = './sentry-console-logs.json',
    commandFilePath = './console-commands.json',
    sentryDsn = 'http://localhost/__sentry_logger__',
    enableInProduction = false,
    sessionMode = true,
    captureConsole = true,
    enableCommandExecution = true
  } = options;

  let server: ViteDevServer;
  let logs: LogEntry[] = [];
  let sessionId: string;
  let commands: Command[] = [];

  // Watch for command file changes
  async function watchCommandFile() {
    if (!enableCommandExecution) return;
    
    const watcher = fs.watch(path.resolve(commandFilePath), async (eventType) => {
      if (eventType === 'change') {
        try {
          const content = await fs.readFile(path.resolve(commandFilePath), 'utf-8');
          const newCommands = JSON.parse(content);
          
          // Find pending commands
          const pendingCommands = newCommands.filter((cmd: Command) => 
            cmd.status === 'pending' && 
            !commands.find(c => c.id === cmd.id)
          );
          
          if (pendingCommands.length > 0) {
            commands = newCommands;
            // Trigger command execution in connected browsers
            server.ws.send({
              type: 'execute-commands',
              commands: pendingCommands
            });
          }
        } catch (error) {
          console.error('Error reading command file:', error);
        }
      }
    });
  }

  return {
    name: 'vite-sentry-console',
    
    configureServer(_server) {
      server = _server;
      
      // Initialize new session
      sessionId = new Date().toISOString();
      
      if (sessionMode) {
        logs = [];
        fs.writeFile(
          path.resolve(logFilePath),
          JSON.stringify({ sessionId, logs: [] }, null, 2)
        ).catch(console.error);
      }

      // Initialize command file
      if (enableCommandExecution) {
        fs.writeFile(
          path.resolve(commandFilePath),
          JSON.stringify([], null, 2)
        ).catch(console.error);
        
        // Start watching for commands
        watchCommandFile();
      }
      
      // Set up endpoints
      server.middlewares.use(async (req, res, next) => {
        // Sentry event endpoint
        if (req.url === '/__sentry_logger__' && req.method === 'POST') {
          let body = '';
          
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              const sentryData = JSON.parse(body);
              
              const logEntry: LogEntry = {
                timestamp: new Date().toISOString(),
                type: 'sentry',
                data: sentryData
              };
              
              logs.push(logEntry);
              await saveLogs();
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('Error processing Sentry data:', error);
              res.writeHead(500);
              res.end(JSON.stringify({ error: 'Failed to process data' }));
            }
          });
          
          return;
        }
        
        // Console log endpoint
        if (req.url === '/__console_logger__' && req.method === 'POST') {
          let body = '';
          
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              const consoleData = JSON.parse(body);
              
              const logEntry: LogEntry = {
                timestamp: new Date().toISOString(),
                type: 'console',
                data: consoleData
              };
              
              logs.push(logEntry);
              await saveLogs();
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('Error processing console data:', error);
              res.writeHead(500);
              res.end(JSON.stringify({ error: 'Failed to process data' }));
            }
          });
          
          return;
        }
        
        // Command result endpoint
        if (req.url === '/__command_result__' && req.method === 'POST') {
          let body = '';
          
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              const result = JSON.parse(body);
              
              // Update command status
              const cmdIndex = commands.findIndex(c => c.id === result.id);
              if (cmdIndex !== -1) {
                commands[cmdIndex] = {
                  ...commands[cmdIndex],
                  status: result.error ? 'error' : 'executed',
                  result: result.result,
                  error: result.error
                };
                
                // Save updated commands
                await fs.writeFile(
                  path.resolve(commandFilePath),
                  JSON.stringify(commands, null, 2)
                );
                
                // Log the result
                const logEntry: LogEntry = {
                  timestamp: new Date().toISOString(),
                  type: 'command-result',
                  data: result
                };
                
                logs.push(logEntry);
                await saveLogs();
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('Error processing command result:', error);
              res.writeHead(500);
              res.end(JSON.stringify({ error: 'Failed to process result' }));
            }
          });
          
          return;
        }
        
        next();
      });
    },
    
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === 'production' && !enableInProduction) {
        return html;
      }
      
      const scripts = [];
      
      // Sentry injection script (only if DSN is provided)
      if (sentryDsn) {
        scripts.push(`
        // Check if Sentry is already loaded
        if (typeof window !== 'undefined' && !window.__SENTRY_LOGGER_INITIALIZED__) {
          window.__SENTRY_LOGGER_INITIALIZED__ = true;
          
          // Load Sentry SDK from CDN
          const script = document.createElement('script');
          script.src = 'https://browser.sentry-cdn.com/7.87.0/bundle.min.js';
          script.crossOrigin = 'anonymous';
          
          script.onload = function() {
            if (window.Sentry) {
              window.Sentry.init({
                dsn: '${sentryDsn}',
                transport: function(options) {
                  return {
                    send: async function(request) {
                      try {
                        const envelope = request.body;
                        const [header, ...items] = envelope;
                        
                        const parsedData = {
                          header: JSON.parse(header),
                          items: items.map(item => {
                            const [itemHeader, itemBody] = item.split('\\n');
                            return {
                              header: JSON.parse(itemHeader),
                              body: itemBody ? JSON.parse(itemBody) : null
                            };
                          })
                        };
                        
                        await fetch('/__sentry_logger__', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(parsedData)
                        });
                        
                        return {};
                      } catch (error) {
                        console.error('Sentry Logger Plugin Error:', error);
                        return {};
                      }
                    },
                    flush: async function(timeout) { return true; }
                  };
                },
                environment: 'development',
                beforeSend(event, hint) {
                  console.log('Sentry Event:', event);
                  return event;
                }
              });
              
              window.addEventListener('error', function(event) {
                if (window.Sentry) window.Sentry.captureException(event.error);
              });
              
              window.addEventListener('unhandledrejection', function(event) {
                if (window.Sentry) window.Sentry.captureException(event.reason);
              });
            }
          };
          
          document.head.appendChild(script);
        }
      `);
      }
      
      // Console capture script
      if (captureConsole) {
        scripts.push(`
          // Console capture
          if (!window.__CONSOLE_CAPTURE_INITIALIZED__) {
            window.__CONSOLE_CAPTURE_INITIALIZED__ = true;
            
            const originalConsole = {
              log: console.log,
              error: console.error,
              warn: console.warn,
              info: console.info,
              debug: console.debug
            };
            
            function captureConsole(method, args) {
              // Call original method
              originalConsole[method].apply(console, args);
              
              // Send to server
              fetch('/__console_logger__', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  method: method,
                  args: Array.from(args).map(arg => {
                    try {
                      return typeof arg === 'object' ? JSON.parse(JSON.stringify(arg)) : arg;
                    } catch (e) {
                      return String(arg);
                    }
                  }),
                  stack: new Error().stack
                })
              }).catch(err => originalConsole.error('Console capture error:', err));
            }
            
            ['log', 'error', 'warn', 'info', 'debug'].forEach(method => {
              console[method] = function(...args) {
                captureConsole(method, args);
              };
            });
          }
        `);
      }
      
      // Command execution script
      if (enableCommandExecution) {
        scripts.push(`
          // Command execution
          if (!window.__COMMAND_EXECUTOR_INITIALIZED__) {
            window.__COMMAND_EXECUTOR_INITIALIZED__ = true;
            
            // Listen for WebSocket messages
            if (typeof window !== 'undefined' && window.import && window.import.meta && window.import.meta.hot) {
              import.meta.hot.on('execute-commands', async (data) => {
                for (const command of data.commands) {
                  let result = null;
                  let error = null;
                  
                  try {
                    // Execute command
                    result = await eval(command.code);
                  } catch (e) {
                    error = e.toString();
                  }
                  
                  // Send result back
                  fetch('/__command_result__', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: command.id,
                      result: result,
                      error: error
                    })
                  });
                }
              });
            }
          }
        `);
      }
      
      // Build injection HTML
      let injection = '';
      
      // Add all scripts (non-module scripts)
      if (scripts.length > 0) {
        injection += `<script>${scripts.join('\n')}</script>`;
      }
      
      return html.replace('</head>', `${injection}</head>`);
    }
  };
  
  async function saveLogs() {
    const fileContent = sessionMode 
      ? { sessionId, logs, totalEvents: logs.length }
      : logs;
      
    await fs.writeFile(
      path.resolve(logFilePath),
      JSON.stringify(fileContent, null, 2)
    );
  }
}

export default viteSentryConsolePlugin;