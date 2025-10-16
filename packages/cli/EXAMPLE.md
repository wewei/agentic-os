# CLI Usage Examples

## Setup

First, create your configuration file:

```bash
mkdir -p ~/.agentic-os
cat > ~/.agentic-os/config.yaml <<EOF
model:
  providers:
    openai-main:
      endpoint: https://api.openai.com/v1
      apiKey: ${OPENAI_API_KEY}
      adapterType: openai
      models:
        - type: llm
          name: gpt-4-turbo-preview

shell:
  maxBufferSize: 1048576
EOF
```

## Basic Examples

### 1. Single Message

```bash
echo "What is the capital of France?" | agentic
```

Output:
```
Initializing Agentic OS...
✓ Agentic OS ready
[Task task-abc123] Status: created
The capital of France is Paris.
```

### 2. Multiple Messages

```bash
cat <<EOF | agentic
Calculate 10 + 20
What is 5 * 6?
Tell me about AI
EOF
```

### 3. Interactive Mode

```bash
agentic
# Then type your messages:
Hello, agent!
What can you help me with?
Create a task to analyze data
^D  # Press Ctrl+D to exit
```

### 4. From File

```bash
# Create a messages file
cat > questions.txt <<EOF
What is machine learning?
Explain neural networks
What is deep learning?
EOF

# Process all messages
cat questions.txt | agentic
```

## Advanced Examples

### 1. Separate Responses and Errors

```bash
# Save responses to file, show errors on screen
echo "Tell me a joke" | agentic > responses.txt

# Save both separately
echo "Analyze this data" | agentic > responses.txt 2> errors.log

# Only show responses (hide system messages)
echo "What is 2+2?" | agentic 2>/dev/null
```

### 2. Process with jq

```bash
# If responses are JSON, you can process them
echo "Get system status" | agentic 2>/dev/null | jq '.status'
```

### 3. Shell Script Integration

```bash
#!/bin/bash
# process_messages.sh

MESSAGES=(
  "Initialize system"
  "Load configuration"
  "Start processing"
)

for msg in "${MESSAGES[@]}"; do
  echo "Sending: $msg" >&2
  echo "$msg" | agentic 2>/dev/null
  echo "---" >&2
done
```

### 4. Watch and Process

```bash
# Watch a file and process new lines
tail -f input.log | agentic
```

### 5. With Custom Config

```bash
# Use a specific config for testing
cat > test-config.yaml <<EOF
model:
  providers:
    openai-main:
      endpoint: https://api.openai.com/v1
      apiKey: ${TEST_API_KEY}
      adapterType: openai
      models:
        - type: llm
          name: gpt-3.5-turbo
shell:
  maxBufferSize: 524288
EOF

echo "Test message" | agentic --config test-config.yaml
```

## Real-World Scenarios

### 1. Batch Processing

```bash
# Process multiple files
for file in data/*.txt; do
  echo "Processing $file..." >&2
  cat "$file" | agentic > "results/$(basename $file)"
done
```

### 2. API Wrapper

```bash
#!/bin/bash
# agentic-api.sh - Simple HTTP wrapper around CLI

case "$REQUEST_METHOD" in
  POST)
    read -r BODY
    echo "$BODY" | jq -r '.message' | agentic 2>/dev/null
    ;;
  *)
    echo "Method not allowed"
    ;;
esac
```

### 3. Automated Testing

```bash
#!/bin/bash
# test-agent.sh

test_agent() {
  local question="$1"
  local expected_pattern="$2"
  
  echo "Testing: $question" >&2
  response=$(echo "$question" | agentic 2>/dev/null)
  
  if echo "$response" | grep -q "$expected_pattern"; then
    echo "✓ PASS" >&2
  else
    echo "✗ FAIL: Expected pattern not found" >&2
  fi
}

test_agent "What is 2+2?" "4"
test_agent "Capital of France?" "Paris"
test_agent "Who created Python?" "Guido"
```

### 4. Data Pipeline

```bash
# Extract data -> Process with agent -> Save results
cat raw_data.txt | \
  grep -v "^#" | \
  agentic 2>/dev/null | \
  tee processed_data.txt | \
  wc -l
```

### 5. Interactive Chat with History

```bash
#!/bin/bash
# chat.sh - Interactive chat with history

HISTORY_FILE=~/.agentic-history
touch "$HISTORY_FILE"

echo "Agentic OS Chat (Ctrl+D to exit)"
echo "================================"

while IFS= read -r -p "> " message; do
  if [ -n "$message" ]; then
    # Save to history
    echo "$message" >> "$HISTORY_FILE"
    
    # Send to agent
    echo "$message" | agentic 2>/dev/null
    echo ""
  fi
done
```

### 6. Continuous Processing Service

```bash
#!/bin/bash
# agentic-service.sh - Run as a service

QUEUE_DIR="./queue"
PROCESSED_DIR="./processed"

mkdir -p "$QUEUE_DIR" "$PROCESSED_DIR"

echo "Agentic OS Service Started"

while true; do
  for file in "$QUEUE_DIR"/*.txt; do
    [ -e "$file" ] || continue
    
    echo "Processing: $(basename $file)"
    cat "$file" | agentic > "$PROCESSED_DIR/$(basename $file)"
    mv "$file" "$PROCESSED_DIR/$(basename $file).input"
    
    echo "Completed: $(basename $file)"
  done
  
  sleep 5
done
```

## Tips

### 1. Debugging

```bash
# See all system messages
echo "test" | agentic 2>&1 | less

# Check configuration
agentic --config ~/.agentic-os/config.yaml 2>&1 | grep "✓"
```

### 2. Performance

```bash
# Process messages in parallel (be careful with rate limits)
cat messages.txt | parallel -j 4 'echo {} | agentic'

# Or use xargs
cat messages.txt | xargs -I {} -P 4 sh -c 'echo {} | agentic'
```

### 3. Error Handling

```bash
# Retry on failure
send_with_retry() {
  local max_retries=3
  local retry=0
  
  while [ $retry -lt $max_retries ]; do
    if echo "$1" | agentic 2>/dev/null; then
      return 0
    fi
    retry=$((retry + 1))
    echo "Retry $retry/$max_retries..." >&2
    sleep 2
  done
  
  echo "Failed after $max_retries retries" >&2
  return 1
}

send_with_retry "Important message"
```

## Troubleshooting

### No output

```bash
# Check if CLI is working
echo "test" | agentic 2>&1

# Verify config
agentic --config ~/.agentic-os/config.yaml 2>&1 | head
```

### API errors

```bash
# Check API key
grep apiKey ~/.agentic-os/config.yaml

# Test with verbose errors
echo "test" | agentic 2>&1 | grep -i error
```

### Timeout issues

```bash
# Add timeout wrapper
timeout 30s bash -c 'echo "Long running task" | agentic'
```
