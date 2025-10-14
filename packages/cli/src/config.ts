import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';

import yaml from 'js-yaml';

import type { AppConfig } from './types.ts';

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
 * Ensure the configuration directory exists
 */
export const ensureConfigDir = (): void => {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
};

/**
 * Get default configuration
 */
export const getDefaultConfig = (): AppConfig => ({
  cli: {
    theme: 'default',
    messageLimit: 1000,
  },
  model: {
    provider: 'openai',
    model: 'gpt-4',
  },
  shell: {
    maxBufferSize: 1024 * 1024,
  },
});

/**
 * Load configuration from YAML file
 */
export const loadConfig = (configPath?: string): AppConfig => {
  const path = configPath || getConfigPath();

  if (!existsSync(path)) {
    return getDefaultConfig();
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const config = yaml.load(content) as AppConfig;
    return { ...getDefaultConfig(), ...config };
  } catch (error) {
    console.error(`Failed to load config from ${path}:`, error);
    return getDefaultConfig();
  }
};

/**
 * Save configuration to YAML file
 */
export const saveConfig = (
  config: AppConfig,
  configPath?: string
): void => {
  const path = configPath || getConfigPath();

  try {
    ensureConfigDir();
    const content = yaml.dump(config, {
      indent: 2,
      lineWidth: 80,
      noRefs: true,
    });
    writeFileSync(path, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to save config to ${path}:`, error);
    throw error;
  }
};

/**
 * Get configuration value for a specific module
 */
export const getModuleConfig = <T = Record<string, unknown>>(
  config: AppConfig,
  module: string
): T | undefined => {
  return config[module] as T | undefined;
};

/**
 * Update configuration for a specific module
 */
export const updateModuleConfig = (
  config: AppConfig,
  module: string,
  moduleConfig: Record<string, unknown>
): AppConfig => {
  return {
    ...config,
    [module]: {
      ...config[module],
      ...moduleConfig,
    },
  };
};

