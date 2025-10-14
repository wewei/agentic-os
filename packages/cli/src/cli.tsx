#!/usr/bin/env bun

import React from 'react';
import { render } from 'react-blessed';

import { App } from './components/App.tsx';
import { loadConfig } from './config.ts';
import type { AppConfig, LayoutConfig } from './types.ts';

/**
 * Check if running in pipe mode (stdin is not a TTY or forced)
 */
const isPipeMode = (forcePipeMode = false): boolean => {
  return forcePipeMode || process.stdin.isTTY === false;
};

/**
 * Read messages from stdin in pipe mode
 */
const readPipeMessages = async (): Promise<AsyncGenerator<string, void, unknown>> => {
  async function* messageGenerator() {
    let buffer = '';
    
    for await (const chunk of process.stdin) {
      buffer += chunk.toString();
      
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      
      for (const part of parts) {
        const message = part.trim();
        if (message) {
          yield message;
        }
      }
    }
    
    if (buffer.trim()) {
      yield buffer.trim();
    }
  }
  
  return messageGenerator();
};

/**
 * Output message to stdout in pipe mode
 */
const outputMessage = (message: string): void => {
  process.stdout.write(message + '\n');
};

/**
 * Output error to stderr in pipe mode
 */
const outputError = (error: string): void => {
  process.stderr.write(error + '\n');
};

/**
 * Handle user input in pipe mode
 */
const handleUserInput = (input: string, config: AppConfig): string => {
  if (input.startsWith('/')) {
    const [cmd] = input.slice(1).split(' ');
    
    switch (cmd) {
      case 'help':
        return getHelpText();
      case 'clear':
        return 'Message history cleared.';
      case 'config':
        return JSON.stringify(config, null, 2);
      default:
        return `Unknown command: ${cmd}. Type /help for available commands.`;
    }
  } else {
    return `Echo: ${input}`;
  }
};

/**
 * Get help text
 */
const getHelpText = (): string => {
  return [
    'Available commands:',
    '  /help   - Show this help message',
    '  /clear  - Clear message history',
    '  /config - Show current configuration',
    '  Ctrl+C or Esc - Exit application',
  ].join('\n');
};

/**
 * Run the CLI application in pipe mode
 */
const runPipeMode = async (configPath?: string): Promise<void> => {
  try {
    const config = loadConfig(configPath);
    const messageReader = await readPipeMessages();
    
    for await (const input of messageReader) {
      try {
        const response = handleUserInput(input, config);
        outputMessage(response);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputError(`Error processing message: ${errorMessage}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputError(`Fatal error in pipe mode: ${errorMessage}`);
    process.exit(1);
  }
};

/**
 * Run the CLI application
 */
const runApp = async (configPath?: string, forcePipeMode = false): Promise<void> => {
  if (isPipeMode(forcePipeMode)) {
    return runPipeMode(configPath);
  }

  const config = loadConfig(configPath);
  const layoutConfig = config.cli?.layout as Partial<LayoutConfig> | undefined;

  // Create a blessed screen for react-blessed
  const blessed = await import('blessed');
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Agentic OS',
    fullUnicode: true,
  });

  // Add exit handler
  screen.key(['escape', 'C-c'], () => {
    process.exit(0);
  });

  const app = <App config={config} layoutConfig={layoutConfig} screen={screen} />;

  render(app, screen);
};

/**
 * Parse command line arguments
 */
const parseArgs = (): { configPath?: string; forcePipeMode: boolean } => {
  const args = process.argv.slice(2);
  let configPath: string | undefined;
  let forcePipeMode = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' && i + 1 < args.length) {
      configPath = args[i + 1];
      i++;
    } else if (arg === '--pipe') {
      forcePipeMode = true;
    }
  }

  return { configPath, forcePipeMode };
};

/**
 * Main entry point
 */
const main = async (): Promise<void> => {
  try {
    const { configPath, forcePipeMode } = parseArgs();
    await runApp(configPath, forcePipeMode);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Fatal error:', errorMessage);
    process.exit(1);
  }
};

// Run the application
if (import.meta.main) {
  main();
}
