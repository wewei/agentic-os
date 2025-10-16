// Configuration loader for Light Service

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import yaml from 'js-yaml';

import type { AgenticConfig } from './types';

const loadConfig = (): AgenticConfig => {
  const configPath = join(homedir(), '.agentic-os', 'config.yaml');
  
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const config = yaml.load(configContent) as AgenticConfig;
    
    console.log(`📁 Loaded configuration from: ${configPath}`);
    return config;
  } catch (error) {
    console.warn(`⚠️  Could not load config from ${configPath}, using defaults:`, error);
    return {};
  }
};

export { loadConfig };


