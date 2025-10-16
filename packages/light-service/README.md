# @agentic-os/light-service

Lightweight backend API service for Agentic OS. Provides HTTP/SSE endpoints for agent communication.

## Features

- 🚀 Fast and lightweight backend service
- 🔌 RESTful API endpoints
- 📡 Server-Sent Events (SSE) for real-time streaming
- ⚙️ Configurable via YAML or environment variables
- 🔒 CORS support with flexible configuration

## Installation

```bash
bun install @agentic-os/light-service
```

## Usage

### As a Standalone Service

```bash
bun run @agentic-os/light-service
```

Or use the binary:

```bash
agentic-light-service
```

### Verbose Mode

Enable verbose mode to print logs to stdout:

```bash
agentic-light-service -v
# or
agentic-light-service --verbose
```

Logs are always written to `$HOME/.agentic-os/light-service-[epoch].log` regardless of verbose mode.

**Log file location example:**
```
~/.agentic-os/light-service-1698765432123.log
```

### As a Library

```typescript
import { createLightServer } from '@agentic-os/light-service';

const server = createLightServer({
  endpoint: {
    host: 'localhost',
    port: 3000,
    path: 'api',
    cors: {
      origin: '*',
      credentials: false,
    },
  },
});

await server.start();
```

## Configuration

### Configuration File

Create a configuration file at `$HOME/.agentic-os/config.yaml`:

```yaml
endpoint:
  host: "localhost"
  port: 3000
  path: "api"
  cors:
    origin: "*"
    credentials: false

model:
  providers:
    openai:
      endpoint: "https://api.openai.com/v1"
      apiKey: "${OPENAI_API_KEY}"
      adapterType: "openai"
      models:
        - type: "llm"
          name: "gpt-4"
```

See [config.example.yaml](./config.example.yaml) for a complete example.

### Environment Variables

You can also configure the service using environment variables:

- `HOST` - Server host (default: `localhost`)
- `PORT` - Server port (default: `3000`)
- `API_PATH` - Base API path (default: `api`)
- `CORS_ORIGIN` - CORS origin (default: `*`)
- `CORS_CREDENTIALS` - Allow credentials (default: `false`)

## API Endpoints

All endpoints are prefixed with `/{path}` (default: `/api`).

### POST /{path}/send

Send a message to the agent.

**Request:**
```json
{
  "message": "Hello, agent!",
  "taskId": "optional-task-id",
  "llmConfig": {
    "model": "gpt-4"
  }
}
```

**Response:**
```json
{
  "taskId": "task-uuid",
  "status": "processing"
}
```

### GET /{path}/sse/:taskId?

Connect to Server-Sent Events stream for real-time messages.

- **With taskId** (`/api/sse/task-123`): Receive messages for specific task
- **Without taskId** (`/api/sse`): Receive all messages from all tasks

**Event Format:**
```
data: {"type":"content","taskId":"...","content":"..."}

data: {"type":"tool_call","taskId":"...","tool":"...","args":{...}}

data: {"type":"message_complete","taskId":"..."}
```

### GET /{path}/models

Get available models (placeholder, not yet implemented).

## Development

```bash
# Install dependencies
bun install

# Run in development mode with auto-reload
bun run dev

# Run linting
bun run lint

# Run tests
bun run test
```

## License

MIT


