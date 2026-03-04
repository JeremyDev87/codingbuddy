# 変更履歴

このプロジェクトのすべての重要な変更は、このファイルに記録されます。

このドキュメントは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) の形式に基づいており、
[セマンティック バージョニング](https://semver.org/lang/ja/spec/v2.0.0.html) に準拠しています。

## [4.4.0] - 2026-03-04

### 追加

- **モデル**: プロバイダーレベルのプレフィックスによるマルチプロバイダーモデルサポートを追加
- **MCP**: opencode/crush および cursor のクライアントタイプ検出とプラットフォーム固有の並列エージェントヒントを追加
- **MCP**: `recommend_skills` ツールに `get_skill` チェーンヒントを追加
- **MCP**: opencode 固有の順次スペシャリストディスパッチヒントを追加
- **MCP**: `parse_mode` に `projectRootWarning` 診断を追加
- **Config**: プロジェクトルート解決ソースの追跡を追加
- **スキル**: 12個の新しいスキル定義を追加（security-audit、documentation-generation、code-explanation、tech-debt、agent-design、rule-authoring、mcp-builder、context-management、deployment-checklist、error-analysis、legacy-modernization、prompt-engineering）
- **スキル**: 12スキルのi18nキーワードトリガーを追加（KO/JA/ZH/ES）

### 修正

- **スキル**: agent-design スキルの JSON サンプルを `agent.schema.json` に準拠するよう修正

### テスト

- クライアントタイプ検出およびヒント分岐テストを追加
- `recommend_skills` の nextAction およびチェーンヒントテストを追加
- 12スキルのキーワードトリガーテストを追加

### ドキュメント

- Codex、Antigravity、Kiro、OpenCode、Cursor のアダプタードキュメントを監査・強化
- 全アダプターに MCP 設定およびプロジェクトルート検出ドキュメントを追加
- 全アダプターにスペシャリストエージェント実行パターンを追加
- スキルカタログをカテゴリ別テーブルに再編成

## [4.3.0] - 2026-02-20

### 追加

- **TUI FlowMap**: U字カーブ矢印をツリーコネクターに置き換えてエージェント階層の可視化を改善 (#574)
- **TUI FlowMap**: `activeStage` の連携とステージ別エージェント統計の追加 (#571)
- **TUI FlowMap**: エージェントノードに `isParallel` フラグと実行モード表示を追加 (#550)
- **TUI FlowMap**: `renderAgentTree` をマルチレベルエージェントサブツリーレンダリング対応に拡張 (#557)
- **TUI ActivityVisualizer**: Activity および Live パネルを再設計して視認性向上 (#551)
- **TUI フッター**: Agent、Skill、Tool の呼び出し回数を追跡・表示
- **TUI ChecklistPanel**: `ChecklistPanel` を `FocusedAgentPanel` から分離して独立表示 (#548)
- **TUI エージェント可視性**: ツール中心表示を実際のエージェント可視性に置き換え (#549)
- **TUI 再起動**: MCP ツールおよび CLI フラグによる TUI 再起動機能を実装 (#545)
- **エージェント**: `software-engineer` をデフォルト ACT エージェントとして追加 (#568)
- **エージェント**: `data-scientist` を ACT 主エージェントとして追加 (#566)
- **エージェント**: `systems-developer` を ACT 主エージェントとして追加 (#565)
- **エージェント**: `security-engineer` を ACT 主エージェントとして追加
- **エージェント**: `test-engineer` を ACT 主エージェントとして追加 (#563)
- **キーワードパターン**: バックエンドキーワード検出にリファクタリングおよび型定義パターンを追加 (#567)

### 修正

- **TUI FlowMap**: プログレスバーに中間進捗値を表示 (#572)
- **TUI FlowMap**: 完了後に古いエージェントを FlowMap から削除 (#570)
- **TUI HeaderBar**: ヘッダーバーのオーバーフロー、ワークスペースパス表示、`sess:` プレフィックス削除を修正 (#547)
- **キーワードタイプ**: `ACT_PRIMARY_AGENTS` に `ai-ml-engineer` を追加 (#562)
- **モードハンドラー**: ACT モードでコンテキストから `recommendedActAgent` を自動継承 (#561)

## [4.2.0] - 2026-02-18

### 追加

- **TUI マルチセッション**: マルチセッションサポートおよびMCP接続時のTUI自動起動 (#485)
- **TUI 自動起動**: `--tui` CLIフラグによる自動起動有効化 (#522)
- **TUI ActivityVisualizer**: MonitorPanelをActivityVisualizerパネルに置き換え (#482)
- **TUI FlowMap**: ビジュアル階層、パイプラインヘッダー、プログレスバーの強化 (#468)
- **TUI MonitorPanel**: イベントログ、エージェントタイムライン、タスク進捗表示
- **TUI 目標**: `parse_mode` レスポンスから目標を連携 (#473)
- **TUI イベント**: ダッシュボード状態にSKILL_RECOMMENDEDイベントを反映 (#474)
- **TUI イベント**: PARALLEL_STARTEDイベントでスペシャリストを事前登録 (#475)
- **TUI イベント**: MODE_CHANGEDで実行中エージェントのステージを同期 (#476)
- **TUI イベント**: `parse_mode`から`recommended_act_agent`と`parallelAgentsRecommendation`を抽出 (#477)
- **TUI 進捗**: TOOL_INVOKEDカウントによる進捗推定 (#472)
- **TUI レイアウト**: FocusedAgentパネル幅を2倍に拡大 (#466)
- **TUI レイアウト**: 精密グリッドレイアウトシステム (#458)
- **TUI レイアウト**: 固定幅右揃えFocusedAgentとレスポンシブFlowMap (#462)
- **TUI StageHealthBar**: ハードコードされたtokenCountをライブツール呼び出しカウントに置き換え (#490)
- **TUI チェックリスト**: `parse_mode`から初期チェックリストを生成し、タスク完了追跡を改善 (#504)
- **TUI FocusedAgent**: アバター、スパークライン、改善されたプログレスバー (#505)
- **TUI テーマ**: BORDER_COLORS定数によるパネルボーダーカラーの統一 (#494)
- **TUI コンテキスト**: context:updatedイベントでFocusedAgentPanelに決定/メモを表示 (#515)
- **TUI セッション**: SESSION_RESETイベントによる`/clear`コマンド時のダッシュボード状態リセット (#499)
- **Config**: codingbuddy MCPの優先ルールおよびCLAUDE.mdセクション追加 (#516, #512)
- **MCPサーバー**: REDフェーズ停止を防ぐTDD実行継続性ルール (#463)
- **GitHub**: カスタム指示によるCopilotコードレビュー設定 (#460)
- **ドキュメント**: 自動起動の起動問題向けTUIトラブルシューティングガイド (#520)

### 変更

- **TUI アクティビティ**: Activityヒートマップを水平バーチャートに置き換え (#517)
- **TUI レイアウト**: FocusedAgentパネル幅を~10%縮小し、Activity/FlowMapパネルを拡大 (#501)
- **TUI タスク**: task:syncedを単一パスに統合し、イベント順序を修正 (#504)

### 修正

- **TUI HeaderBar**: AUTOモードがプロセスフローで順次ステップとして誤表示されていた問題 (#488)
- **TUI タスク**: PLAN/EVALモードでタスクパネルにデータが表示されなかった問題 (#492)
- **TUI Live**: Liveパネルにデータがほとんど表示されなかった問題 — 時間ウィンドウバブルを`renderLiveContext`に置き換え (#502)
- **TUI 進捗**: TOOL_INVOKEDとprimaryエージェント間のagentIdミスマッチにより進捗率が0%に固定されていた問題 (#503)
- **TUI AutoLauncher**: TuiAutoLauncherでの絶対バイナリパス解決 (#519)
- **ビルド**: 古い出力を防ぐためTUIバンドルをメインビルドスクリプトに含める
- **Config**: prettierおよびtsconfigから`.next`とビルド成果物を除外 (#496)

### 削除

- **MCPサーバー**: 未使用コードとデッドエクスポート (#486)
- **TUI**: 純粋コンポーネントからdeprecatedテキストフォーマッター関数を削除

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
