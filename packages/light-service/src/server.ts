// Light Service Backend Server

import { createAgenticOS, ledger, modelManager, taskManager } from '@agentic-os/core';

import { logInfo, logError } from './logger';

import type { 
  AgenticConfig, 
  PostMessageRequest, 
  SSEConnection,
  SSEEvent,
} from './types';

export type LightServer = {
  start: () => Promise<void>;
  stop: () => void;
};

type ValidationResult = 
  | { valid: true }
  | { valid: false; error: string };

const validatePostMessageRequest = (body: PostMessageRequest): ValidationResult => {
  // Validate userMessageId
  if (!body.userMessageId || typeof body.userMessageId !== 'string') {
    return { valid: false, error: 'userMessageId is required and must be a string' };
  }
  if (body.userMessageId.trim() === '') {
    return { valid: false, error: 'userMessageId cannot be empty' };
  }

  // Validate message
  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, error: 'Message is required and must be a string' };
  }
  if (body.message.trim() === '') {
    return { valid: false, error: 'Message cannot be empty' };
  }

  // Validate llmConfig (always required)
  if (!body.llmConfig) {
    return { valid: false, error: 'llmConfig is required' };
  }
  if (!body.llmConfig.provider || typeof body.llmConfig.provider !== 'string' || body.llmConfig.provider.trim() === '') {
    return { valid: false, error: 'llmConfig.provider is required and must be a non-empty string' };
  }
  if (!body.llmConfig.model || typeof body.llmConfig.model !== 'string' || body.llmConfig.model.trim() === '') {
    return { valid: false, error: 'llmConfig.model is required and must be a non-empty string' };
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

  // Validate relatedTaskIds if provided
  if (body.relatedTaskIds !== undefined) {
    if (!Array.isArray(body.relatedTaskIds)) {
      return { valid: false, error: 'relatedTaskIds must be an array' };
    }
    for (const taskId of body.relatedTaskIds) {
      if (typeof taskId !== 'string' || taskId.trim() === '') {
        return { valid: false, error: 'All relatedTaskIds must be non-empty strings' };
      }
    }
  }

  return { valid: true };
};

const sendSSEEvent = (
  connection: SSEConnection,
  event: SSEEvent
): boolean => {
  if (!connection.isActive) {
    return false;
  }

  try {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();
    connection.controller.enqueue(encoder.encode(data));
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const taskId = 'taskId' in event ? event.taskId : 'unknown';
    logError(`Error sending SSE event (taskId=${taskId}, type=${event.type}): ${errorMsg}`);
    connection.isActive = false;
    return false;
  }
};

const logSSEEvent = (event: SSEEvent): void => {
  switch (event.type) {
    case 'task_started':
      logInfo(`Task started: taskId=${event.taskId}, triggerMessage=${event.triggerMessageId}`);
      break;
    case 'task_completed':
      logInfo(`Task completed: taskId=${event.taskId}`);
      break;
    case 'error':
      logError(`Task error event: taskId=${event.taskId || 'unknown'}, code=${event.errorCode}, message=${event.errorMessage}`);
      break;
    case 'ability_request':
      logInfo(`Ability request: taskId=${event.taskId}, abilityId=${event.abilityId}, callId=${event.callId}`);
      break;
    case 'ability_response':
      if ('result' in event && event.result.type === 'error') {
        logError(`Ability failed: taskId=${event.taskId}, abilityId=${event.abilityId}, callId=${event.callId}, error=${event.result.error}`);
      }
      break;
    // Don't log content, user_message_routed to avoid spam
  }
};

const createMessageHandler = (
  sseConnections: Map<string, SSEConnection>,
  globalConnections: SSEConnection[]
) => {
  return (event: SSEEvent) => {
    logSSEEvent(event);
    
    // Extract taskId from event (different events have it in different places)
    const taskId = 'taskId' in event ? event.taskId : '';
    
    // Forward to specific task connection
    if (taskId) {
      const connection = sseConnections.get(taskId);
      if (connection) {
        if (!connection.isActive || !sendSSEEvent(connection, event)) {
          sseConnections.delete(taskId);
          logInfo(`Cleaned up inactive SSE connection: taskId=${taskId}`);
        }
      }
    }
    
    // Forward to all global connections (iterate backwards to safely remove)
    for (let i = globalConnections.length - 1; i >= 0; i--) {
      const conn = globalConnections[i];
      if (conn) {
        if (!conn.isActive || !sendSSEEvent(conn, event)) {
          globalConnections.splice(i, 1);
          logInfo('Cleaned up inactive global SSE connection');
        }
      }
    }
  };
};

