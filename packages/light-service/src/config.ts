// Configuration loader for Light Service

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import yaml from 'js-yaml';

import { logInfo, logWarn } from './logger';

import type { AgenticConfig } from './types';

const loadConfig = (): AgenticConfig => {
  const configPath = join(homedir(), '.agentic-os', 'config.yaml');
  
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const config = yaml.load(configContent) as AgenticConfig;
    
    logInfo(`Loaded configuration from: ${configPath}`);
    return config;
  } catch (error) {
    logWarn(`Could not load config from ${configPath}, using defaults:`, error);
    return {};
  }
};

export { loadConfig };


