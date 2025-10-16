// Light Service Backend Server

import { createAgenticOS, ledger, modelManager, taskManager } from '@agentic-os/core';

import type { AgenticConfig, PostMessageRequest, SSEConnection } from './types';
import type { ShellMessage, PostRequest, PostResponse } from '@agentic-os/core';


export type LightServer = {
  start: () => Promise<void>;
  stop: () => void;
};

type ValidationResult = 
  | { valid: true }
  | { valid: false; error: string };

const validatePostMessageRequest = (body: PostMessageRequest): ValidationResult => {
  // Validate message
  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, error: 'Message is required and must be a string' };
  }
  if (body.message.trim() === '') {
    return { valid: false, error: 'Message cannot be empty' };
  }

  // Validate taskId if provided
  if (body.taskId !== undefined && typeof body.taskId !== 'string') {
    return { valid: false, error: 'taskId must be a string' };
  }

  // For new tasks (no taskId), llmConfig is required
  if (!body.taskId) {
    if (!body.llmConfig) {
      return { valid: false, error: 'llmConfig is required for new tasks' };
    }
    if (!body.llmConfig.provider || typeof body.llmConfig.provider !== 'string' || body.llmConfig.provider.trim() === '') {
      return { valid: false, error: 'llmConfig.provider is required and must be a non-empty string for new tasks' };
    }
    if (!body.llmConfig.model || typeof body.llmConfig.model !== 'string' || body.llmConfig.model.trim() === '') {
      return { valid: false, error: 'llmConfig.model is required and must be a non-empty string for new tasks' };
    }
  }

  // Validate llmConfig fields if provided
  if (body.llmConfig) {
    if (body.llmConfig.provider !== undefined) {
      if (typeof body.llmConfig.provider !== 'string' || body.llmConfig.provider.trim() === '') {
        return { valid: false, error: 'llmConfig.provider must be a non-empty string' };
      }
    }
    if (body.llmConfig.model !== undefined) {
      if (typeof body.llmConfig.model !== 'string' || body.llmConfig.model.trim() === '') {
        return { valid: false, error: 'llmConfig.model must be a non-empty string' };
      }
    }
    if (body.llmConfig.topP !== undefined) {
      if (typeof body.llmConfig.topP !== 'number' || body.llmConfig.topP < 0 || body.llmConfig.topP > 1) {
        return { valid: false, error: 'llmConfig.topP must be a number between 0 and 1' };
      }
    }
    if (body.llmConfig.temperature !== undefined) {
      if (typeof body.llmConfig.temperature !== 'number' || body.llmConfig.temperature < 0 || body.llmConfig.temperature > 2) {
        return { valid: false, error: 'llmConfig.temperature must be a number between 0 and 2' };
      }
    }
  }

  return { valid: true };
};

const sendSSEMessage = (
  connection: SSEConnection,
  message: ShellMessage
): boolean => {
  try {
    const data = `data: ${JSON.stringify(message)}\n\n`;
    connection.controller.enqueue(new TextEncoder().encode(data));
    return true;
  } catch (error) {
    console.error('Error sending SSE message:', error);
    connection.isActive = false;
    return false;
  }
};

const createMessageHandler = (
  sseConnections: Map<string, SSEConnection>,
  globalConnections: SSEConnection[]
) => {
  return (message: ShellMessage) => {
    // Forward to specific task connection
    const connection = sseConnections.get(message.taskId);
    if (connection && connection.isActive) {
      if (!sendSSEMessage(connection, message)) {
        sseConnections.delete(message.taskId);
      }
    }
    
    // Forward to all global connections
    globalConnections.forEach((conn, index) => {
      if (conn.isActive && !sendSSEMessage(conn, message)) {
        globalConnections.splice(index, 1);
      }
    });
  };
};

