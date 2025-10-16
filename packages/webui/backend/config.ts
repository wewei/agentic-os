// Configuration loader for WebUI

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import type { ModelManagerConfig } from '@agentic-os/core';
import yaml from 'js-yaml';

export type WebUIConfig = {
  port?: number;
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
};

export type AgenticConfig = {
  webui?: WebUIConfig;
  model?: ModelManagerConfig;
  task?: {
    maxConcurrentTasks?: number;
    taskTimeout?: number;
  };
  ledger?: {
    persistence?: boolean;
    maxEntries?: number;
  };
};

const loadConfig = (): AgenticConfig => {
  const configPath = join(homedir(), '.agent-os', 'config.yaml');
  
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
