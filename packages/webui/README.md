# @agentic-os/webui

A modern web interface for interacting with Agentic OS agents, featuring real-time message streaming via Server-Sent Events (SSE).

## Features

- 🤖 **Real-time Agent Interaction**: Chat with AI agents through a modern web interface
- 📡 **Live Message Streaming**: Messages are streamed in real-time using SSE
- 🎨 **Modern UI**: Built with React, shadcn/ui, and Tailwind CSS
- 🔧 **Tool Call Visualization**: See agent tool calls and results in real-time
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Fast & Lightweight**: Built with Vite and Bun for optimal performance

## Architecture

The WebUI package consists of two main parts:

### Backend Server (`backend/`)
- **Bun HTTP Server**: Serves the API and static files
- **POST API**: `/api/message` - Send messages to agents
- **SSE Stream**: `/api/stream/:taskId` - Real-time message streaming
- **AgenticOS Integration**: Wraps the core AgenticOS with all modules

### Frontend App (`frontend/`)
- **React Application**: Modern React app with TypeScript
- **shadcn/ui Components**: Beautiful, accessible UI components
- **Message Assembly**: Intelligently assembles streaming message fragments
- **Real-time Updates**: Live message streaming with connection status

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- OpenAI API key (or other model provider)

### Installation

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Set up environment variables**:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   export PORT=3000  # Optional, defaults to 3000
   ```

3. **Build the frontend**:
   ```bash
   bun run build
   ```

4. **Start the server**:
   ```bash
   bun run start
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## Development

### Development Mode

For development, you can run the frontend and backend separately:

1. **Start the backend server**:
   ```bash
   bun run dev
   ```

2. **In another terminal, start the frontend dev server**:
   ```bash
   bun run dev:frontend
   ```

The frontend will be available at `http://localhost:5173` with hot reloading, and it will proxy API requests to the backend at `http://localhost:3000`.

### From Root Directory

You can also run WebUI commands from the monorepo root:

```bash
# Start WebUI server
bun run webui

# Start in development mode
bun run webui:dev

# Build frontend
bun run webui:build

# Start frontend dev server
bun run webui:frontend:dev
```

## Configuration

Create a `config.yaml` file based on `config.example.yaml`:

```yaml
server:
  port: 3000
  cors:
    origin: "*"
    credentials: false

static:
  path: "./frontend/dist"
  fallback: "./frontend/dist/index.html"

agentic:
  model:
    provider: "openai"
    model: "gpt-4"
    apiKey: "${OPENAI_API_KEY}"
```

## API Reference

### POST `/api/message`

Send a message to the agent.

**Request Body**:
```json
{
  "message": "Hello, how can you help me?",
  "taskId": "optional-existing-task-id"
}
```

**Response**:
```json
{
  "taskId": "generated-task-id",
  "status": "accepted"
}
```

### GET `/api/stream/:taskId`

Connect to the Server-Sent Events stream for a specific task.

**Response**: Stream of JSON messages:
```
data: {"type":"start","taskId":"task-id","content":"Starting..."}

data: {"type":"content","taskId":"task-id","messageId":"msg-id","content":"Hello"}

data: {"type":"content","taskId":"task-id","messageId":"msg-id","content":" there!"}

data: {"type":"message_complete","taskId":"task-id","messageId":"msg-id"}

data: {"type":"end","taskId":"task-id","content":"Completed"}
```

## Message Types

The system handles several message types:

- **`start`**: Task has started
- **`content`**: Text content fragment (streamed)
- **`tool_call`**: Agent is calling a tool
- **`tool_result`**: Tool execution result
- **`message_complete`**: Message assembly is complete
- **`end`**: Task has completed
- **`error`**: An error occurred

## Frontend Components

### MessageList
Displays the conversation history with:
- User messages (right-aligned)
- Agent messages (left-aligned, with streaming indicators)
- System messages (centered)
- Tool calls and results
- Timestamps

### MessageInput
Text input with:
- Auto-resize textarea
- Enter to send, Shift+Enter for new line
- Send button with loading state
- Connection status awareness

### App
Main application component that:
- Manages connection state
- Handles message sending and receiving
- Assembles streaming messages
- Displays connection status and errors

## Message Assembly

The frontend intelligently assembles streaming messages:

1. **Fragments**: Content messages are collected by `messageId`
2. **Assembly**: Fragments are joined when `message_complete` is received
3. **Streaming**: Partial messages are shown with a streaming indicator
4. **Tool Calls**: Tool calls and results are displayed inline

## Styling

The UI uses:
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built accessible components
- **CSS Variables**: For theming and customization
- **Responsive Design**: Mobile-first approach

## Error Handling

The system includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection attempts
- **Message Errors**: User-friendly error messages
- **API Errors**: Proper HTTP status codes and error responses
- **Frontend Errors**: Error boundaries and fallback UI

## Performance

Optimizations include:

- **Message Streaming**: Real-time updates without polling
- **Efficient Rendering**: React optimizations and memoization
- **Bundle Splitting**: Vite's automatic code splitting
- **Static Serving**: Efficient static file serving with Bun

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for type safety
3. Keep functions under 50 lines (extract subfunctions if needed)
4. Use functional programming style
5. Test your changes thoroughly

## License

MIT License - see the main repository for details.
