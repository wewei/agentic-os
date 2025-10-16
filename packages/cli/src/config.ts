import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import yaml from 'js-yaml';

import type { CLIConfig } from './types.ts';

/**
 * Get the default configuration directory path
 */
export const getConfigDir = (): string => {
  return join(homedir(), '.agentic-os');
};

/**
 * Get the default configuration file path
 */
export const getConfigPath = (): string => {
  return join(getConfigDir(), 'config.yaml');
};

/**
 * Get default configuration
 */
export const getDefaultConfig = (): CLIConfig => ({
  model: {
    providers: {
      'openai-main': {
        endpoint: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || '',
        adapterType: 'openai',
        models: [
          { type: 'llm', name: 'gpt-4-turbo-preview' },
          { type: 'llm', name: 'gpt-3.5-turbo' },
        ],
      },
    },
  },
});

/**
 * Load configuration from YAML file
 */
export const loadConfig = (configPath?: string): CLIConfig => {
  const path = configPath || getConfigPath();

  if (!existsSync(path)) {
    console.warn(`Config file not found at ${path}, using defaults`);
    return getDefaultConfig();
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const config = yaml.load(content) as Partial<CLIConfig>;
    
    // Merge with defaults
    const defaultConfig = getDefaultConfig();
    return {
      model: { ...defaultConfig.model, ...config.model },
    };
  } catch (error) {
    console.error(`Failed to load config from ${path}:`, error);
    return getDefaultConfig();
  }
};