const createSSEStream = (
  taskId: string | undefined,
  sseConnections: Map<string, SSEConnection>,
  globalConnections: SSEConnection[]
): ReadableStream => {
  return new ReadableStream({
    start(controller) {
      const initMessage = {
        type: 'connection',
        taskId: taskId || 'all',
        content: taskId 
          ? `Connected to message stream for task: ${taskId}` 
          : 'Connected to global message stream',
      };
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(initMessage)}\n\n`)
      );

      const connection: SSEConnection = {
        taskId: taskId || '',
        controller,
        isActive: true,
      };

      if (taskId) {
        sseConnections.set(taskId, connection);
      } else {
        globalConnections.push(connection);
      }
    },
    cancel() {
      if (taskId) {
        const conn = sseConnections.get(taskId);
        if (conn) {
          conn.isActive = false;
          sseConnections.delete(taskId);
        }
      } else {
        const index = globalConnections.findIndex(c => !c.isActive);
        if (index !== -1) {
          globalConnections.splice(index, 1);
        }
      }
    },
  });
};

// eslint-disable-next-line max-lines-per-function
const createLightServer = (agenticConfig: AgenticConfig = {}): LightServer => {
  const endpointConfig = agenticConfig.endpoint || {};
  const host = endpointConfig.host || 'localhost';
  const port = endpointConfig.port || parseInt(process.env.PORT || '3000', 10);
  const basePath = endpointConfig.path || 'api';
  const corsOrigin = endpointConfig.cors?.origin || '*';
  const corsCredentials = endpointConfig.cors?.credentials || false;
  
  // Track active SSE connections
  const sseConnections = new Map<string, SSEConnection>();
  const globalConnections: SSEConnection[] = [];
  
  // Initialize AgenticOS with all modules
  const agenticOS = createAgenticOS({
    shell: {
      onMessage: createMessageHandler(sseConnections, globalConnections),
    },
  })
    .with(ledger())
    .with(modelManager(agenticConfig.model || { providers: {} }))
    .with(taskManager());

  const server = Bun.serve({
    port,
    hostname: host,
    async fetch(request) {
      const url = new URL(request.url);
      const path = url.pathname;

      // Add CORS headers
      const corsHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': Array.isArray(corsOrigin) ? corsOrigin.join(', ') : corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': corsCredentials ? 'true' : 'false',
      };

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
      }

      // API routes under /{basePath}/
      const apiPrefix = `/${basePath}`;
      if (path.startsWith(apiPrefix)) {
        return handleApiRequest(request, path, apiPrefix, corsHeaders);
      }

      // 404 for unknown routes
      return new Response('Not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    },
  });

  const handleSendMessage = async (
    request: Request,
    corsHeaders: Record<string, string>
  ): Promise<Response> => {
    const body = await request.json() as PostMessageRequest;
    
    const validation = validatePostMessageRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const postRequest: PostRequest = {
      message: body.message,
      ...(body.taskId && { taskId: body.taskId }),
      ...(body.llmConfig && { llmConfig: body.llmConfig }),
    };

    const response: PostResponse = await agenticOS.post(postRequest);
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  };

  const handleSSE = (
    path: string,
    apiPrefix: string,
    corsHeaders: Record<string, string>
  ): Response => {
    const taskIdMatch = path.match(new RegExp(`^${apiPrefix}/sse(?:/([^/]+))?$`));
    const taskId = taskIdMatch?.[1];
    
    const stream = createSSEStream(taskId, sseConnections, globalConnections);

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  };

  const handleApiRequest = async (
    request: Request, 
    path: string, 
    apiPrefix: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> => {
    try {
      if (path === `${apiPrefix}/send` && request.method === 'POST') {
        return handleSendMessage(request, corsHeaders);
      }

      if (path.startsWith(`${apiPrefix}/sse`) && request.method === 'GET') {
        return handleSSE(path, apiPrefix, corsHeaders);
      }

      if (path === `${apiPrefix}/models` && request.method === 'GET') {
        return new Response(
          JSON.stringify({ 
            message: 'Models endpoint not yet implemented',
            providers: []
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      console.error('API request error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  };

  return {
    start: async () => {
      console.log(`🚀 Light Service starting on ${host}:${port}`);
      console.log(`🔌 API available at http://${host}:${port}/${basePath}`);
      console.log(`   - POST http://${host}:${port}/${basePath}/send`);
      console.log(`   - GET  http://${host}:${port}/${basePath}/sse/:taskId?`);
      console.log(`   - GET  http://${host}:${port}/${basePath}/models`);
    },
    stop: () => {
      // Clean up all connections
      sseConnections.forEach(conn => {
        conn.isActive = false;
      });
      sseConnections.clear();
      globalConnections.forEach(conn => {
        conn.isActive = false;
      });
      globalConnections.length = 0;
      
      server.stop();
      console.log('🛑 Light Service stopped');
    },
  };
};

export { createLightServer };


