#!/usr/bin/env bun

// WebUI Entry Point

import type { AgenticConfig } from './backend/config';
import { loadConfig } from './backend/config';
import { createWebUIServer } from './backend/server';

const main = async (): Promise<void> => {
  // Load configuration from $HOME/.agent-os/config.yaml
  const agenticConfig = loadConfig();
  
  // Merge with environment variables for webui config
  const finalConfig: AgenticConfig = {
    ...agenticConfig,
    webui: {
      port: agenticConfig.webui?.port || parseInt(process.env.PORT || '3000', 10),
      cors: {
        origin: agenticConfig.webui?.cors?.origin || process.env.CORS_ORIGIN || '*',
        credentials: agenticConfig.webui?.cors?.credentials || process.env.CORS_CREDENTIALS === 'true',
      },
    },
  };

  // Create and start the server
  const server = createWebUIServer(finalConfig);
  
  // Handle graceful shutdown
  const shutdown = (): void => {
    console.log('\n🛑 Shutting down WebUI server...');
    server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start WebUI server:', error);
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

export { createWebUIServer } from './backend/server';
export type { WebUIConfig, PostMessageRequest, PostMessageResponse, SSEConnection } from './backend/types';
