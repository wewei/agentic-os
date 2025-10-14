#!/usr/bin/env bun

import { runApp } from './app.ts';

/**
 * Main CLI entry point
 */
const main = async (): Promise<void> => {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    // Check for force pipe mode flag
    const forcePipeMode = args.includes('-');
    
    // Remove the force pipe mode flag from args for config parsing
    const filteredArgs = args.filter(arg => arg !== '-');
    
    const configPathIndex = filteredArgs.indexOf('--config');
    const configPath =
      configPathIndex >= 0 ? filteredArgs[configPathIndex + 1] : undefined;

    // Run the application
    await runApp(configPath, forcePipeMode);
  } catch (error) {
    console.error('Failed to start Agentic OS CLI:', error);
    process.exit(1);
  }
};

main();

