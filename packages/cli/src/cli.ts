#!/usr/bin/env bun

import { runPipeMode } from './app.ts';

/**
 * Main CLI entry point
 */
const main = async (): Promise<void> => {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let configPath: string | undefined;

    // Check for --config flag
    const configIndex = args.indexOf('--config');
    if (configIndex >= 0 && configIndex + 1 < args.length) {
      configPath = args[configIndex + 1];
    }

    // Run the application in pipe mode
    await runPipeMode(configPath);
  } catch (error) {
    console.error('Failed to start Agentic OS CLI:', error);
    process.exit(1);
  }
};

main();
