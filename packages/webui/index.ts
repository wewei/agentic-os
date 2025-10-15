#!/usr/bin/env bun

// WebUI Entry Point

import { createWebUIServer } from './backend/server';
import type { WebUIConfig } from './backend/types';

const main = async (): Promise<void> => {
  // Load configuration from environment or use defaults
  const config: WebUIConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
    static: {
      path: './frontend/dist',
      fallback: './frontend/dist/index.html',
    },
  };

  // Create and start the server
  const server = createWebUIServer(config);
  
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
