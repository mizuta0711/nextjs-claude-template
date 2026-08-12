/**
 * SessionStart フック: セッション開始時に現在の状況を注入する
 *
 * matcher: startup|resume|compact
 *
 * 毎回ユーザーが「今どこまで進んでいるか」を説明しなくて済むように、
 * ブランチ・未プッシュ数・未コミット数・進行中の機能設計書を additionalContext に載せる。
 *
 * source === "compact" の場合は pre-compact-save.js が退避した
 * .claude/.session-context.json を読み戻し、コンパクトで失われた文脈を復元する。
 *
 * すべての取得は失敗しても落とさない（情報提示が目的であり、作業を止めてはいけない）。
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SAVE_FILE = path.join(".claude", ".session-context.json");

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf-8") || "{}");
  } catch {
    return {};
  }
}

function git(args) {
  try {
    return execSync(`git ${args}`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    }).trim();
  } catch {
    return "";
  }
}

/** docs/features/ 直下の進行中設計書を、メタ情報の全体ステータス付きで列挙する */
function activeFeatureDocs() {
  const dir = path.join("docs", "features");
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name !== "TEMPLATE.md")
    .map((e) => {
      const file = path.join(dir, e.name);
      let status = "";
      try {
        // メタ情報テーブルの「全体ステータス」行だけを見る（全文読みは不要）
        const head = fs.readFileSync(file, "utf-8").split("\n").slice(0, 40).join("\n");
        const m = head.match(/\|\s*全体ステータス\s*\|\s*([^|]+?)\s*\|/);
        if (m) status = m[1];
      } catch {
        /* 読めなければステータスなしで列挙する */
      }
      // Windows でも設計書内の表記と揃うようスラッシュ区切りに正規化する
      return { file: file.replace(/\\/g, "/"), status };
    })
    .filter((d) => !/🟢|完了/.test(d.status));
}

const input = readInput();
const lines = [];

const branch = git("branch --show-current");
const ahead = git("rev-list --count @{upstream}..HEAD");
const dirty = git("status --porcelain");

const head = [];
if (branch) head.push(`branch: ${branch}`);
if (ahead && ahead !== "0") head.push(`未プッシュ: ${ahead} commits`);
if (dirty) head.push(`未コミット: ${dirty.split("\n").length} ファイル`);
if (head.length) lines.push(`[状況] ${head.join(" / ")}`);

const docs = activeFeatureDocs();
if (docs.length) {
  lines.push("[進行中の機能設計書]");
  for (const d of docs) {
    lines.push(`  - ${d.file}${d.status ? ` (${d.status})` : ""}`);
  }
}

// コンパクト直後は、退避しておいた文脈を復元する
if (input.source === "compact") {
  try {
    const saved = JSON.parse(fs.readFileSync(SAVE_FILE, "utf-8"));
    if (saved?.note) lines.push(`[コンパクト前の作業] ${saved.note}`);
    if (Array.isArray(saved?.activeFeatureDocs) && saved.activeFeatureDocs.length) {
      lines.push(`[コンパクト前の設計書] ${saved.activeFeatureDocs.join(", ")}`);
    }
    fs.unlinkSync(SAVE_FILE);
  } catch {
    /* 退避ファイルが無い・壊れている場合は無視する */
  }
}

if (!lines.length) process.exit(0);

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: lines.join("\n"),
    },
  })
);
