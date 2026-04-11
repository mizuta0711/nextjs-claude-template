# CLAUDE.md

対話は日本語で行うこと。

@AGENTS.md

## サブエージェントのモデル指定

コスト最適化のため、サブエージェント起動時は原則 `model: "sonnet"` を指定すること。

- **Explore / general-purpose / Plan**: Agent tool 呼び出し時に `model: "sonnet"` を付与
- **カスタムエージェント**: `.claude/agents/` の frontmatter で `model: sonnet` 設定済み
- **Opus を使う例外**: 複雑な設計判断やアーキテクチャ決定など、高度な推論が必要な場合のみ

## プロジェクト概要

<!-- プロジェクトの概要を記載 -->

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript (strict) + TailwindCSS 4 + Zustand 5 + Prisma 6 (PostgreSQL) + NextAuth 4

```
src/
├── app/           # Next.js App Router（ページ・API）
├── features/      # 機能別モジュール
│   └── {feature}/ # components/, stores/, hooks/, services/, data/
├── components/    # 共通コンポーネント（layout/, providers/, common/）
├── lib/           # ユーティリティ（ai/, api/, auth.ts, db.ts, services/）
└── types/         # 型定義
```

## Build & Dev Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint

## ドキュメント構成

| 場所 | 内容 |
|------|------|
| `.claude/01_development_docs/` | 技術設計（API, DB, エラー処理, 型, サービス, フック, AIプロンプト） |
| `.claude/02_design_system/` | デザインシステム、コンポーネント設計 |
| `.claude/03_library_docs/` | Next.js 16, Zustand 5, NextAuth 4 ガイド |
| `docs/設計書/` | API一覧, テーブル定義書, ER図, サービス一覧, フック一覧, 対応表 |
| `docs/features/` | 機能設計書（`yyyymmdd_機能名.md`） |
| `docs/reviews/` | レビュー結果の記録 |

**参照ルール**: 全てを読まず、作業内容に応じて該当ドキュメントのみ読むこと。

## 設計書の改訂履歴ルール

`docs/設計書/` および `docs/features/` 配下の設計ドキュメントには末尾に改訂履歴テーブルを設け、改訂時は必ず更新すること。

**改訂履歴のフォーマット:**
```
| 版数 | 日付 | コミット | 内容 | 担当 |
```
- コミット列にはトリガーとなったコミットの短縮ハッシュ（7文字）を記入
- `/update-docs` 実行時は `docs/設計書/.doc-sync.md` にも同期記録を追記すること

## 機能設計書の運用ルール

- 新規機能開発時は `docs/features/TEMPLATE.md` をコピーして作成（`/new-feature` Skillで自動化可能）
- 命名: `docs/features/yyyymmdd_機能名.md`
- タスクステータス: 🔵未実施 / 🟡実装中 / ✅完了 / ⏸️保留(理由必須) / ❌却下(理由必須)
- 完了した機能設計書は `docs/features/completed/` に移動

## 設計・実装の必須フロー

```
設計 → /design-review → 実装 → /code-review → /build-check → /update-docs → コミット → /pre-push-check → /sync-check → プッシュ
```

### 実装前

1. **設計**: 設計書を更新（APIのリクエスト・レスポンスJSON例は必須）
2. **設計レビュー**: `/design-review` を実行。指摘があれば修正してから実装へ
3. **実装**: 設計書に基づき実装。サブエージェント委譲時はAPI設計書のパスを明示

### 実装後（省略禁止）

**コードを書き終えたら、以下を必ずこの順序で実行すること。1つでもスキップしてはならない。**

4. **`/code-review`** を実行 → 指摘は自動修正、結果は `docs/reviews/` に保存
5. **`/build-check`** を実行
6. **`/update-docs`** を実行 → 設計書と機能設計書のタスクステータスを更新
7. **コミット**: フェーズ単位でコミット

**レビュー前にコミットしないこと。ビルド確認だけでレビューを飛ばさないこと。**

### プッシュ前（省略禁止）

8. **`/pre-push-check`** を実行 → `docs/設計書/.doc-sync.md` に全コミットハッシュが記録されているか grep で高速チェック
   - 未記録のコミットがあれば設計書を更新し、同期記録を追記
   - **全コミットが記録されるまでプッシュしないこと**
9. **`/sync-check`** を実行（フェーズ完了時・大規模変更後に推奨） → 設計書と実装の全量照合
   - サービス一覧・フック一覧・対応表・テーブル定義書・機能設計書のタスクステータスを網羅チェック
   - `/update-docs` の変更駆動では検出できない「そもそも記載のない項目」を発見

## DB スキーマ変更時の必須ルール

テーブル構造の変更（カラム追加・削除・型変更・テーブル追加/削除）を行う際は、以下を**必ず**守ること:

1. **バックアップ実行**: スキーマ変更の**前に** `npx tsx tools/export-to-sql.ts` を実行
2. **3点同期**: スキーマ変更時は以下の3箇所を**必ず同時に更新**する:

| # | 対象 | ファイル |
|---|------|---------|
| 1 | スキーマ | `prisma/schema.prisma` |
| 2 | 設計書 | `docs/設計書/テーブル定義書.md`（+ Enum定義セクション） |
| 3 | バックアップツール | `tools/export-to-sql.ts`（`ORDERED_TABLES` + `DB_TABLE_MAP`） |

**1つでも更新漏れがあると、バックアップが不完全になる。**

## メモリ管理

- 一度に編集するファイルは最大5ファイル
- 段階的にビルド確認
- 大きなフェーズは細分化してコミット

## よくあるエラーと対処法

| エラー | 対処法 |
|-------|--------|
| Module not found | `rm -rf node_modules package-lock.json && npm install` |
| TypeScript エラー | 型定義を確認し、`any` を使わず適切な型を設定 |
| ビルドエラー | `rm -rf .next && npm run build` |
