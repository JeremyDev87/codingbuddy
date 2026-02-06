<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.zh-CN.md">中文</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.es.md">Español</a>
</p>

# Codingbuddy

[![CI](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml/badge.svg)](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml)
[![npm version](https://img.shields.io/npm/v/codingbuddy.svg)](https://www.npmjs.com/package/codingbuddy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="docs/ai-rules-architecture.svg" alt="Codingbuddy マルチエージェントアーキテクチャ" width="800"/>
</p>

## コードのためのAIエキスパートチーム

**Codingbuddyは29の専門AIエージェントを調整し、人間のエキスパートチームレベルのコード品質を提供します。**

単一のAIがすべてのエキスパートになることはできません。Codingbuddyは、アーキテクト、開発者、セキュリティスペシャリスト、アクセシビリティエキスパートなどで構成されるAI開発チームを編成し、コードがプロフェッショナルな基準に達するまで協力してレビュー、検証、改善します。

---

## ビジョン

### 問題

AIにコードを依頼すると、単一の視点しか得られません。セキュリティレビューもなく、アクセシビリティチェックもなく、アーキテクチャ検証もありません。一つのAIがすべてを「まあまあ」こなすだけで、何も優れていません。

人間の開発チームにはスペシャリストがいます：
- システムを設計する**アーキテクト**
- 脆弱性を見つける**セキュリティエンジニア**
- エッジケースを捕捉する**QAスペシャリスト**
- ボトルネックを最適化する**パフォーマンスエキスパート**

### 私たちのソリューション

**CodingbuddyはAIコーディングにスペシャリストチームモデルを導入します。**

一つのAIがすべてを試みる代わりに、Codingbuddyは協力する複数の専門エージェントを調整します：

```
┌─────────────────────────────────────────────────────────────┐
│                    あなたのリクエスト                         │
│              「ユーザー認証を実装して」                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 📋 PLAN: ソリューションアーキテクト + アーキテクチャスペシャリスト│
│          → システムアーキテクチャ設計                         │
│          → セキュリティ要件定義                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 🚀 ACT: バックエンド開発者 + テスト戦略スペシャリスト          │
│         → TDDで実装                                          │
│         → 品質基準を遵守                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 🔍 EVAL: コードレビュアー + 並列スペシャリスト                 │
│          🔒 セキュリティ → JWT脆弱性？                        │
│          ♿ アクセシビリティ → WCAG準拠？                      │
│          ⚡ パフォーマンス → 最適化が必要？                    │
│          📏 品質 → SOLID原則？                                │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
        Critical > 0?              Critical = 0 AND
        High > 0?                  High = 0
              │                           │
              ▼                           ▼
        改善事項とともに              ✅ 品質達成
        PLANに戻る                自信を持ってデプロイ
```

---

## マルチエージェントアーキテクチャ

### 3層エージェントシステム

| 層 | エージェント | 役割 |
|----|------------|------|
| **モードエージェント** | plan-mode, act-mode, eval-mode | ワークフローオーケストレーション |
| **主要エージェント** | solution-architect, frontend-developer, backend-developer, code-reviewer など8つ | コア実装 |
| **スペシャリストエージェント** | security, accessibility, performance, test-strategy など15 | ドメイン専門知識 |

### エージェントコラボレーション例

機能をリクエストすると、エージェントが自動的にコラボレーションします：

```
🤖 solution-architect    → アプローチを設計
   └── 👤 architecture-specialist  → レイヤー境界を検証
   └── 👤 test-strategy-specialist → テストカバレッジを計画

🤖 backend-developer     → コードを実装
   └── 👤 security-specialist      → 認証パターンをレビュー
   └── 👤 event-architecture       → メッセージフローを設計

🤖 code-reviewer         → 品質を評価
   └── 👤 4つのスペシャリストが並列 → 多次元レビュー
```

---

## 品質保証サイクル

### PLAN → ACT → EVAL ループ

Codingbuddyは品質駆動の開発サイクルを適用します：

1. **PLAN**: コーディング前の設計（アーキテクチャ、テスト戦略）
2. **ACT**: TDDと品質基準で実装
3. **EVAL**: マルチスペシャリストレビュー（セキュリティ、パフォーマンス、アクセシビリティ、品質）
4. **反復**: 品質目標達成まで継続

### AUTOモード：自律的な品質達成

```bash
# 欲しいものを説明するだけ
AUTO: リフレッシュトークン付きのJWT認証を実装して

# Codingbuddyが自動的に：
# → 実装を計画
# → TDDでコードを書く
# → 4人以上のスペシャリストでレビュー
# → Critical=0 AND High=0まで反復
# → プロダクション対応コードを提供
```

### 終了基準

| 重大度 | デプロイ前に修正必須 |
|--------|---------------------|
| 🔴 Critical | はい - 即時のセキュリティ/データ問題 |
| 🟠 High | はい - 重大な問題 |
| 🟡 Medium | オプション - 技術的負債 |
| 🟢 Low | オプション - 改善 |

---

## 差別化ポイント

| 従来のAIコーディング | Codingbuddy |
|---------------------|-------------|
| 単一AIの視点 | 29のスペシャリストエージェントの視点 |
| 「生成して祈る」 | 計画 → 実装 → 検証 |
| 品質ゲートなし | Critical=0, High=0 必須 |
| 手動レビューが必要 | 自動多次元レビュー |
| 一貫性のない品質 | 基準達成まで反復改善 |

---

## クイックスタート

### 前提条件

- **Node.js** 18.x以上
- **npm** 9.x+ または **yarn** 4.x+
- 対応AIツール（Claude Code, Cursor, GitHub Copilotなど）

### インストール

```bash
# プロジェクトを初期化
npx codingbuddy init

# Claude Desktop設定に追加
# macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
# Windows: %APPDATA%\Claude\claude_desktop_config.json
```

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

### 使い始める

```
PLAN: メール認証付きのユーザー登録を実装して
→ AIチームがアーキテクチャを計画

ACT
→ AIチームがTDDで実装

EVAL
→ AIチームが8つ以上の視点からレビュー

AUTO: 完全な認証システムを構築して
→ AIチームが品質達成まで反復
```

[詳細なセットアップガイド →](docs/ja/getting-started.md)

### Claude Codeプラグイン（オプション）

Claude Codeとの強化された統合のために：

```bash
# マーケットプレイスを追加
claude marketplace add JeremyDev87/codingbuddy

# プラグインをインストール
claude plugin install codingbuddy@jeremydev87

# フル機能のためMCPサーバーをインストール
npm install -g codingbuddy
```

| ドキュメント | 説明 |
|-------------|------|
| [プラグインセットアップガイド](docs/plugin-guide.md) | インストールと設定 |
| [クイックリファレンス](docs/plugin-quick-reference.md) | コマンドとモード一覧 |
| [アーキテクチャ](docs/plugin-architecture.md) | プラグインとMCPの連携 |

---

## 対応AIツール

| ツール | ステータス |
|--------|-----------|
| Claude Code | ✅ フルMCP + プラグイン |
| Cursor | ✅ 対応 |
| GitHub Copilot | ✅ 対応 |
| Antigravity | ✅ 対応 |
| Amazon Q | ✅ 対応 |
| Kiro | ✅ 対応 |
| OpenCode | ✅ 対応 |

[セットアップガイド →](docs/ja/supported-tools.md)

---

## 設定

### AIモデル設定

`codingbuddy.config.json`でデフォルトのAIモデルを設定します：

```javascript
module.exports = {
  ai: {
    defaultModel: 'claude-sonnet-4-20250514', // デフォルト
    // オプション：claude-opus-4-*、claude-sonnet-4-*、claude-haiku-3-5-*
  }
}
```

| モデル | 最適な用途 |
|--------|-----------|
| `claude-opus-4-*` | 複雑なアーキテクチャ、深い分析 |
| `claude-sonnet-4-*` | 一般的な開発（デフォルト） |
| `claude-haiku-3-5-*` | クイック検索（コーディングには非推奨） |

### 詳細度設定

詳細度レベルでトークン使用量を最適化します：

```javascript
module.exports = {
  verbosity: 'compact', // オプション：'minimal'、'compact'、'standard'、'detailed'
}
```

| レベル | 用途 |
|--------|------|
| `minimal` | 最大限のトークン節約、必須情報のみ |
| `compact` | バランス型、簡潔なフォーマット（デフォルト） |
| `standard` | 完全なフォーマット、構造化されたレスポンス |
| `detailed` | 拡張された説明、例を含む |

---

## ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [はじめに](docs/ja/getting-started.md) | インストールとクイックセットアップ |
| [設計思想](docs/ja/philosophy.md) | ビジョンと設計原則 |
| [エージェントシステム](packages/rules/.ai-rules/agents/README.md) | 完全なエージェントリファレンス |
| [対応ツール](docs/ja/supported-tools.md) | AIツール統合ガイド |
| [設定](docs/config-schema.md) | 設定ファイルオプション |
| [APIリファレンス](docs/api.md) | MCPサーバー機能 |

---

## コントリビューション

貢献を歓迎します！ガイドラインについては[CONTRIBUTING.md](CONTRIBUTING.md)をご覧ください。

## ライセンス

MIT © [Codingbuddy](https://github.com/JeremyDev87/codingbuddy)
