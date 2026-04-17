/**
 * PreToolUse フック: git commit 前の型チェック
 *
 * node_modules/.bin/tsc が存在する場合のみ実行する。
 * 未インストール時（テンプレート利用開始直後など）はスキップする。
 * 型エラー検出時はエラー内容の先頭15行を表示してコミットをブロックする。
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const tscBin = path.join(process.cwd(), "node_modules", ".bin", "tsc");
const tscBinCmd = tscBin + ".cmd";

if (!fs.existsSync(tscBin) && !fs.existsSync(tscBinCmd)) {
  console.log(
    JSON.stringify({
      systemMessage:
        "Skipping type check: TypeScript not installed locally. Run `npm install` to enable.",
    })
  );
  process.exit(0);
}

try {
  execSync("npx tsc --noEmit --pretty false 2>&1", {
    encoding: "utf-8",
    timeout: 60000,
  });
  console.log(JSON.stringify({ systemMessage: "Type check passed." }));
} catch (e) {
  const out = (e.stdout || "").split("\n").slice(0, 15).join("\n");
  console.log(
    JSON.stringify({
      continue: false,
      stopReason: "Type check failed. Fix errors before committing:\n" + out,
    })
  );
}