const registerSSEConnection = (
  taskId: string | undefined,
  connection: SSEConnection,
  sseConnections: Map<string, SSEConnection>,
  globalConnections: SSEConnection[]
): void => {
  if (taskId) {
    sseConnections.set(taskId, connection);
    logInfo(`SSE connection established: taskId=${taskId}`);
  } else {
    globalConnections.push(connection);
    logInfo('SSE global connection established');
  }
};

const unregisterSSEConnection = (
  taskId: string | undefined,
  sseConnections: Map<string, SSEConnection>,
  globalConnections: SSEConnection[]
): void => {
  if (taskId) {
    const conn = sseConnections.get(taskId);
    if (conn) {
      conn.isActive = false;
      sseConnections.delete(taskId);
      logInfo(`SSE connection closed: taskId=${taskId}`);
    }
  } else {
    const index = globalConnections.findIndex(c => !c.isActive);
    if (index !== -1) {
      globalConnections.splice(index, 1);
      logInfo('SSE global connection closed');
    }
  }
};

const sendInitialSSEMessage = (
  taskId: string | undefined, 
  controller: ReadableStreamDefaultController
): void => {
  try {
    const encoder = new TextEncoder();
    const initMessage = {
      type: 'connection',
      taskId: taskId || 'all',
      content: taskId 
        ? `Connected to message stream for task: ${taskId}` 
        : 'Connected to global message stream',
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(initMessage)}\n\n`));
  } catch (error) {
    logError(`Failed to send initial SSE message: ${error}`);
  }
};

const createSSEStream = (
  taskId: string | undefined,
  sseConnections: Map<string, SSEConnection>,
  globalConnections: SSEConnection[]
): ReadableStream => {
  let keepAliveInterval: Timer | null = null;
  
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      sendInitialSSEMessage(taskId, controller);

      const connection: SSEConnection = {
        taskId: taskId || '',
        controller,
        isActive: true,
      };

      registerSSEConnection(taskId, connection, sseConnections, globalConnections);

      keepAliveInterval = setInterval(() => {
        if (connection.isActive) {
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
          } catch (error) {
            logError(`Keep-alive failed: ${error}`);
            connection.isActive = false;
            if (keepAliveInterval) {
              clearInterval(keepAliveInterval);
              keepAliveInterval = null;
            }
          }
        }
      }, 30000);
    },
    cancel() {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      unregisterSSEConnection(taskId, sseConnections, globalConnections);
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
    bus: {
      logError: (taskId, message) => {
        logError(`[${taskId}] ${message}`);
      },
      logInfo: (taskId, message) => {
        logInfo(`[${taskId}] ${message}`);
      },
    },
  })
    .with(ledger())
    .with(modelManager(agenticConfig.model ?? { providers: {} }))
    .with(taskManager(agenticConfig.task ?? {}));

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
    try {
      const body = await request.json() as PostMessageRequest;
      
      // Log incoming request
      logInfo(`Received message request: userMessageId=${body.userMessageId}, messageLength=${body.message.length}`);
      
      const validation = validatePostMessageRequest(body);
      if (!validation.valid) {
        logError(`Request validation failed: ${validation.error}`);
        return new Response(
          JSON.stringify({ error: validation.error }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Use Core's PostRequest type directly
      const response = await agenticOS.post(body);
      
      logInfo(`Message posted successfully: userMessageId=${body.userMessageId}, routedTasks=${response.routedTasks.join(', ')}`);
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logError(`Failed to handle send message: ${errorMsg}`);
      if (errorStack) {
        logError(`Stack trace: ${errorStack}`);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process message',
          details: errorMsg 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
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

  const handleGetModels = async (
    corsHeaders: Record<string, string>
  ): Promise<Response> => {
    try {
      const models = await agenticOS.getTaskModels();
      return new Response(
        JSON.stringify({ models }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      logError('Failed to get models:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to retrieve models',
          models: []
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
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
        return handleGetModels(corsHeaders);
      }

      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      logError('API request error:', error);
      
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
      logInfo(`Light Service starting on ${host}:${port}`);
      logInfo(`API available at http://${host}:${port}/${basePath}`);
      logInfo(`  - POST http://${host}:${port}/${basePath}/send`);
      logInfo(`  - GET  http://${host}:${port}/${basePath}/sse/:taskId?`);
      logInfo(`  - GET  http://${host}:${port}/${basePath}/models`);
      
      // Always show startup info to console
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
      logInfo('Light Service stopped');
    },
  };
};

export { createLightServer };

