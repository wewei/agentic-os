// Light Service Backend Server

import { createAgenticOS, ledger, modelManager, taskManager } from '@agentic-os/core';

import { logInfo, logError } from './logger';

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

type MessageAccumulator = {
  taskId: string;
  messageId: string;
  content: string;
};

const createMessageAccumulator = () => {
  const accumulator = new Map<string, MessageAccumulator>();
  
  const accumulateContent = (message: ShellMessage): void => {
    if (message.type !== 'content' || !message.messageId) return;
    
    const key = `${message.taskId}:${message.messageId}`;
    const existing = accumulator.get(key);
    
    if (existing) {
      existing.content += message.content || '';
    } else {
      accumulator.set(key, {
        taskId: message.taskId,
        messageId: message.messageId,
        content: message.content || '',
      });
    }
  };
  
  const getAndClearContent = (taskId: string, messageId: string): string => {
    const key = `${taskId}:${messageId}`;
    const accumulated = accumulator.get(key);
    
    if (accumulated) {
      accumulator.delete(key);
      return accumulated.content;
    }
    
    return '';
  };
  
  return { accumulateContent, getAndClearContent };
};

const createLogMessageEvent = () => {
  const { accumulateContent, getAndClearContent } = createMessageAccumulator();
  
  return (message: ShellMessage): void => {
    const taskId = message.taskId;
    const messageId = message.messageId || 'N/A';
    
    switch (message.type) {
      case 'start':
        logInfo(`Task started: taskId=${taskId}`);
        break;
      case 'content':
        accumulateContent(message);
        break;
      case 'end':
        logInfo(`Task ended: taskId=${taskId}, status=${message.status || 'completed'}`);
        break;
      case 'message_complete': {
        const fullContent = getAndClearContent(taskId, messageId);
        logInfo(`Message complete: taskId=${taskId}, messageId=${messageId}, content=${fullContent}`);
        break;
      }
      case 'error':
        logError(`Task error: taskId=${taskId}, error=${message.error || 'unknown'}`);
        break;
      // Don't log tool_call, tool_result to avoid log spam
    }
  };
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
    logError('Error sending SSE message:', error);
    connection.isActive = false;
    return false;
  }
};

const createMessageHandler = (
  sseConnections: Map<string, SSEConnection>,
  globalConnections: SSEConnection[],
  logMessageEvent: (message: ShellMessage) => void
) => {
  return (message: ShellMessage) => {
    // Log important message events
    logMessageEvent(message);
    
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
        logInfo(`SSE connection established: taskId=${taskId}`);
      } else {
        globalConnections.push(connection);
        logInfo('SSE global connection established');
      }
    },
    cancel() {
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
  
  // Create message event logger with accumulator
  const logMessageEvent = createLogMessageEvent();
  
  // Initialize AgenticOS with all modules
  const agenticOS = createAgenticOS({
    shell: {
      onMessage: createMessageHandler(sseConnections, globalConnections, logMessageEvent),
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
    const body = await request.json() as PostMessageRequest;
    
    // Log incoming request
    logInfo(`Received message request: taskId=${body.taskId || 'new'}, messageLength=${body.message.length}`);
    
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

    const postRequest: PostRequest = {
      message: body.message,
      ...(body.taskId && { taskId: body.taskId }),
      ...(body.llmConfig && { llmConfig: body.llmConfig }),
    };

    const response: PostResponse = await agenticOS.post(postRequest);
    
    logInfo(`Message posted successfully: taskId=${response.taskId}, status=${response.status}`);
    
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


