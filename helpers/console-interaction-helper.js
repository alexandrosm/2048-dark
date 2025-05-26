const fs = require('fs').promises;
const path = require('path');

class ConsoleInteractionHelper {
  constructor(commandFilePath = './console-commands.json') {
    this.commandFilePath = path.resolve(commandFilePath);
  }

  /**
   * Execute JavaScript code in the browser console
   * @param {string} code - JavaScript code to execute
   * @returns {Promise<object>} - Command object with ID
   */
  async executeCommand(code) {
    const command = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: code,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Read existing commands
    let commands = [];
    try {
      const content = await fs.readFile(this.commandFilePath, 'utf-8');
      commands = JSON.parse(content);
    } catch (error) {
      // File doesn't exist yet
    }

    // Add new command
    commands.push(command);

    // Write back
    await fs.writeFile(this.commandFilePath, JSON.stringify(commands, null, 2));

    return command;
  }

  /**
   * Get command result
   * @param {string} commandId - Command ID to check
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<object>} - Command with result
   */
  async getCommandResult(commandId, timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const content = await fs.readFile(this.commandFilePath, 'utf-8');
        const commands = JSON.parse(content);
        const command = commands.find(c => c.id === commandId);

        if (command && command.status !== 'pending') {
          return command;
        }
      } catch (error) {
        // Continue polling
      }

      // Wait 100ms before next check
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Command ${commandId} timed out`);
  }

  /**
   * Execute command and wait for result
   * @param {string} code - JavaScript code to execute
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<any>} - Command result
   */
  async executeAndWait(code, timeout = 5000) {
    const command = await this.executeCommand(code);
    const result = await this.getCommandResult(command.id, timeout);

    if (result.error) {
      throw new Error(result.error);
    }

    return result.result;
  }

  /**
   * Read the latest console logs
   * @param {string} logFilePath - Path to log file
   * @returns {Promise<array>} - Array of console logs
   */
  async readConsoleLogs(logFilePath = './sentry-console-logs.json') {
    try {
      const content = await fs.readFile(path.resolve(logFilePath), 'utf-8');
      const data = JSON.parse(content);
      
      // Filter for console logs only
      return data.logs.filter(log => log.type === 'console');
    } catch (error) {
      return [];
    }
  }
}

// Example usage
async function example() {
  const helper = new ConsoleInteractionHelper();

  try {
    // Execute simple command
    const result1 = await helper.executeAndWait('document.title');
    console.log('Page title:', result1);

    // Query DOM
    const result2 = await helper.executeAndWait('document.querySelectorAll("button").length');
    console.log('Number of buttons:', result2);

    // Get element text
    const result3 = await helper.executeAndWait('document.querySelector("h1")?.textContent');
    console.log('H1 text:', result3);

    // Execute more complex code
    const result4 = await helper.executeAndWait(`
      Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.textContent, href: a.href }))
        .slice(0, 5)
    `);
    console.log('First 5 links:', result4);

    // Read console logs
    const logs = await helper.readConsoleLogs();
    console.log('Recent console logs:', logs.slice(-5));

  } catch (error) {
    console.error('Error:', error);
  }
}

module.exports = ConsoleInteractionHelper;

// Run example if called directly
if (require.main === module) {
  example();
}