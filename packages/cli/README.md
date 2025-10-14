# @agentic-os/cli

Terminal User Interface (TUI) for Agentic OS - An interactive CLI for agent interaction.

## Features

- 🖥️ **Split-window TUI**: Upper window for message stream, lower window for input
- ⚙️ **Configurable**: All settings stored in `~/.agentic-os/config.yaml`
- 🎨 **Rich Display**: Color-coded messages by type (user, agent, system, error)
- 📜 **Message History**: Scrollable message history with customizable limits
- ⌨️ **Keyboard Shortcuts**: Intuitive navigation and control

## Installation

```bash
bun install @agentic-os/cli
```

## Usage

### Start the CLI

```bash
# Using the global command
agentic

# Or with custom config path
agentic --config /path/to/config.yaml
```

### Development

```bash
# Run in development mode with hot reload
bun run dev

# Start normally
bun run start

# Run linter
bun run lint

# Fix linter issues
bun run lint:fix
```

## Configuration

Configuration is stored in `~/.agentic-os/config.yaml` and organized by module:

```yaml
cli:
  theme: default
  messageLimit: 1000

model:
  provider: openai
  model: gpt-4

shell:
  maxBufferSize: 1048576
```

### Configuration Structure

Each module can have its own configuration section. The CLI reads this file on startup and merges it with default values.

## Commands

- `/help` - Show available commands
- `/clear` - Clear message history
- `/config` - Display current configuration
- `Ctrl+C` or `Esc` - Exit application

## Architecture

The CLI is built with a functional programming approach:

- **types.ts**: Type definitions
- **config.ts**: Configuration loading and management
- **ui.ts**: Blessed UI component creation and management
- **app.ts**: Application state and business logic
- **cli.ts**: CLI entry point

All functions are pure and composable, following functional programming principles with no classes or interfaces.

## UI Layout

```
┌─────────────────────────────────────┐
│                                     │
│  Message Stream (80% height)       │
│  - Scrollable history               │
│  - Color-coded by type              │
│  - Timestamps                       │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Input Box (20% height)             │
│  - Type and press Enter             │
│                                     │
└─────────────────────────────────────┘
```

## Message Types

- **user**: Messages from the user (green)
- **agent**: Responses from agents (cyan)
- **system**: System messages (yellow)
- **error**: Error messages (red)

## License

MIT

