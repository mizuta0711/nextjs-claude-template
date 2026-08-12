/**
 * PreToolUse フック: npx prisma migrate 実行前の DB バックアップ
 *
 * コマンド判定は本スクリプト内で stdin の JSON (tool_input.command) を読んで行う。
 * settings.json 側で `if: "Bash(npx prisma migrate *)"` を併用すれば無関係な Bash 呼び出しで
 * 本スクリプトが起動しなくなる（`if` はパーミッションルール構文の公式フィールド）。
 * ここでの判定は `if` の有無に関わらず動くようにするための二重防御。
 *
 * - `npx prisma migrate` を含むコマンド時のみ `tools/export-to-sql.ts` を実行
 * - それ以外の Bash コマンドは即 exit 0 でスキップ
 * - backup 失敗時は continue:false で migrate をブロックし、Claude を停止させる。
 *   pre-commit-type-check.js が permissionDecision:"deny"（Claude が自力で修正して
 *   再試行できる）を使うのに対し、こちらを強い停止にしているのは意図的:
 *   バックアップなしで破壊的な DB 操作へ進ませないため、人間の判断を必ず挟む。
 */
const { execSync } = require("child_process");

let input = "";
try {
  input = require("fs").readFileSync(0, "utf-8");
} catch {
  process.exit(0);
}

let payload = {};
try {
  payload = JSON.parse(input || "{}");
} catch {
  process.exit(0);
}

const command = payload?.tool_input?.command || "";

if (!/\bnpx\s+prisma\s+migrate\b/.test(command)) {
  process.exit(0);
}

try {
  execSync("npx tsx tools/export-to-sql.ts", {
    stdio: "inherit",
    timeout: 30000,
  });
  console.log(
    JSON.stringify({ systemMessage: "DB backup completed before migrate." })
  );
} catch (e) {
  console.log(
    JSON.stringify({
      continue: false,
      stopReason: "DB backup failed. Fix before running migrate: " + e.message,
    })
  );
}
