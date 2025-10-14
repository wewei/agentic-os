/**
 * Example usage of @agentic-os/cli components
 * 
 * This demonstrates how to use the CLI components programmatically
 * without running the full TUI application.
 */

import {
  getConfigPath,
  getDefaultConfig,
  loadConfig,
  saveConfig,
  updateModuleConfig,
} from './config.ts';
import { createInitialState, handleUserInput } from './app.ts';

// Example 1: Working with configuration
console.log('Example 1: Configuration Management\n');

// Get config path
const configPath = getConfigPath();
console.log('Config path:', configPath);

// Load or create config
let config = loadConfig();
console.log('Loaded config:', JSON.stringify(config, null, 2));

// Update a module's config
config = updateModuleConfig(config, 'cli', {
  theme: 'dark',
  messageLimit: 500,
});

console.log('\nUpdated CLI config:', config.cli);

// Example 2: Working with application state
console.log('\n\nExample 2: Application State Management\n');

// Create initial state
let state = createInitialState(config);
console.log('Initial messages:', state.messages.length);

// Simulate user interaction
state = handleUserInput(state, 'Hello, AI!');
console.log('After first input:', state.messages.length);

state = handleUserInput(state, '/help');
console.log('After help command:', state.messages.length);

// Display all messages
console.log('\nMessage history:');
state.messages.forEach((msg, idx) => {
  console.log(`  ${idx + 1}. [${msg.type}] ${msg.content.slice(0, 50)}...`);
});

// Example 3: Custom message handling
console.log('\n\nExample 3: Custom Message Processing\n');

const processMessages = (messages: typeof state.messages) => {
  const stats = {
    user: 0,
    agent: 0,
    system: 0,
    error: 0,
  };

  messages.forEach((msg) => {
    stats[msg.type]++;
  });

  return stats;
};

const stats = processMessages(state.messages);
console.log('Message statistics:', stats);

// Example 4: Configuration validation
console.log('\n\nExample 4: Configuration Access\n');

const cliConfig = config.cli as { theme?: string; messageLimit?: number };
console.log('CLI theme:', cliConfig.theme);
console.log('Message limit:', cliConfig.messageLimit);

const modelConfig = config.model as { provider?: string; model?: string };
console.log('Model provider:', modelConfig.provider);
console.log('Model name:', modelConfig.model);

console.log('\n✅ All examples completed!');

