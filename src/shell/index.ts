// Shell Module - HTTP API and SSE

import { registerShellAbilities } from './abilities';
import { createRoutes } from './routes';

import type { AgentBus, AgentModule } from '../types';
import type { Routes } from './routes';

export type Shell = {
  start: (port: number) => Promise<void>;
  stop: () => Promise<void>;
};

type BunServer = {
  stop: () => void;
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

    // GET /stream/:taskId
    if (url.pathname.startsWith('/stream/') && req.method === 'GET') {
      const taskId = url.pathname.split('/stream/')[1];
      if (!taskId) {
        return Response.json({ error: 'Missing taskId' }, { status: 400 });
      }
      return routes.handleStream(req, { taskId });
    }

    // 404
    return Response.json({ error: 'Not found' }, { status: 404 });
  };
};

export const shell = (): AgentModule & { getShell: () => Shell } => {
  let bus: AgentBus | undefined;
  let server: BunServer | undefined;

  const shellInstance: Shell = {
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

  return {
    registerAbilities: (agentBus: AgentBus): void => {
      bus = agentBus;
      registerShellAbilities(bus);
    },
    getShell: (): Shell => shellInstance,
  };
};

