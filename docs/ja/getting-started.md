<p align="center">
  <a href="../getting-started.md">English</a> |
  <a href="../ko/getting-started.md">한국어</a> |
  <a href="../zh-CN/getting-started.md">中文</a> |
  <a href="getting-started.md">日本語</a> |
  <a href="../es/getting-started.md">Español</a>
</p>

# はじめに

数分でCodingbuddyを起動して実行できます。

## 前提条件

- **Node.js**: v18以上
- **AIツール**: 対応するAIコーディングアシスタント（[完全なリストを見る](./supported-tools.md)）

## クイックスタート

### ステップ1：プロジェクトの初期化

```bash
# プロジェクトでCodingbuddyを初期化（APIキー不要）
npx codingbuddy init
```

このコマンドはプロジェクトを分析し、以下を含む`codingbuddy.config.js`を作成します：

- 検出された技術スタック（言語、フレームワーク、ツール）
- アーキテクチャパターン
- コーディング規約
- テスト戦略

#### AI駆動の初期化（オプション）

AIを使用したより詳細な分析には、`--ai`フラグを使用します：

```bash
# Anthropic APIキーを設定
export ANTHROPIC_API_KEY=sk-ant-...

# AI駆動の初期化を実行
npx codingbuddy init --ai
```

AI駆動モードはより深いプロジェクト分析とカスタマイズされた設定を提供します。

### ステップ2：AIツールの設定

CodingbuddyをAIアシスタントに追加します。以下はClaude Desktopの例です：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

他のAIツールについては[対応ツール](./supported-tools.md)を参照してください。

### ステップ3：コーディング開始

これでAIアシスタントが以下にアクセスできます：

- **プロジェクトコンテキスト**: 技術スタック、アーキテクチャ、規約
- **ワークフローモード**: PLAN → ACT → EVAL
- **スペシャリストエージェント**: セキュリティ、パフォーマンス、アクセシビリティの専門家

試してみましょう：

```
ユーザー：PLAN ユーザー認証機能を作成

AI：# Mode: PLAN
    プロジェクトパターンに基づいて認証機能を設計します...
```

## 設定

### 生成される設定ファイル

`codingbuddy.config.js`ファイルでAIの動作をカスタマイズします：

```javascript
module.exports = {
  // AIがこの言語で応答
  language: 'ja',

  // プロジェクトメタデータ
  projectName: 'my-app',

  // 技術スタック
  techStack: {
    languages: ['TypeScript'],
    frontend: ['React', 'Next.js'],
    backend: ['Node.js'],
  },

  // アーキテクチャパターン
  architecture: {
    pattern: 'feature-sliced-design',
  },

  // コーディング規約
  conventions: {
    naming: {
      files: 'kebab-case',
      components: 'PascalCase',
    },
  },

  // テスト戦略
  testStrategy: {
    approach: 'tdd',
    coverage: 80,
  },
};
```

すべてのオプションについては[設定スキーマ](../config-schema.md)を参照してください。

### 追加コンテキスト

AIが知っておくべきプロジェクト固有のドキュメントを追加：

```
my-project/
├── codingbuddy.config.js
└── .codingbuddy/
    └── context/
        ├── architecture.md    # システムアーキテクチャドキュメント
        └── api-conventions.md # API設計規約
```

### 無視パターン

`.codingignore`を作成してAI分析から除外するファイルを指定：

```gitignore
# 依存関係
node_modules/

# ビルド出力
dist/
.next/

# 機密ファイル
.env*
*.pem
```

## ワークフローモードの使用

### PLANモード（デフォルト）

変更を加える前に計画を立てる：

```
ユーザー：PLAN ダークモードサポートを追加

AI：# Mode: PLAN

    ## 実装計画
    1. テーマコンテキストを作成...
    2. トグルコンポーネントを追加...
    3. 設定を永続化...
```

### ACTモード

計画を実行してコードを変更：

```
ユーザー：ACT

AI：# Mode: ACT

    テーマコンテキストを作成中...
    [TDDに従ってコード変更]
```

### EVALモード

実装をレビューして改善：

```
ユーザー：EVAL

AI：# Mode: EVAL

    ## コードレビュー
    - ✅ テーマコンテキストが正しく型付けされている
    - ⚠️ システム設定検出の追加を検討
```

## スペシャリストエージェントの使用

特定のタスクにドメイン専門家を活用：

```
ユーザー：security-specialistエージェントを有効にして認証をレビュー

AI：[security-specialistを有効化]

    ## セキュリティレビュー
    - パスワードハッシュ：✅ bcryptを使用
    - セッション管理：⚠️ トークン有効期限の短縮を検討
    ...
```

利用可能な専門家：

- `security-specialist` - セキュリティ監査
- `performance-specialist` - パフォーマンス最適化
- `accessibility-specialist` - WCAGコンプライアンス
- `code-reviewer` - コード品質
- `architecture-specialist` - システムアーキテクチャ
- `test-strategy-specialist` - テスト戦略
- `i18n-specialist` - 国際化
- `seo-specialist` - SEO最適化
- `ui-ux-designer` - UI/UXデザイン
- `documentation-specialist` - ドキュメンテーション
- `code-quality-specialist` - コード品質標準
- 全リストは[エージェントガイド](../../packages/rules/.ai-rules/agents/README.md)を参照

## 次のステップ

- [対応ツール](./supported-tools.md) - 各AIツールのセットアップガイド
- [設計思想](./philosophy.md) - 設計原則を理解する
- [APIリファレンス](../api.md) - MCPサーバー機能
- [開発ガイド](../development.md) - Codingbuddyへの貢献
