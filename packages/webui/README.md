# @agentic-os/webui

A modern frontend web interface for interacting with Agentic OS agents, featuring real-time message streaming via Server-Sent Events (SSE).

> **Note**: This package now contains only the frontend application. For the backend API service, use [`@agentic-os/light-service`](../light-service/README.md) instead.

## Features

- 🤖 **Real-time Agent Interaction**: Chat with AI agents through a modern web interface
- 📡 **Live Message Streaming**: Messages are streamed in real-time using SSE
- 🎨 **Modern UI**: Built with React, shadcn/ui, and Tailwind CSS
- 🔧 **Tool Call Visualization**: See agent tool calls and results in real-time
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Fast & Lightweight**: Built with Vite for optimal performance
- 🔌 **Configurable Backend**: Connect to any Light Service backend via environment variables

## Architecture

This is a **frontend-only** package that connects to the Light Service backend API:

### Frontend Application
- **React Application**: Modern React app with TypeScript
- **shadcn/ui Components**: Beautiful, accessible UI components
- **Message Assembly**: Intelligently assembles streaming message fragments
- **Real-time Updates**: Live message streaming with connection status
- **Environment Configuration**: Backend API URL configured via environment variables
- **Vite Build System**: Fast development and optimized production builds

### Backend Service
For the backend API, use **@agentic-os/light-service** which provides:
- RESTful API endpoints
- SSE streaming
- AgenticOS integration
- Configuration management

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) or [Node.js](https://nodejs.org) installed
- A running instance of `@agentic-os/light-service` (the backend API)

### Installation

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Configure backend API URL**:
   Create a `.env` file:
   ```bash
   # Copy from example
   cp .env.example .env
   
   # Edit .env
   VITE_AGENTIC_API_URL=http://localhost:3000/api
   ```

3. **Start the development server**:
   ```bash
   bun run dev
   ```
   
   The frontend will be available at http://localhost:5173

### Production Build

1. **Build the frontend**:
   ```bash
   bun run build
   ```

2. **Preview the production build**:
   ```bash
   bun run start
   ```

3. **Deploy**: The built files are in `dist/` and can be deployed to any static hosting service (Vercel, Netlify, Cloudflare Pages, etc.)

## Configuration

### Environment Variables

The frontend uses the following environment variable:

- `VITE_AGENTIC_API_URL` - The URL of the Light Service backend API
  - Format: `http(s)://<host>:<port>/<path>`
  - Example: `http://localhost:3000/api`
  - Default: `http://localhost:3000/api`

Create a `.env` file:

```env
VITE_AGENTIC_API_URL=http://localhost:3000/api
```

For production deployments, set this environment variable in your hosting platform.

## Development

### Project Structure

```
packages/webui/
├── src/
│   ├── components/       # React components
│   │   ├── App.tsx       # Main application component
│   │   ├── MessageInput.tsx
│   │   ├── MessageList.tsx
│   │   └── ui/           # shadcn/ui components
│   ├── lib/              # Utilities and services
│   │   └── messageService.ts  # API client
│   ├── index.css         # Global styles
│   └── main.tsx          # Entry point
├── .env.example          # Environment variables example
├── index.html            # HTML template
├── index.ts              # Package entry point (info only)
├── package.json          # Package dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

### Development Workflow

1. **Start the backend service**:
   ```bash
   # In a separate terminal
   cd ../light-service
   bun run dev
   ```

2. **Start the frontend dev server**:
   ```bash
   cd frontend
   bun run dev
   ```

3. **Make changes**: The dev server will hot-reload on changes

4. **Build for production**:
   ```bash
   bun run build
   ```

### API Integration

The frontend communicates with the Light Service backend via:

- **POST `{VITE_AGENTIC_API_URL}/send`** - Send messages
- **GET `{VITE_AGENTIC_API_URL}/sse/:taskId?`** - Receive real-time messages

See the [messageService.ts](./frontend/src/lib/messageService.ts) file for implementation details.

## Deployment

### Static Hosting

The frontend can be deployed to any static hosting service:

1. **Build the frontend**:
   ```bash
   bun run build
   ```

2. **Deploy the `frontend/dist/` directory** to your hosting service:
   - **Vercel**: `vercel deploy`
   - **Netlify**: `netlify deploy`
   - **Cloudflare Pages**: Connect your repository
   - **GitHub Pages**: Copy `dist/` to `gh-pages` branch
   - **S3/CloudFront**: Upload to S3 and configure CloudFront

3. **Set environment variables** in your hosting platform:
   - `VITE_AGENTIC_API_URL` - Your backend API URL

### Environment-Specific Builds

For different environments:

```bash
# Development
VITE_AGENTIC_API_URL=http://localhost:3000/api bun run build

# Staging
VITE_AGENTIC_API_URL=https://staging-api.example.com/api bun run build

# Production
VITE_AGENTIC_API_URL=https://api.example.com/api bun run build
```

## Scripts

From the `packages/webui` directory:

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Preview production build
- `bun run lint` - Lint code
- `bun run lint:fix` - Fix linting errors

## Troubleshooting

### Cannot connect to backend

1. Verify the Light Service backend is running:
   ```bash
   curl http://localhost:3000/api/models
   ```

2. Check the `VITE_AGENTIC_API_URL` environment variable is set correctly

3. Check CORS settings in the Light Service configuration

### Build errors

1. Clear cache and reinstall:
   ```bash
   cd frontend
   rm -rf node_modules bun.lock dist
   bun install
   ```

2. Verify TypeScript configuration is correct

## Related Packages

- [@agentic-os/core](../core/README.md) - Core agent system (used by backend)
- [@agentic-os/light-service](../light-service/README.md) - Backend API service
- [@agentic-os/cli](../cli/README.md) - Command-line interface

## License

MIT
