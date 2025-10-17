// Example: Agentic OS with HTTP Server

import {
  createAgenticOS,
  modelManager,
  taskManager,
  ledger,
  type ModelManagerConfig,
  type ShellEvent,
  type AgenticOS,
} from './index';

import type { Server } from 'bun';


// SSE Connection Management
type SSEConnection = {
  taskId: string;
  controller: ReadableStreamDefaultController;
};

const activeConnections = new Map<string, Set<SSEConnection>>();

const formatSSE = (event: ShellEvent): Uint8Array => {
  const type = event.type || 'message';
  const json = JSON.stringify(event);
  const sse = `event: ${type}\ndata: ${json}\n\n`;
  return new TextEncoder().encode(sse);
};

const addConnection = (key: string, connection: SSEConnection): void => {
  if (!activeConnections.has(key)) {
    activeConnections.set(key, new Set());
  }
  activeConnections.get(key)!.add(connection);
};

const removeConnection = (key: string, connection: SSEConnection): void => {
  const connections = activeConnections.get(key);
  if (connections) {
    connections.delete(connection);
    if (connections.size === 0) {
      activeConnections.delete(key);
    }
  }
};

const sendToConnections = (event: ShellEvent): void => {
  const formatted = formatSSE(event);
  const taskId = 'taskId' in event ? event.taskId : '';

  // Send to specific task connections
  if (taskId) {
    const taskConnections = activeConnections.get(taskId);
    if (taskConnections) {
      for (const connection of taskConnections) {
        try {
          connection.controller.enqueue(formatted);
        } catch {
          removeConnection(taskId, connection);
        }
      }
    }
  }

  // Send to all-tasks connections
  const allConnections = activeConnections.get('*');
  if (allConnections) {
    for (const connection of allConnections) {
      try {
        connection.controller.enqueue(formatted);
      } catch {
        removeConnection('*', connection);
      }
    }
  }
};

const createSSEStream = (taskId?: string): ReadableStream => {
  let heartbeatInterval: Timer;
  const key = taskId || '*';
  let connection: SSEConnection;

  const stream = new ReadableStream({
    start(controller) {
      connection = {
        taskId: key,
        controller,
      };

      addConnection(key, connection);

      // Send connection info as comment
      controller.enqueue(
        new TextEncoder().encode(`: connected to ${key}\n\n`)
      );

      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);
    },

    cancel() {
      clearInterval(heartbeatInterval);
      removeConnection(key, connection);
    },
  });

  return stream;
};

// HTTP Server
const createCorsResponse = (): Response => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

const handleSendRequest = async (req: Request, agenticOS: AgenticOS): Promise<Response> => {
  try {
    const body = await req.json() as { 
      userMessageId: string;
      message: string; 
      llmConfig: { provider: string; model: string };
      relatedTaskIds?: string[];
    };
    const result = await agenticOS.post(body);
    return Response.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: errorMessage } },
      { status: 500 }
    );
  }
};

const handleStreamRequest = (pathname: string): Response => {
  const parts = pathname.split('/stream/');
  const taskId = parts[1] || undefined;
  const stream = createSSEStream(taskId);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

const createHTTPServer = (agenticOS: AgenticOS, port: number): Server<undefined> => {
  const fetchHandler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return createCorsResponse();
    }

    if (url.pathname === '/send' && req.method === 'POST') {
      return handleSendRequest(req, agenticOS);
    }

    if (url.pathname.startsWith('/stream') && req.method === 'GET') {
      return handleStreamRequest(url.pathname);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  };

  return Bun.serve({
    port,
    fetch: fetchHandler,
  });
};

// Main
const modelConfig: ModelManagerConfig = {
  providers: {
    'openai-main': {
      endpoint: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY || '',
      adapterType: 'openai',
      models: [
        { type: 'llm', name: 'gpt-4-turbo-preview' },
        { type: 'llm', name: 'gpt-3.5-turbo' },
        { type: 'embed', name: 'text-embedding-3-small' },
        { type: 'embed', name: 'text-embedding-3-large' },
      ],
    },
  },
};

const main = async () => {
  const agenticOS = createAgenticOS({
    shell: {
      onMessage: sendToConnections,
    },
    bus: {
      logError: (taskId, message) => {
        console.error(`[Bus Error] [${taskId}] ${message}`);
      },
      logInfo: (taskId, message) => {
        console.info(`[Bus Info] [${taskId}] ${message}`);
      },
    },
  })
    .with(modelManager(modelConfig))
    .with(taskManager())
    .with(ledger());

  const port = 3000;
  const server = createHTTPServer(agenticOS, port);

  console.log(`\n✓ HTTP Server listening on http://localhost:${port}`);
  console.log('  - POST /send - Send message to agent');
  console.log('  - GET /stream - SSE stream for all tasks');
  console.log('  - GET /stream/:taskId - SSE stream for specific task\n');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    server.stop();
    console.log('✓ Server stopped');
    process.exit(0);
  });
};

main().catch((error) => {
  console.error('Failed to start Agentic OS:', error);
  process.exit(1);
});

