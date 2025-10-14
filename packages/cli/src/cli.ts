#!/usr/bin/env bun

import { runApp } from './app.ts';

/**
 * Main CLI entry point
 */
const main = async (): Promise<void> => {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const configPathIndex = args.indexOf('--config');
    const configPath =
      configPathIndex >= 0 ? args[configPathIndex + 1] : undefined;

    // Run the application
    await runApp(configPath);
  } catch (error) {
    console.error('Failed to start Agentic OS CLI:', error);
    process.exit(1);
  }
};

main();

