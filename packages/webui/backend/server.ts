// WebUI Backend Server

import { createAgenticOS, ledger, modelManager, taskManager } from '@agentic-os/core';
import { v4 as uuidv4 } from 'uuid';
import type { ShellMessage, PostRequest, PostResponse } from '@agentic-os/core';
import type { SSEConnection, WebUIConfig, PostMessageRequest, PostMessageResponse } from './types';
import type { AgenticConfig } from './config';

export type WebUIServer = {
  start: () => Promise<void>;
  stop: () => void;
};

const createWebUIServer = (agenticConfig: AgenticConfig = {}): WebUIServer => {
  const webuiConfig = agenticConfig.webui || {};
  const port = webuiConfig.port || parseInt(process.env.PORT || '3000', 10);
  const corsOrigin = webuiConfig.cors?.origin || '*';
  
  // Track active SSE connections
  const sseConnections = new Map<string, SSEConnection>();
  
  // Initialize AgenticOS with all modules
  const agenticOS = createAgenticOS({
    shell: {
      onMessage: (message: ShellMessage) => {
        // Forward message to all active SSE connections for this task
        const connection = sseConnections.get(message.taskId);
        if (connection && connection.isActive) {
          try {
            const data = `data: ${JSON.stringify(message)}\n\n`;
            // Note: SSE response handling needs to be implemented properly
            // This is a placeholder for the actual SSE implementation
          } catch (error) {
            console.error('Error sending SSE message:', error);
            connection.isActive = false;
            sseConnections.delete(message.taskId);
          }
        }
      },
    },
  })
    .with(ledger())
    .with(modelManager(agenticConfig.model || { providers: {} }))
    .with(taskManager());

  const server = Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);
      const path = url.pathname;

      // Add CORS headers
      const corsHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': Array.isArray(corsOrigin) ? corsOrigin.join(', ') : corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': webuiConfig.cors?.credentials ? 'true' : 'false',
      };

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
      }

      // API routes
      if (path.startsWith('/api/')) {
        return handleApiRequest(request, corsHeaders);
      }

      // Serve static files (frontend)
      return serveStaticFiles(request, corsHeaders);
    },
  });

  const handleApiRequest = async (request: Request, corsHeaders: Record<string, string>): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // POST /api/message - Send message to agent
      if (path === '/api/message' && request.method === 'POST') {
        const body = await request.json() as PostMessageRequest;
        
        if (!body.message || typeof body.message !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Message is required and must be a string' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const postRequest: PostRequest = {
          message: body.message,
          ...(body.taskId && { taskId: body.taskId }),
        };

        const response: PostResponse = await agenticOS.post(postRequest);
        
        return new Response(
          JSON.stringify(response),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // GET /api/stream/:taskId - SSE stream for task messages
      if (path.startsWith('/api/stream/') && request.method === 'GET') {
        const taskId = path.split('/api/stream/')[1];
        
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: 'Task ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Create SSE response
        const response = new Response(
          new ReadableStream({
            start(controller) {
              // Send initial connection message
              const initMessage = {
                type: 'connection',
                taskId,
                content: 'Connected to message stream',
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(initMessage)}\n\n`));

              // Store connection
              sseConnections.set(taskId, {
                taskId,
                response: new Response(),
                isActive: true,
              });
            },
            cancel() {
              // Clean up connection
              sseConnections.delete(taskId);
            },
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          }
        );

        return response;
      }

      // 404 for unknown API routes
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      console.error('API request error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  };

  const serveStaticFiles = async (request: Request, corsHeaders: Record<string, string>): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    
    try {
      // Hard-coded static file path
      const filePath = `./frontend/dist${path}`;
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            ...corsHeaders,
            'Content-Type': getContentType(path),
          },
        });
      }

      // Fallback to index.html for SPA routing
      const indexFile = Bun.file('./frontend/dist/index.html');
      if (await indexFile.exists()) {
        return new Response(indexFile, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html',
          },
        });
      }

      // 404 if no files found
      return new Response('Not found', { 
        status: 404, 
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('Static file error:', error);
      return new Response('Internal server error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  };

  const getContentType = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      'html': 'text/html',
      'js': 'application/javascript',
      'css': 'text/css',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
    };
    return types[ext || ''] || 'application/octet-stream';
  };

  return {
    start: async () => {
      console.log(`🚀 WebUI server starting on port ${port}`);
      console.log(`📱 Frontend will be served from http://localhost:${port}`);
      console.log(`🔌 API available at http://localhost:${port}/api`);
    },
    stop: () => {
      server.stop();
      console.log('🛑 WebUI server stopped');
    },
  };
};

export { createWebUIServer };
