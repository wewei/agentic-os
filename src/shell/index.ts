// Shell Module - HTTP API and SSE

import { registerShellAbilities } from './abilities';
import { createRoutes } from './routes';

import type { Server } from 'bun';
import type { AgentBus, AgentModule } from '../types';
import type { Routes } from './routes';

type ShellModule = AgentModule & {
  start: (port: number) => Promise<void>;
  stop: () => Promise<void>;
};

const createFetchHandler = (routes: Routes) => {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // POST /send
    if (url.pathname === '/send' && req.method === 'POST') {
      return routes.handleSend(req);
    }

    // GET /stream or /stream/:taskId
    if (url.pathname.startsWith('/stream') && req.method === 'GET') {
      const parts = url.pathname.split('/stream/');
      const taskId = parts[1] || undefined;
      return routes.handleStream(req, { taskId });
    }

    // 404
    return Response.json({ error: 'Not found' }, { status: 404 });
  };
};

export const shell = (): ShellModule => {
  let bus: AgentBus | undefined;
  let server: Server<undefined> | undefined;

  return {
    registerAbilities: (agentBus: AgentBus): void => {
      bus = agentBus;
      registerShellAbilities(bus);
    },

    start: async (port: number): Promise<void> => {
      if (!bus) {
        throw new Error('Shell not initialized: registerAbilities must be called first');
      }

      const routes = createRoutes(bus);
      const fetchHandler = createFetchHandler(routes);

      server = Bun.serve({
        port,
        fetch: fetchHandler,
      });

      console.log(`Shell listening on http://localhost:${port}`);
    },

    stop: async (): Promise<void> => {
      if (server) {
        server.stop();
        console.log('Shell stopped');
      }
    },
  };
};

