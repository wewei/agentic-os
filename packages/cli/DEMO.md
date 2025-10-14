# @agentic-os/cli 演示指南

## 演示流程

### 1. 安装和配置

```bash
# 克隆仓库（如果还没有）
git clone https://github.com/wewei/agentic-os.git
cd agent-os

# 安装依赖
bun install

# 创建配置目录
mkdir -p ~/.agentic-os

# 复制示例配置
cp packages/cli/config.example.yaml ~/.agentic-os/config.yaml

# 编辑配置（可选）
vim ~/.agentic-os/config.yaml
```

### 2. 启动 CLI

```bash
# 方式 1：从根目录启动
bun run cli

# 方式 2：从 CLI 包目录启动
cd packages/cli
bun run start

# 方式 3：使用自定义配置
bun run packages/cli/src/cli.ts --config /path/to/config.yaml
```

### 3. 基本交互

启动后，你会看到这样的界面：

```
┌─────────────────────────────────────────────────────────┐
│ [10:30:45] SYSTEM Welcome to Agentic OS CLI            │
│ [10:30:45] SYSTEM Type your message and press Enter... │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ > _                                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4. 发送消息

在下方输入框中输入消息，按 Enter 发送：

```
> Hello, Agentic OS!
```

你会看到：

```
┌─────────────────────────────────────────────────────────┐
│ [10:30:45] SYSTEM Welcome to Agentic OS CLI            │
│ [10:30:45] SYSTEM Type your message and press Enter... │
│ [10:31:12] USER   Hello, Agentic OS!                   │
│ [10:31:12] AGENT  Echo: Hello, Agentic OS!             │
│                                                         │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ > _                                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5. 使用命令

#### 查看帮助

```
> /help
```

显示：

```
[10:32:00] SYSTEM Available commands:
                   /help   - Show this help message
                   /clear  - Clear message history
                   /config - Show current configuration
                   Ctrl+C or Esc - Exit application
```

#### 查看配置

```
> /config
```

显示当前配置：

```json
{
  "cli": {
    "theme": "default",
    "messageLimit": 1000
  },
  "model": {
    "provider": "openai",
    "model": "gpt-4"
  },
  "shell": {
    "maxBufferSize": 1048576
  }
}
```

#### 清空消息

```
> /clear
```

消息历史将被清空。

### 6. 滚动消息

当消息很多时，可以使用：

- **鼠标滚轮** - 在消息窗口中滚动
- **Vi 模式键** - `j`/`k` 上下滚动（当光标在消息窗口时）
- **Page Up/Down** - 快速翻页

### 7. 退出应用

- 按 `Ctrl+C`
- 或按 `Esc`

## 颜色说明

消息按类型显示不同颜色：

| 类型   | 颜色   | 说明                 |
| ------ | ------ | -------------------- |
| USER   | 🟢 绿色 | 你输入的消息         |
| AGENT  | 🔵 青色 | Agent 的回复         |
| SYSTEM | 🟡 黄色 | 系统通知和提示       |
| ERROR  | 🔴 红色 | 错误信息             |

## 高级功能演示

### 自定义配置

编辑 `~/.agentic-os/config.yaml`：

```yaml
cli:
  theme: default
  messageLimit: 500  # 修改消息限制

model:
  provider: openai
  model: gpt-4o      # 更改模型
  apiKey: sk-xxx     # 添加 API key

# 添加自定义模块配置
myModule:
  customSetting: value
```

重启 CLI 以加载新配置。

### 编程使用

如果你想在代码中使用 CLI 组件：

```typescript
import { loadConfig, createInitialState, handleUserInput } from '@agentic-os/cli';

// 加载配置
const config = loadConfig();

// 创建状态
let state = createInitialState(config);

// 处理输入
state = handleUserInput(state, 'Hello!');

// 查看消息
console.log(state.messages);
```

运行示例：

```bash
bun run packages/cli/src/example.ts
```

## 故障排除

### 终端显示异常

如果看到乱码或显示异常：

1. 确保使用现代终端：
   - Windows: Windows Terminal
   - Mac: iTerm2 或默认 Terminal
   - Linux: GNOME Terminal、Konsole 等

2. 检查终端大小：
   - 最小推荐尺寸：80x24
   - 推荐尺寸：120x40 或更大

3. 确保终端支持 ANSI 颜色

### 配置未加载

1. 检查配置文件路径：
   ```bash
   # Windows
   echo %USERPROFILE%\.agentic-os\config.yaml
   
   # Unix
   echo ~/.agentic-os/config.yaml
   ```

2. 验证 YAML 格式：
   ```bash
   # 使用 yaml 验证工具
   cat ~/.agentic-os/config.yaml | bun run -e "import yaml from 'js-yaml'; console.log(yaml.load(await Bun.stdin.text()))"
   ```

3. 查看日志输出（如果有错误会显示）

### 无法输入

确保光标在下方输入框中：

- 点击输入框区域
- 或重启应用

## 性能优化建议

### 消息限制

如果消息很多导致卡顿，减少消息限制：

```yaml
cli:
  messageLimit: 100  # 减少到 100 条
```

### 定期清理

定期使用 `/clear` 命令清空历史消息。

## 扩展示例

### 添加自定义命令

编辑 `packages/cli/src/app.ts`：

```typescript
case 'time':
  return addMessage(state, {
    timestamp: new Date(),
    content: `Current time: ${new Date().toLocaleString()}`,
    type: 'system',
  });
```

然后重启 CLI，输入 `/time` 即可看到当前时间。

## 键盘快捷键参考

| 快捷键       | 功能             |
| ------------ | ---------------- |
| Enter        | 发送消息         |
| Ctrl+C       | 退出应用         |
| Esc          | 退出应用         |
| ↑ / ↓        | 滚动消息（可选） |
| Page Up/Down | 快速翻页（可选） |

## 下一步

1. 探索代码：查看 `packages/cli/src/` 目录
2. 阅读文档：
   - [README.md](./README.md) - 功能概述
   - [QUICKSTART.md](./QUICKSTART.md) - 快速开始
   - [DEVELOPMENT.md](./DEVELOPMENT.md) - 开发指南
3. 集成 Agent Bus：将 CLI 与核心系统连接
4. 自定义功能：添加你自己的命令和功能

## 反馈

如有问题或建议，请：

1. 查看文档
2. 检查 GitHub Issues
3. 提交新的 Issue

祝你使用愉快！🚀

