#!/usr/bin/env bun

// WebUI Frontend Package Entry Point
// Note: This package now contains only the frontend application.
// For the backend API service, use @agentic-os/light-service instead.

console.log(`
⚠️  The WebUI package has been refactored to frontend-only.

For the backend API service, please use @agentic-os/light-service:
  bun install @agentic-os/light-service
  bun run @agentic-os/light-service

To build and serve the frontend:
  cd packages/webui
  bun install
  bun run build
  bun run start

Or for development:
  bun run dev
`);

// Re-export frontend types if needed
export type {
  PostMessageRequest,
  PostMessageResponse,
  ShellMessage,
  AssembledMessage,
  MessageFragment,
} from './src/lib/messageService';
