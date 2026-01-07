<p align="center">
  <a href="../getting-started.md">English</a> |
  <a href="../ko/getting-started.md">한국어</a> |
  <a href="getting-started.md">中文</a> |
  <a href="../ja/getting-started.md">日本語</a> |
  <a href="../es/getting-started.md">Español</a>
</p>

# 快速开始

几分钟内即可启动并运行 Codingbuddy。

## 前提条件

- **Node.js**：v18 或更高版本
- **AI 工具**：任何受支持的 AI 编程助手（[查看完整列表](./supported-tools.md)）

## 快速开始

### 步骤 1：初始化项目

```bash
# 在项目中初始化 Codingbuddy（无需 API 密钥）
npx codingbuddy init
```

此命令会分析您的项目并创建 `codingbuddy.config.js` 文件，包含：

- 检测到的技术栈（语言、框架、工具）
- 架构模式
- 编码规范
- 测试策略

#### AI 驱动初始化（可选）

如需使用 AI 进行更详细的分析，请使用 `--ai` 标志：

```bash
# 设置 Anthropic API 密钥
export ANTHROPIC_API_KEY=sk-ant-...

# 运行 AI 驱动初始化
npx codingbuddy init --ai
```

AI 驱动模式提供更深入的项目分析和更个性化的配置。

### 步骤 2：配置 AI 工具

将 Codingbuddy 添加到您的 AI 助手。以下是 Claude Desktop 的示例：

**macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy", "mcp"]
    }
  }
}
```

其他 AI 工具请参阅[支持的工具](./supported-tools.md)。

### 步骤 3：开始编码

现在您的 AI 助手可以访问：

- **项目上下文**：技术栈、架构、规范
- **工作流模式**：PLAN → ACT → EVAL
- **专家代理**：安全、性能、可访问性专家

试试看：

```
用户：PLAN 创建一个用户认证功能

AI：# Mode: PLAN
    我将根据项目模式设计认证功能...
```

## 配置

### 生成的配置文件

`codingbuddy.config.js` 文件用于自定义 AI 行为：

```javascript
module.exports = {
  // AI 使用此语言响应
  language: 'zh',

  // 项目元数据
  projectName: 'my-app',

  // 技术栈
  techStack: {
    languages: ['TypeScript'],
    frontend: ['React', 'Next.js'],
    backend: ['Node.js'],
  },

  // 架构模式
  architecture: {
    pattern: 'feature-sliced-design',
  },

  // 编码规范
  conventions: {
    naming: {
      files: 'kebab-case',
      components: 'PascalCase',
    },
  },

  // 测试策略
  testStrategy: {
    approach: 'tdd',
    coverage: 80,
  },
};
```

所有选项请参阅[配置模式](../config-schema.md)。

### 附加上下文

添加 AI 应该了解的项目特定文档：

```
my-project/
├── codingbuddy.config.js
└── .codingbuddy/
    └── context/
        ├── architecture.md    # 系统架构文档
        └── api-conventions.md # API 设计规范
```

### 忽略模式

创建 `.codingignore` 以从 AI 分析中排除文件：

```gitignore
# 依赖项
node_modules/

# 构建输出
dist/
.next/

# 敏感文件
.env*
*.pem
```

## 使用工作流模式

### PLAN 模式（默认）

在进行更改之前先制定计划：

```
用户：PLAN 添加深色模式支持

AI：# Mode: PLAN

    ## 实施计划
    1. 创建主题上下文...
    2. 添加切换组件...
    3. 持久化偏好设置...
```

### ACT 模式

执行计划并进行代码更改：

```
用户：ACT

AI：# Mode: ACT

    正在创建主题上下文...
    [按照 TDD 进行代码更改]
```

### EVAL 模式

审查和改进实施：

```
用户：EVAL

AI：# Mode: EVAL

    ## 代码审查
    - ✅ 主题上下文类型正确
    - ⚠️ 考虑添加系统偏好检测
```

## 使用专家代理

为特定任务激活领域专家：

```
用户：激活 security-specialist 代理来审查认证

AI：[激活 security-specialist]

    ## 安全审查
    - 密码哈希：✅ 使用 bcrypt
    - 会话管理：⚠️ 考虑缩短令牌过期时间
    ...
```

可用专家：

- `security-specialist` - 安全审计
- `performance-specialist` - 性能优化
- `accessibility-specialist` - WCAG 合规
- `code-reviewer` - 代码质量
- `architecture-specialist` - 系统架构
- `test-strategy-specialist` - 测试策略
- `i18n-specialist` - 国际化
- `seo-specialist` - SEO 优化
- `ui-ux-designer` - UI/UX 设计
- `documentation-specialist` - 文档编写
- `code-quality-specialist` - 代码质量标准
- 完整列表请参阅[代理指南](../../packages/rules/.ai-rules/agents/README.md)

## 后续步骤

- [支持的工具](./supported-tools.md) - 各 AI 工具的设置指南
- [设计理念](./philosophy.md) - 理解设计原则
- [API 参考](../api.md) - MCP 服务器功能
- [开发指南](../development.md) - 为 Codingbuddy 做贡献
