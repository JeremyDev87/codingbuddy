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

**Codingbuddyは35のAIエージェントを調整し、人間のエキスパートチームレベルのコード品質を提供します。**

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

## クイックスタート

**Node.js 18+ および npm 9+（または yarn 4+）が必要です**

### Claude Code プラグイン（推奨）

最速の導入方法 — ハーネスエンジニアリング、自律ループ、エージェントコラボレーションをフル活用：

```bash
# プラグインのインストール
claude plugin install codingbuddy@jeremydev87

# フル機能のためのMCPサーバーインストール
npm install -g codingbuddy

# プロジェクトの初期化
npx codingbuddy init
```

| ドキュメント | 説明 |
|-------------|------|
| [プラグインセットアップガイド](docs/plugin-guide.md) | インストールと設定 |
| [クイックリファレンス](docs/plugin-quick-reference.md) | コマンドとモード一覧 |
| [アーキテクチャ](docs/plugin-architecture.md) | プラグインとMCPの連携 |

### MCP サーバー（その他のAIツール）

Cursor、GitHub Copilot、Antigravity、Amazon Q、Kiroなど、MCP対応ツール向け：

```bash
# プロジェクトを初期化
npx codingbuddy init
```

AIツールのMCP設定に追加：

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

### 使い方

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

---

## マルチエージェントアーキテクチャ

### 3層エージェントシステム

| 層 | エージェント | 役割 |
|----|------------|------|
| **モードエージェント** (4個) | plan-mode, act-mode, eval-mode, auto-mode | ワークフローオーケストレーション |
| **主要エージェント** (16個) | solution-architect, technical-planner, frontend-developer, backend-developer など | コア実装 |
| **スペシャリストエージェント** (15個) | security, accessibility, performance, test-strategy など | ドメイン専門知識 |

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
| 単一AIの視点 | 35のスペシャリストエージェントの視点 |
| 「生成して祈る」 | 計画 → 実装 → 検証 |
| 品質ゲートなし | Critical=0, High=0 必須 |
| 手動レビューが必要 | 自動多次元レビュー |
| 一貫性のない品質 | 基準達成まで反復改善 |

---

## ターミナルダッシュボード (TUI)

CodingbuddyはAIアシスタントと並行して、エージェントアクティビティ、タスクの進捗、ワークフロー状態をリアルタイムで表示する組み込みターミナルUIを提供します。

### クイックスタート

```bash
# TUIを有効にしてMCPサーバーを起動
npx codingbuddy mcp --tui
```

### 機能

| パネル | 説明 |
|--------|------|
| **FlowMap** | アクティブなエージェント、ステージ、進捗を視覚化 |
| **FocusedAgent** | 現在アクティブなエージェントのリアルタイムビューとスパークライン |
| **Checklist** | PLAN/ACT/EVALコンテキストからのタスク完了追跡 |
| **Activity Chart** | リアルタイムのツール呼び出し棒グラフ |
| **マルチセッション** | 複数のClaude Codeセッションが単一TUIウィンドウを共有 |

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

```json
{
  "ai": {
    "defaultModel": "claude-sonnet-4-20250514"
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

```json
{
  "verbosity": "compact"
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
| [スキルライブラリ](packages/rules/.ai-rules/skills/README.md) | 再利用可能なワークフロースキル（TDD、デバッグ、PRなど） |
| [対応ツール](docs/ja/supported-tools.md) | AIツール統合ガイド |
| [設定](docs/config-schema.md) | 設定ファイルオプション |
| [APIリファレンス](docs/api.md) | MCPサーバー機能 |

---

## コントリビューション

貢献を歓迎します！ガイドラインについては[CONTRIBUTING.md](CONTRIBUTING.md)をご覧ください。

## ライセンス

MIT © [Codingbuddy](https://github.com/JeremyDev87/codingbuddy)
