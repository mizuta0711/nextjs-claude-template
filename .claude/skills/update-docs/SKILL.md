---
name: update-docs
description: 実装変更に基づいて設計書の更新が必要な箇所を特定し、更新を実行する。コミット前に実行する。
---

# 設計書反映チェック＋更新

直近の実装変更を分析し、設計書を更新してください。

## Step 1: 変更されたファイルの特定

```bash
git diff --name-only HEAD~${0:-1}
```

$ARGUMENTS が指定されている場合はそのコミット数分を対象。未指定なら直近1コミット。

## Step 2: チェックリスト照合

変更されたファイルに基づき、以下のチェックリストを照合:

| 変更内容 | 更新対象 |
|---------|---------|
| `src/app/api/` 配下の変更 | `docs/設計書/API一覧.md` + `.claude/01_development_docs/03_api_design.md` + `docs/設計書/API・サービス・リポジトリ・フック対応表.md` |
| `src/lib/services/` 配下の変更 | `docs/設計書/サービス・リポジトリ一覧.md` |
| `src/features/*/hooks/` 配下の変更 | `docs/設計書/フック一覧.md` |
| `prisma/schema.prisma` の変更 | `docs/設計書/テーブル定義書.md` + `docs/設計書/ER図.md` |
| `src/lib/ai/prompts/` 配下の変更 | `docs/設計書/ai-prompt-design.md` |
| `src/lib/services/chatFlowService.ts` のフロー変更 | `docs/設計書/チャット・ナレッジフロー図.md` |
| `docs/features/yyyymmdd_*.md` に基づく実装 | 該当する機能設計書のタスクステータスを更新 |

## Step 3: 設計書の更新

該当する設計書を読み、変更内容を反映。改訂履歴も更新すること。

## Step 4: 結果報告

```
## 設計書更新結果

### 更新したファイル
- [ファイル名]: [更新内容]

### 更新不要だったファイル
- [ファイル名]: [理由]
```
