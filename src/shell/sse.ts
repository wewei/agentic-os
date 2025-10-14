// SSE Connection Management

import type { SSEConnection, SSEEvent } from './types';

// Map: taskId (or '*' for all tasks) -> Set of connections
const activeConnections = new Map<string, Set<SSEConnection>>();

export const formatSSE = (event: SSEEvent): Uint8Array => {
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

export const createSSEStream = (taskId?: string): ReadableStream => {
  let heartbeatInterval: Timer;
  const key = taskId || '*';
  let connection: SSEConnection;

  const stream = new ReadableStream({
    start(controller) {
      // Create connection object
      connection = {
        taskId: key,
        controller,
        messageBuffer: new Map(),
      };

      // Register this SSE connection
      addConnection(key, connection);

      // Send connection established event
      const startEvent = formatSSE({
        type: 'start',
        taskId: taskId || undefined,
      });
      controller.enqueue(startEvent);

      // Setup heartbeat
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch {
          // Connection closed, cleanup
          clearInterval(heartbeatInterval);
        }
      }, 30000);
    },

    cancel() {
      // Cleanup on connection close
      clearInterval(heartbeatInterval);
      removeConnection(key, connection);
    },
  });

  return stream;
};

export const sendSSEEvent = (taskId: string, event: SSEEvent): boolean => {
  let sentCount = 0;
  const formatted = formatSSE(event);

  // Send to specific task connections
  const taskConnections = activeConnections.get(taskId);
  if (taskConnections) {
    for (const connection of taskConnections) {
      try {
        connection.controller.enqueue(formatted);
        sentCount++;
      } catch {
        // Connection closed or error
        removeConnection(taskId, connection);
      }
    }
  }

  // Send to all-tasks connections
  const allConnections = activeConnections.get('*');
  if (allConnections) {
    for (const connection of allConnections) {
      try {
        connection.controller.enqueue(formatted);
        sentCount++;
      } catch {
        // Connection closed or error
        removeConnection('*', connection);
      }
    }
  }

  return sentCount > 0;
};

export const hasActiveConnection = (taskId: string): boolean => {
  const connections = activeConnections.get(taskId);
  return connections !== undefined && connections.size > 0;
};

export const closeConnection = (taskId: string): void => {
  const connections = activeConnections.get(taskId);
  if (connections) {
    for (const connection of connections) {
      try {
        connection.controller.close();
      } catch {
        // Already closed
      }
    }
    activeConnections.delete(taskId);
  }
};

