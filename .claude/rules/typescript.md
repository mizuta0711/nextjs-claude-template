---
paths:
  - "src/**/*.{ts,tsx}"
---

# TypeScript コーディングルール

- **`any` 型は禁止**。`unknown`、union型、ジェネリクスで代替すること
- 適切な型定義を必ず行う（API レスポンス、Props、イベントハンドラー等）

型定義の配置・命名の詳細は [.claude/01_development_docs/05_type_definitions.md](../01_development_docs/05_type_definitions.md) を参照。
