# 更新日志

本文档记录此项目的所有重要变更。

本文档格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
并遵循 [语义化版本](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。

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
