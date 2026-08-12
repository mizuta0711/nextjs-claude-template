/**
 * PostToolUse フック: src 配下の .ts/.tsx を編集した直後に lint を自動修正する
 *
 * settings.json 側で以下の2エントリから呼ばれる:
 *   if: "Edit(src/**\/*.{ts,tsx})"  / if: "Write(src/**\/*.{ts,tsx})"
 * `if` は ToolName(pattern) 形式で単一ツールにしかマッチしないため、
 * Edit と Write の両方を拾うには2エントリ必要になる。
 *
 * 型チェックは意図的に含めていない。毎編集で tsc を回すと実装のテンポを崩すため、
 * まず lint のみで運用し、体感コストを確認してから追加を判断する（設計書 4-5-2 参照）。
 *
 * 非ブロッキング。lint 未導入・エラーいずれの場合も作業は止めない。
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

let payload = {};
try {
  payload = JSON.parse(fs.readFileSync(0, "utf-8") || "{}");
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path || "";
if (!filePath) process.exit(0);

// settings.json の `if` でも絞っているが、単体でも安全に動くよう二重で判定する
const rel = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
if (!/^src\/.*\.(ts|tsx)$/.test(rel)) process.exit(0);

const eslintBin = path.join(process.cwd(), "node_modules", ".bin", "eslint");
if (!fs.existsSync(eslintBin) && !fs.existsSync(eslintBin + ".cmd")) {
  // テンプレート利用開始直後など、まだ依存が入っていない場合は黙ってスキップ
  process.exit(0);
}

try {
  execSync(`npx eslint --fix "${rel}"`, {
    encoding: "utf-8",
    timeout: 25000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  // 修正のみで完了、または元から問題なし。ノイズを増やさないため無出力
  process.exit(0);
} catch (e) {
  // --fix で解決できない指摘が残った場合のみ知らせる
  const out = ((e.stdout || "") + (e.stderr || "")).split("\n").slice(0, 12).join("\n").trim();
  if (!out) process.exit(0);
  console.log(
    JSON.stringify({
      systemMessage: `[lint] ${rel} に自動修正できない指摘が残っています:\n${out}`,
    })
  );
}
