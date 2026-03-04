# 更新日志

本文档记录此项目的所有重要变更。

本文档格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
并遵循 [语义化版本](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。

## [4.4.0] - 2026-03-04

### 新增

- **模型**: 新增多供应商模型支持，支持供应商级别前缀
- **MCP**: 新增 opencode/crush 和 cursor 的客户端类型检测，以及平台特定的并行代理提示
- **MCP**: 在 `recommend_skills` 工具中新增 `get_skill` 链式调用提示
- **MCP**: 新增 opencode 专用的顺序专家分发提示
- **MCP**: 在 `parse_mode` 中新增 `projectRootWarning` 诊断
- **配置**: 追踪项目根目录解析来源
- **技能**: 新增 12 个技能定义（security-audit、documentation-generation、code-explanation、tech-debt、agent-design、rule-authoring、mcp-builder、context-management、deployment-checklist、error-analysis、legacy-modernization、prompt-engineering）
- **技能**: 为 12 个技能新增 i18n 关键词触发器（KO/JA/ZH/ES）

### 修复

- **技能**: 将 agent-design 技能 JSON 示例与 `agent.schema.json` 对齐

### 测试

- 新增客户端类型检测和提示分支测试
- 新增 `recommend_skills` nextAction 和链式调用提示测试
- 新增 12 个技能的关键词触发器测试

### 文档

- 审查并增强 Codex、Antigravity、Kiro、OpenCode 和 Cursor 的适配器文档
- 在所有适配器中新增 MCP 配置和项目根目录检测文档
- 在所有适配器中新增专家代理执行模式文档
- 将技能目录重组为分类表格

## [4.3.0] - 2026-02-20

### 新增

- **TUI FlowMap**: 用树形连接器替换 U 形曲线箭头，改善 Agent 层次可视化 (#574)
- **TUI FlowMap**: 接入 `activeStage` 并添加每阶段 Agent 统计 (#571)
- **TUI FlowMap**: 为 Agent 节点添加 `isParallel` 标志和执行模式显示 (#550)
- **TUI FlowMap**: 扩展 `renderAgentTree` 支持多级 Agent 子树渲染 (#557)
- **TUI ActivityVisualizer**: 重新设计 Activity 和 Live 面板，提升可读性 (#551)
- **TUI 页脚**: 追踪并显示 Agent、Skill 和 Tool 调用次数
- **TUI ChecklistPanel**: 将 `ChecklistPanel` 从 `FocusedAgentPanel` 中拆分，独立显示 (#548)
- **TUI Agent 可见性**: 以真实 Agent 可见性替换以工具为中心的显示 (#549)
- **TUI 重启**: 通过 MCP 工具和 CLI 标志实现 TUI 重启功能 (#545)
- **Agent**: 将 `software-engineer` 添加为默认 ACT Agent (#568)
- **Agent**: 将 `data-scientist` 添加为 ACT 主 Agent (#566)
- **Agent**: 将 `systems-developer` 添加为 ACT 主 Agent (#565)
- **Agent**: 将 `security-engineer` 添加为 ACT 主 Agent
- **Agent**: 将 `test-engineer` 添加为 ACT 主 Agent (#563)
- **关键词模式**: 在后端关键词检测中添加重构和类型定义模式 (#567)

### 修复

- **TUI FlowMap**: 在进度条中显示中间进度值 (#572)
- **TUI FlowMap**: 完成后从 FlowMap 中移除旧 Agent (#570)
- **TUI HeaderBar**: 修复页眉溢出、工作区路径显示及移除 `sess:` 前缀 (#547)
- **关键词类型**: 将 `ai-ml-engineer` 添加到 `ACT_PRIMARY_AGENTS` (#562)
- **模式处理器**: ACT 模式下自动从上下文继承 `recommendedActAgent` (#561)

## [4.2.0] - 2026-02-18

### 新增

- **TUI 多会话**: 多会话支持及MCP连接时自动打开TUI (#485)
- **TUI 自动启动**: 通过`--tui` CLI参数启用自动启动 (#522)
- **TUI ActivityVisualizer**: 用ActivityVisualizer面板替换MonitorPanel (#482)
- **TUI FlowMap**: 增强视觉层次结构、管道头部和进度条 (#468)
- **TUI MonitorPanel**: 事件日志、代理时间线和任务进度显示
- **TUI 目标**: 从`parse_mode`响应中连接目标 (#473)
- **TUI 事件**: 仪表板状态中的SKILL_RECOMMENDED事件 (#474)
- **TUI 事件**: PARALLEL_STARTED事件预注册专家 (#475)
- **TUI 事件**: MODE_CHANGED时同步运行代理阶段 (#476)
- **TUI 事件**: 从`parse_mode`提取`recommended_act_agent`和`parallelAgentsRecommendation` (#477)
- **TUI 进度**: 通过TOOL_INVOKED计数估算进度 (#472)
- **TUI 布局**: FocusedAgent面板宽度加倍 (#466)
- **TUI 布局**: 精确网格布局系统 (#458)
- **TUI 布局**: 固定宽度右对齐FocusedAgent与响应式FlowMap (#462)
- **TUI StageHealthBar**: 实时工具调用计数替换硬编码的tokenCount (#490)
- **TUI 清单**: 从`parse_mode`生成初始清单并改善任务完成跟踪 (#504)
- **TUI FocusedAgent**: 头像、迷你图和改进的进度条 (#505)
- **TUI 主题**: 通过BORDER_COLORS常量统一面板边框颜色 (#494)
- **TUI 上下文**: 通过context:updated事件在FocusedAgentPanel中显示决策/笔记 (#515)
- **TUI 会话**: 通过SESSION_RESET事件在`/clear`命令时重置仪表板状态 (#499)
- **配置**: codingbuddy MCP优先级规则和CLAUDE.md章节 (#516, #512)
- **MCP服务器**: 防止RED阶段停止的TDD执行连续性规则 (#463)
- **GitHub**: 带自定义说明的Copilot代码审查设置 (#460)
- **文档**: 自动启动问题的TUI故障排除指南 (#520)

### 变更

- **TUI 活动**: Activity热图替换为水平条形图 (#517)
- **TUI 布局**: FocusedAgent面板宽度减少约10%，Activity/FlowMap面板扩大 (#501)
- **TUI 任务**: task:synced合并为单次处理并修复事件顺序 (#504)

### 修复

- **TUI HeaderBar**: AUTO模式在流程中错误显示为顺序步骤 (#488)
- **TUI 任务**: PLAN/EVAL模式下任务面板无数据 (#492)
- **TUI Live**: Live面板几乎无数据——用`renderLiveContext`替换时间窗口气泡 (#502)
- **TUI 进度**: 因TOOL_INVOKED与主代理agentId不匹配导致进度百分比停在0% (#503)
- **TUI AutoLauncher**: 解析TuiAutoLauncher中的绝对二进制路径 (#519)
- **构建**: 在主构建脚本中包含TUI bundle以防止过时导出
- **配置**: 在prettier和tsconfig中排除`.next`和构建产物 (#496)

### 移除

- **MCP服务器**: 未使用代码和死亡导出 (#486)
- **TUI**: 从纯组件中移除已弃用的文本格式化函数

## [4.1.0] - 2026-02-17

### 新增

- **TUI 仪表板**: 基于Ink的终端UI（Header、AgentCard、AgentTree、AgentGrid、StatusBar、ProgressBar组件）
- **TUI EventBus**: 基于EventEmitter2的事件系统，包含`useEventBus`和`useAgentState` React钩子
- **TUI IPC**: 基于Unix Domain Socket的独立进程间通信
- **TUI 紧凑设计**: 针对24行终端优化的单行布局
- **TUI 拦截器**: 用于实时UI更新的MCP工具分发层
- **MCP 服务器**: SSE端点的Bearer令牌认证 (#416)
- **代理系统**: `dispatch_agents`工具和`parse_mode`响应中的自动分发 (#328)
- **EVAL模式**: EVAL模式中的`recommendedActAgent`支持 (#361)

### 变更

- **Prettier**: 使用`printWidth: 100`重新格式化整个代码库 (#423)
- **MCP服务器**: 提取共享`rules-core`和`keyword-core`模块 (#415)

### 修复

- 插件`isPathSafe()`路径规范化和大小写不敏感匹配 (#419)
- MCP服务器`appendContext` `findLastIndex`合并逻辑 (#410)
- 关键字意图解析在推荐模式下跳过项目配置

## [4.0.1] - 2026-02-04

### 新增

- 自动化版本一致性验证以防止 package.json 和 git 标签版本不匹配 (#305)
- 新增验证脚本 (`scripts/verify-release-versions.sh`)，包含清晰的错误消息和修复说明

### 变更

- 更新发布工作流程，添加快速失败验证步骤
- 简化 claude-code-plugin README 文档

## [4.0.0] - 2026-02-03

### ⚠️ 破坏性变更

#### 模型解析优先级变更

**变更前 (v3.x)**:
1. Agent JSON → `model.preferred`
2. Mode Agent → `model.preferred`
3. Global Config → `ai.defaultModel`
4. System Default

**变更后 (v4.0.0)**:
1. Global Config → `ai.defaultModel`（最高优先级）
2. System Default

#### 配置文件格式更改为仅支持 JSON

**之前 (v3.x)**: 同时支持 `codingbuddy.config.js` 和 `codingbuddy.config.json`

**之后 (v4.0.0)**: 仅支持 `codingbuddy.config.json`

**原因**: JavaScript 配置文件无法在 ESM 项目（`'type': 'module'`）中加载，导致 MCP 服务器无法找到语言设置。JSON 格式与模块系统无关。

**迁移方法**: 将现有的 `codingbuddy.config.js` 转换为 `.json` 格式：
- 移除 `module.exports` 包装器
- 键和字符串使用双引号
- 移除尾随逗号

**之前**:
```javascript
module.exports = {
  language: 'zh-CN',
}
```

**之后**:
```json
{
  "language": "zh-CN"
}
```

#### 已移除的 CLI 选项

- 从 `codingbuddy init` 命令中移除 `--format` 选项（JSON 现在是唯一格式）

#### 迁移指南

1. **如果使用全局配置则无需操作**：如果您已在 `codingbuddy.config.json` 中设置了 `ai.defaultModel`，您的配置将继续正常工作。

2. **Agent JSON 的 model 字段现已被忽略**：如果您在 `packages/rules/.ai-rules/agents/*.json` 中自定义了代理模型偏好设置，这些设置将不再生效。请改用 `codingbuddy.config.json`：

**codingbuddy.config.json**:
```json
{
  "ai": {
    "defaultModel": "claude-opus-4-20250514"
  }
}
```

#### 已移除的 API

- `ModelResolverService.resolveForMode()` → 请使用 `resolve()`
- `ModelResolverService.resolveForAgent()` → 请使用 `resolve()`
- `ModelSource` 类型：`'agent'` 和 `'mode'` 变体已移除
- `ResolveModelParams`：`agentModel` 和 `modeModel` 参数已移除

### 新增

- **Verbosity 系统**：通过可配置的详细级别（`minimal`、`compact`、`standard`、`detailed`）实现令牌优化的响应格式化
- **PR All-in-One 技能**：整合审查、批准和合并操作的统一拉取请求工作流程
- **SRP 复杂度分类器**：支持多语言的单一职责原则分析

### 变更

- 移除已弃用的会话模块并清理相关引用
- 依赖管理从 Dependabot 迁移到 Renovate
- 为确保可重现性，所有依赖项固定到精确版本

---

## [3.1.1] - 2026-01-27

### 新增

- parse_mode 响应中自动包含技能和代理

### 修复

- CI 工作流程现确保 Dependabot PR 包含 yarn.lock 更新

---

## [3.1.0] - 2026-01-20

### 新增

- 支持多语言的 SRP 复杂度分类器
- 所有支持语言的插件指南文档
