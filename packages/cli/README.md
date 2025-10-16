# @agentic-os/cli

Simple pipe mode CLI for testing Agentic OS locally.

## Features

- 🚀 Creates a local Agentic OS instance
- 📝 Pipe mode for stdin/stdout interaction
- ⚙️ Configurable via YAML
- 🧠 Full agent capabilities (LLM, tasks, memory, ledger)

## Installation

```bash
bun install
```

## Configuration

Create a configuration file at `~/.agentic-os/config.yaml`:

```yaml
model:
  providers:
    openai-main:
      endpoint: https://api.openai.com/v1
      apiKey: ${OPENAI_API_KEY}  # or set directly
      adapterType: openai
      models:
        - type: llm
          name: gpt-4-turbo-preview
        - type: llm
          name: gpt-3.5-turbo

shell:
  maxBufferSize: 1048576
```

Or use the example config:

```bash
mkdir -p ~/.agentic-os
cp config.example.yaml ~/.agentic-os/config.yaml
# Edit the file to add your API key
```

## Usage

### Basic Usage

```bash
# Start the CLI (uses ~/.agentic-os/config.yaml)
agentic

# With custom config
agentic --config /path/to/config.yaml
```

### Pipe Mode

The CLI operates in pipe mode, reading from stdin:

```bash
# Single message
echo "What is 2+2?" | agentic

# Multiple messages
cat messages.txt | agentic

# Interactive mode
agentic
# Type your messages, press Enter after each
# Press Ctrl+D to exit
```

### Examples

#### 1. Simple Question

```bash
echo "Hello, what can you do?" | agentic
```

#### 2. Multiple Messages

```bash
cat <<EOF | agentic
What is the capital of France?
Calculate 15 * 23
Tell me a joke
EOF
```

#### 3. From File

```bash
# Create messages file
cat > messages.txt <<EOF
Analyze this data
Process the results
Generate a summary
EOF

# Send messages
cat messages.txt | agentic
```

#### 4. Interactive Session

```bash
agentic
# Type your messages:
> Create a new task to analyze data
< [Task abc123] Status: created
< Agent response...

> Check the status
< [Task abc123] Status: active
< Processing...
```

## Output Format

- **stdout**: Agent responses and task updates
- **stderr**: System messages, errors, and initialization info

```bash
# Separate output and errors
agentic > responses.txt 2> errors.log

# Only see agent responses
agentic 2>/dev/null
```

## Environment Variables

You can use environment variables in your config:

```bash
export OPENAI_API_KEY=sk-...
agentic
```

Or set a default config path:

```bash
export AGENTIC_CONFIG=/path/to/config.yaml
agentic --config $AGENTIC_CONFIG
```

## Architecture

The CLI creates a local Agentic OS instance with:

- **System Bus**: Message routing and ability invocation
- **Shell**: Request handling and message dispatch
- **Model Manager**: LLM provider integration
- **Task Manager**: Task lifecycle and execution
- **Ledger**: Token usage tracking

## Development

```bash
# Run in development mode (with watch)
bun run dev

# Run directly
bun run start

# With custom config
bun run start -- --config ./my-config.yaml

# Lint
bun run lint

# Fix linting issues
bun run lint:fix
```

## Testing

You can test the CLI without an LLM by modifying the config to use a mock provider or by checking the initialization:

```bash
# Check if CLI starts correctly
echo "test" | bun run src/cli.ts 2>&1 | head
```

## Troubleshooting

### Config not found

If you see "Config file not found", create the config file:

```bash
mkdir -p ~/.agentic-os
cp config.example.yaml ~/.agentic-os/config.yaml
```

### API Key not set

Make sure your API key is set either in:
- The config file: `apiKey: sk-...`
- Environment variable: `export OPENAI_API_KEY=sk-...`

### No response

Check stderr for error messages:

```bash
echo "test" | agentic 2>&1
```

## API

The package exports utilities for programmatic use:

```typescript
import {
  runPipeMode,
  createAgenticOSInstance,
  processMessage,
  loadConfig,
} from '@agentic-os/cli';

// Create an instance
const agenticOS = createAgenticOSInstance();

// Process a message
await processMessage(agenticOS, 'Hello!');
```

## License

MIT
