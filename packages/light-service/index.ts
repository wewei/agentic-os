#!/usr/bin/env bun

// Light Service Entry Point

import { loadConfig } from './src/config';
import { createLightServer } from './src/server';
import type { AgenticConfig } from './src/types';

const main = async (): Promise<void> => {
  // Load configuration from $HOME/.agentic-os/config.yaml
  const agenticConfig = loadConfig();
  
  // Merge with environment variables for endpoint config
  const finalConfig: AgenticConfig = {
    ...agenticConfig,
    endpoint: {
      host: agenticConfig.endpoint?.host || process.env.HOST || 'localhost',
      port: agenticConfig.endpoint?.port || parseInt(process.env.PORT || '3000', 10),
      path: agenticConfig.endpoint?.path || process.env.API_PATH || 'api',
      cors: {
        origin: agenticConfig.endpoint?.cors?.origin || process.env.CORS_ORIGIN || '*',
        credentials: agenticConfig.endpoint?.cors?.credentials || process.env.CORS_CREDENTIALS === 'true',
      },
    },
  };

  // Create and start the server
  const server = createLightServer(finalConfig);
  
  // Handle graceful shutdown
  const shutdown = (): void => {
    console.log('\n🛑 Shutting down Light Service...');
    server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start Light Service:', error);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { createLightServer } from './src/server';
export type { 
  AgenticConfig, 
  EndpointConfig,
  PostMessageRequest, 
  PostMessageResponse, 
  SSEConnection 
} from './src/types';

