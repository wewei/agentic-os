// Model Manager

import { registerModelAbilities } from './abilities';
import { createOpenAIAdapter } from './providers/openai';

import type { Module } from '../types';
import type { ProviderRegistry, ProviderAdapter, ProviderConfig, AdapterType } from './types';

export type ModelManagerConfig = {
  providers: Record<
    string,
    {
      endpoint: string;
      apiKey: string;
      adapterType: AdapterType;
      models: Array<{ type: 'llm' | 'embed'; name: string }>;
    }
  >;
};

const createAdapterRegistry = (): Map<string, ProviderAdapter> => {
  const registry = new Map<string, ProviderAdapter>();

  registry.set('openai', createOpenAIAdapter());
  // Add more adapters here (anthropic, custom, etc.)

  return registry;
};

export const modelManager = (config: ModelManagerConfig): Module => {
  const registry: ProviderRegistry = new Map();

  // Build provider registry from config
  for (const [providerName, providerConfig] of Object.entries(config.providers)) {
    const providerConfigObj: ProviderConfig = {
      endpoint: providerConfig.endpoint,
      apiKey: providerConfig.apiKey,
      adapterType: providerConfig.adapterType,
      models: providerConfig.models,
    };
    registry.set(providerName, providerConfigObj);
  }

  const adapters = createAdapterRegistry();

  return {
    registerAbilities: (bus): void => {
      registerModelAbilities(registry, adapters, bus);
    },
  };
};

export type { ChatMessage, ToolCall, ToolDefinition } from './types';
