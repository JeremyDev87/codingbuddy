# 変更履歴

このプロジェクトのすべての重要な変更は、このファイルに記録されます。

このドキュメントは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) の形式に基づいており、
[セマンティック バージョニング](https://semver.org/lang/ja/spec/v2.0.0.html) に準拠しています。

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
