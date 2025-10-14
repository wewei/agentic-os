# TUI 自动重绘和自适应功能

## 概述

本次更新为 Agentic OS CLI 的 TUI (Terminal User Interface) 添加了完整的自动重绘和自适应功能，确保在终端窗口大小变化时能够自动调整布局并重绘界面。

## 主要功能

### 1. 自动窗口大小检测
- 监听终端的 `resize` 事件
- 实时获取当前终端窗口的宽度和高度
- 支持动态调整组件尺寸

### 2. 响应式布局系统
- **消息框 (Message Box)**: 占据屏幕上方 80% 的高度（可配置）
- **输入框 (Input Box)**: 占据屏幕下方 20% 的高度（可配置）
- 支持最小高度限制，防止组件过小
- 自动计算和分配可用空间

### 3. 防抖机制
- 使用 100ms 的防抖延迟，避免频繁的 resize 事件导致性能问题
- 确保在用户停止调整窗口大小后才进行重绘

### 4. 最小尺寸验证
- 默认最小屏幕尺寸：20x10 字符
- 默认最小消息框高度：6 行
- 默认最小输入框高度：3 行
- 当屏幕过小时跳过布局更新，防止界面崩溃

### 5. 可配置的布局参数
- `messageBoxRatio`: 消息框占屏幕高度的比例 (0.0-1.0)
- `minMessageBoxHeight`: 消息框最小高度
- `minInputBoxHeight`: 输入框最小高度
- `minScreenWidth`: 最小屏幕宽度
- `minScreenHeight`: 最小屏幕高度

## 技术实现

### 核心函数

#### `updateLayout(components: UIComponents)`
- 根据当前屏幕尺寸动态计算组件位置和大小
- 更新消息框和输入框的尺寸
- 触发组件的 resize 事件

#### `validateScreenSize(screen, layoutConfig)`
- 验证当前屏幕尺寸是否满足最小要求
- 防止在过小的屏幕上进行布局更新

#### `debounce(func, delay)`
- 防抖函数，限制 resize 事件的触发频率
- 提高性能和用户体验

### 配置系统

#### 默认配置
```typescript
const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  messageBoxRatio: 0.8,
  minMessageBoxHeight: 6,
  minInputBoxHeight: 3,
  minScreenWidth: 20,
  minScreenHeight: 10,
};
```

#### 自定义配置
```typescript
const customLayout = createLayoutConfig({
  messageBoxRatio: 0.75,
  minMessageBoxHeight: 8,
  minInputBoxHeight: 4,
});
```

### 配置文件支持

在 `config.yaml` 中可以配置布局参数：

```yaml
cli:
  layout:
    messageBoxRatio: 0.8
    minMessageBoxHeight: 6
    minInputBoxHeight: 3
    minScreenWidth: 20
    minScreenHeight: 10
```

## 使用示例

### 基本使用
```typescript
import { initUI, setupEventHandlers } from './ui.ts';

// 使用默认布局
const components = initUI();

// 设置事件处理器（包含自动 resize 处理）
setupEventHandlers(components, {
  onSubmit: (input) => console.log('Input:', input),
  onExit: () => process.exit(0),
});
```

### 自定义布局
```typescript
import { createLayoutConfig, initUI } from './ui.ts';

// 创建自定义布局配置
const layoutConfig = createLayoutConfig({
  messageBoxRatio: 0.7,  // 消息框占 70% 高度
  minMessageBoxHeight: 8, // 最小 8 行
});

// 使用自定义布局初始化 UI
const components = initUI(layoutConfig);
```

## 兼容性

- 完全向后兼容现有代码
- 默认配置确保在大多数终端环境下正常工作
- 支持各种终端尺寸，从小型终端到大型显示器

## 性能优化

- 防抖机制减少不必要的重绘
- 最小尺寸验证避免无效的布局计算
- 智能的组件尺寸计算，确保最佳显示效果

## 测试验证

所有功能都经过测试验证：
- ✅ 布局配置创建和验证
- ✅ UI 组件初始化和尺寸计算
- ✅ 事件处理器设置和 resize 处理
- ✅ 防抖机制和性能优化
- ✅ 最小尺寸验证和错误处理

## 总结

这次更新为 TUI 添加了完整的响应式支持，确保用户在任何终端尺寸下都能获得良好的使用体验。通过可配置的布局系统和智能的尺寸计算，TUI 现在能够自动适应不同的使用环境，提供一致且美观的界面。
