// Configuration loader for Light Service

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import yaml from 'js-yaml';

import { logInfo, logWarn } from './logger';

import type { AgenticConfig } from './types';

const loadConfig = (): AgenticConfig => {
  const configPath = join(homedir(), '.agentic-os', 'config.yaml');
  
  logInfo(`Loading configuration from: ${configPath}`);
  
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const config = yaml.load(configContent) as AgenticConfig;
    
    logInfo(`Configuration loaded successfully from: ${configPath}`);
    return config;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Configuration Error:`);
    console.error(`   Failed to load config from: ${configPath}`);
    console.error(`   Error: ${errorMsg}`);
    console.error(`   Using default configuration instead.\n`);
    logWarn(`Could not load config from ${configPath}, using defaults:`, error);
    return {};
  }
};

export { loadConfig };


