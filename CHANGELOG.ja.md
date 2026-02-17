# 変更履歴

このプロジェクトのすべての重要な変更は、このファイルに記録されます。

このドキュメントは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) の形式に基づいており、
[セマンティック バージョニング](https://semver.org/lang/ja/spec/v2.0.0.html) に準拠しています。

## [4.1.0] - 2026-02-17

### 追加

- **TUI ダッシュボード**: Ink ベースのターミナル UI（Header、AgentCard、AgentTree、AgentGrid、StatusBar、ProgressBar コンポーネント）
- **TUI EventBus**: EventEmitter2 ベースのイベントシステム、`useEventBus` および `useAgentState` React フック
- **TUI IPC**: Unix Domain Socket ベースのスタンドアロンプロセス間通信
- **TUI コンパクトデザイン**: 24行ターミナルに最適化されたシングルラインレイアウト
- **TUI Interceptor**: リアルタイム UI 更新のための MCP ツールディスパッチレイヤー
- **ランディングページ**: Next.js 16 ベースの多言語（5言語）ランディングページ
  - Widget Slot アーキテクチャ（AgentsShowcase、CodeExample、QuickStart ウィジェット）
  - shadcn/ui コンポーネントライブラリ、テーマおよびクッキー同意
  - `next/font` によるセルフホスティングフォント
  - next-intl i18n 設定、パラレルルートおよびロケールスロットレイアウト
  - 静的セクション: Hero、Problem、Solution、FAQ
  - ヘッダー（言語セレクター、テーマトグル）、Footer およびアクセシビリティ改善
  - Vercel デプロイ設定およびアナリティクス統合
  - SEO のための JSON-LD 構造化データ (#424)
  - WCAG 2.1 AA アクセシビリティ声明
- **MCP Server**: SSE エンドポイントの Bearer トークン認証 (#416)
- **Agent システム**: `dispatch_agents` ツールおよび `parse_mode` 自動ディスパッチ (#328)
- **Intent パターン**: `frontend-developer`、`devops-engineer` インテントパターン追加
- **EVAL モード**: EVAL モードでの `recommendedActAgent` サポート (#361)

### 変更

- **Prettier**: `printWidth: 100` でコードベース全体をリフォーマット (#423)
- **MCP Server**: `rules-core`、`keyword-core` 共有モジュール分離 (#415)
- **Plugin**: build スクリプトから重複する `syncVersion` を削除 (#418)

### 修正

- plugin `isPathSafe()` パス正規化および大文字小文字を無視するマッチング (#419)
- MCP server `appendContext` `findLastIndex` マージロジック (#410)
- MCP server `bootstrap()` 未処理の Promise rejection ハンドラー
- MCP server unsafe type assertion ランタイム検証 (#411)
- ランディングページ `html lang` 属性をサーバーレンダー時にロケールから設定 (#412)
- ランディングページ radix-ui メタパッケージを削除、`@radix-ui/react-dialog` を直接使用 (#413)
- `validate-rules.sh` `.ai-rules` パス参照を修正 (#422)
- keyword intent ベース解決で推奨モード時に project config をスキップ
- plugin タイポ `codebuddy` → `codingbuddy` 修正
- CI release-drafter を SHA に固定し、setup action バージョンを整合

### ドキュメント

- TUI ユーザーガイド、アーキテクチャ、トラブルシューティングドキュメント
- ランディングページ README にデプロイガイドとプロジェクト構成を追加
- ドキュメント全体のエージェント数の不一致を修正 (#421)
- MCP_SSE_TOKEN 環境変数のドキュメント (#416)
- JSON-LD 実装計画 (#424)

### テスト

- context-document handler テスト追加 (#417)
- TUI EventBus-UI、App root、transport 統合テスト
- TUI パフォーマンスおよび安定性検証テスト
- ランディングページ root layout および CSP headers テスト
- ランディングページ async server component テスト

---

## [4.0.1] - 2026-02-04

### 追加

- package.jsonとgitタグのバージョン不一致を防ぐためのリリースプロセスの自動検証 (#305)
- 明確なエラーメッセージと修正手順を含む新しい検証スクリプト (`scripts/verify-release-versions.sh`)

### 変更

- フェイルファスト検証ステップを含むリリースワークフローの更新
- claude-code-plugin READMEドキュメントの簡素化

## [4.0.0] - 2026-02-03

### ⚠️ 破壊的変更

#### モデル解決優先順位の変更

**変更前 (v3.x)**:
1. Agent JSON → `model.preferred`
2. Mode Agent → `model.preferred`
3. Global Config → `ai.defaultModel`
4. System Default

**変更後 (v4.0.0)**:
1. Global Config → `ai.defaultModel`（最優先）
2. System Default

#### 設定ファイル形式がJSON専用に変更

**以前 (v3.x)**: `codingbuddy.config.js`と`codingbuddy.config.json`の両方をサポート

**以後 (v4.0.0)**: `codingbuddy.config.json`のみサポート

**理由**: JavaScriptの設定ファイルはESMプロジェクト（`'type': 'module'`）でロードできず、MCPサーバーが言語設定を見つけられない問題が発生しました。JSON形式はモジュールシステムに依存しません。

**移行方法**: 既存の`codingbuddy.config.js`を`.json`形式に変換:
- `module.exports`ラッパーを削除
- キーと文字列にダブルクォートを使用
- 末尾のカンマを削除

**以前**:
```javascript
module.exports = {
  language: 'ja',
}
```

**以後**:
```json
{
  "language": "ja"
}
```

#### 削除されたCLIオプション

- `codingbuddy init`コマンドから`--format`オプションを削除（JSONが唯一の形式）

#### 移行ガイド

1. **グローバル設定を使用している場合は対応不要**：`codingbuddy.config.json` で既に `ai.defaultModel` を設定している場合、設定はそのまま機能します。

2. **Agent JSON の model フィールドは無視されます**：`packages/rules/.ai-rules/agents/*.json` でエージェントモデルの設定をカスタマイズしていた場合、それらの設定は適用されなくなります。代わりに `codingbuddy.config.json` を使用してください：

**codingbuddy.config.json**:
```json
{
  "ai": {
    "defaultModel": "claude-opus-4-20250514"
  }
}
```

#### 削除された API

- `ModelResolverService.resolveForMode()` → `resolve()` を使用
- `ModelResolverService.resolveForAgent()` → `resolve()` を使用
- `ModelSource` 型：`'agent'` および `'mode'` バリアントを削除
- `ResolveModelParams`：`agentModel` および `modeModel` パラメータを削除

### 追加

- **Verbosity システム**：設定可能な詳細レベル（`minimal`、`compact`、`standard`、`detailed`）によるトークン最適化されたレスポンスフォーマット
- **PR All-in-One スキル**：レビュー、承認、マージ操作を統合したプルリクエストワークフロー
- **SRP 複雑度分類器**：単一責任原則分析のための多言語サポート

### 変更

- 非推奨のセッションモジュールを削除し、参照をクリーンアップ
- 依存関係管理を Dependabot から Renovate に移行
- 再現性のためすべての依存関係を正確なバージョンに固定

---

## [3.1.1] - 2026-01-27

### 追加

- parse_mode レスポンスにスキルとエージェントを自動インクルード

### 修正

- CI ワークフローが Dependabot PR に yarn.lock の更新を含めるように修正

---

## [3.1.0] - 2026-01-20

### 追加

- 多言語サポートを含む SRP 複雑度分類器
- サポートされているすべての言語のプラグインガイドドキュメント
