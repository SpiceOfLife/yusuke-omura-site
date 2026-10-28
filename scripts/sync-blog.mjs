// Google Drive の blog フォルダにある「YYYYMMDD_タイトル」形式の Google ドキュメントを読み、
// content/blog/ の記事を作成・更新・削除する。
//
//   GOOGLE_ACCESS_TOKEN  Drive を読むアクセストークン（GitHub Actions では google-github-actions/auth が発行）
//   BLOG_FOLDER_ID       blog フォルダの ID
//   BLOG_SOURCE_DIR      （テスト用）Drive の代わりに、このフォルダの「YYYYMMDD_タイトル.md」を読む
//
// 規則
//   - ファイル名が YYYYMMDD_タイトル でないもの、ゴミ箱のものは無視
//   - 日付が未来の記事は、その日になるまで公開しない（予約投稿）
//   - URL は初回に決めた /blog/<slug> を、タイトルを変えても使い続ける
//   - Drive から消えた（または名前の規則から外れた）記事はサイトからも消える
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const OUT = process.env.BLOG_OUT || "content/blog";
const IMG = join(OUT, "img");
const INDEX = join(OUT, "posts.json");
const NAME = /^(\d{4})(\d{2})(\d{2})_(.+)$/;
const today = process.env.BLOG_TODAY || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date()); // YYYY-MM-DD（日本時間）

/* ---------- source: Drive or local folder ---------- */
async function listDrive() {
  const token = process.env.GOOGLE_ACCESS_TOKEN, folder = process.env.BLOG_FOLDER_ID;
  if (!token || !folder) throw new Error("GOOGLE_ACCESS_TOKEN と BLOG_FOLDER_ID が必要です");
  const files = [];
  let pageToken = "";
  do {
    const q = encodeURIComponent(`'${folder}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`);
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,modifiedTime)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? `&pageToken=${pageToken}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Drive の一覧取得に失敗: ${r.status} ${await r.text()}`);
    const j = await r.json();
    files.push(...j.files);
    pageToken = j.nextPageToken || "";
  } while (pageToken);
  return files.map((f) => ({ ...f, load: async () => {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=text%2Fmarkdown`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`「${f.name}」の書き出しに失敗: ${r.status}`);
    return r.text();
  } }));
}
function listLocal(dir) {
  return readdirSync(dir).filter((n) => n.endsWith(".md")).map((n) => {
    const p = join(dir, n);
    return { id: "local-" + createHash("sha1").update(n.replace(/\.md$/, "")).digest("hex").slice(0, 12), name: n.replace(/\.md$/, ""),
      modifiedTime: statSync(p).mtime.toISOString(), load: async () => readFileSync(p, "utf8") };
  });
}

/* ---------- helpers ---------- */
const slugify = (title, id) => {
  const ascii = title.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return ascii.length >= 3 ? ascii : id.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toLowerCase();
};
const plain = (md) => md
  .replace(/^\[[^\]]+\]:\s*<?\S+>?\s*$/gm, "")      // 参照リンクの定義
  .replace(/!\[[^\]]*\]\[[^\]]*\]|!\[[^\]]*\]\([^)]*\)/g, "") // 画像
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/\\(.)/g, "$1")                              // Markdown のエスケープ（https\:// など）
  .replace(/https?:\/\/\S+/g, "")                        // 説明文に URL は入れない
  .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, " ")                 // リストの記号
  .replace(/[#>*_`~|]+|-{2,}/g, " ").replace(/\s+/g, " ").trim();

let sharp = null;
try { sharp = (await import("sharp")).default; } catch { /* 画像の縮小は省略 */ }

// ドキュメント内の画像（data URI）をファイルに書き出し、本文の参照を差し替える
async function extractImages(md, slug) {
  const dir = join(IMG, slug);
  rmSync(dir, { recursive: true, force: true });
  const images = [];
  let n = 0;
  const save = async (mime, b64) => {
    n++;
    let buf = Buffer.from(b64, "base64"), ext = mime === "jpeg" ? "jpg" : mime;
    if (sharp && ["png", "jpeg", "jpg", "webp"].includes(mime)) {
      buf = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      ext = "webp";
    }
    mkdirSync(dir, { recursive: true });
    const file = `${n}.${ext}`;
    writeFileSync(join(dir, file), buf);
    const url = `/assets/blog/${slug}/${file}`;
    images.push(url);
    return url;
  };
  const DATA = /data:image\/([a-z+]+);base64,([A-Za-z0-9+/=\s]+)/;
  // 参照形式: [image1]: <data:image/png;base64,...>
  const defs = [...md.matchAll(/^\[([^\]]+)\]:\s*<?(data:image\/[a-z+]+;base64,[A-Za-z0-9+/=\s]+?)>?\s*$/gm)];
  for (const m of defs) { const [, mime, b64] = m[2].match(DATA); md = md.replace(m[0], `[${m[1]}]: ${await save(mime, b64)}`); }
  // インライン形式: ![alt](data:image/png;base64,...)
  for (const m of [...md.matchAll(/!\[([^\]]*)\]\((data:image\/[a-z+]+;base64,[A-Za-z0-9+/=\s]+)\)/g)]) {
    const [, mime, b64] = m[2].match(DATA); md = md.replace(m[0], `![${m[1]}](${await save(mime, b64)})`);
  }
  return { md, images };
}

// Google ドキュメントの Markdown 書き出しのくせを直す
//   - インデントの付いた箇条書きは「> * 項目」（引用の中のリスト）として出てくる → ふつうのリストに戻す
//     （引用の中身がすべてリスト項目のときだけ。ふつうの引用はそのまま）
//   - 等幅フォントの段落（コード）は 1 行ずつ「`…`」になる → 2 行以上続いたらコードブロックにまとめる
function normalizeDocsMarkdown(md) {
  const lines = md.split("\n");
  const out = [];
  const LIST = /^\s*(?:[*+-]|\d+\.)\s+\S/;
  for (let i = 0; i < lines.length; ) {
    // 引用ブロック
    if (/^>/.test(lines[i])) {
      let j = i;
      while (j < lines.length && /^>/.test(lines[j])) j++;
      const inner = lines.slice(i, j).map((l) => l.replace(/^>\s?/, ""));
      const items = inner.filter((l) => l.trim() !== "");
      if (items.length && items.every((l) => LIST.test(l))) out.push(...inner.filter((l) => l.trim() !== "").map((l) => l.replace(/\s+$/, "")));
      else out.push(...lines.slice(i, j));
      i = j; continue;
    }
    // コードの行（行全体が 1 つのインラインコード）
    const CODE = /^(\s*)`([^`]*)`\s*$/;
    if (CODE.test(lines[i])) {
      let j = i;
      while (j < lines.length && CODE.test(lines[j])) j++;
      if (j - i >= 2) {
        out.push("```", ...lines.slice(i, j).map((l) => { const [, sp, code] = l.match(CODE); return sp + code; }), "```");
        i = j; continue;
      }
    }
    out.push(lines[i]); i++;
  }
  return out.join("\n");
}

/* ---------- sync ---------- */
const prev = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : [];
const byId = new Map(prev.map((p) => [p.id, p]));
const source = process.env.BLOG_SOURCE_DIR ? listLocal(process.env.BLOG_SOURCE_DIR) : await listDrive();

mkdirSync(OUT, { recursive: true });
const next = [], log = { created: [], updated: [], deleted: [], scheduled: [], skipped: [] };
const used = new Set();

for (const f of source.sort((a, b) => a.name.localeCompare(b.name))) {
  const m = f.name.trim().match(NAME);
  if (!m) { log.skipped.push(f.name); continue; }
  const [, y, mo, d, rawTitle] = m;
  const date = `${y}-${mo}-${d}`;
  if (Number.isNaN(Date.parse(date))) { log.skipped.push(f.name); continue; }
  if (date > today) { log.scheduled.push(`${f.name}（${date} に公開）`); continue; }
  const title = rawTitle.trim();
  const old = byId.get(f.id);
  // URL は最初に決めたものを使い続ける（日付を変えたときだけ付け直す）
  let slug = old && old.date === date ? old.slug : `${y}${mo}${d}-${slugify(title, f.id)}`;
  while (used.has(slug)) slug += "-2";
  used.add(slug);

  if (old && old.modifiedTime === f.modifiedTime && old.slug === slug && existsSync(join(OUT, `${slug}.md`))) {
    next.push({ ...old, title }); continue;
  }
  const raw = await f.load();
  const { md: withImages, images } = await extractImages(raw, slug);
  const md = normalizeDocsMarkdown(withImages);
  const description = plain(md).slice(0, 120);
  writeFileSync(join(OUT, `${slug}.md`), md.trim() + "\n");
  if (old && old.slug !== slug) { rmSync(join(OUT, `${old.slug}.md`), { force: true }); rmSync(join(IMG, old.slug), { recursive: true, force: true }); }
  next.push({ id: f.id, slug, date, title, description, image: images[0] || null, modifiedTime: f.modifiedTime });
  (old ? log.updated : log.created).push(title);
}

// Drive から消えた記事を削除
const keep = new Set(next.map((p) => p.slug));
for (const p of prev) if (!keep.has(p.slug)) {
  rmSync(join(OUT, `${p.slug}.md`), { force: true });
  rmSync(join(IMG, p.slug), { recursive: true, force: true });
  if (!next.some((n) => n.id === p.id)) log.deleted.push(p.title);
}
next.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date)));
writeFileSync(INDEX, JSON.stringify(next, null, 2) + "\n");

const line = (k, label) => log[k].length && console.log(`${label}: ${log[k].join(" / ")}`);
line("created", "作成"); line("updated", "更新"); line("deleted", "削除"); line("scheduled", "予約"); line("skipped", "対象外の名前");
console.log(`記事 ${next.length} 件（${today} 時点）`);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY,
  `### ブログ同期\n- 作成: ${log.created.join("、") || "なし"}\n- 更新: ${log.updated.join("、") || "なし"}\n- 削除: ${log.deleted.join("、") || "なし"}\n- 予約: ${log.scheduled.join("、") || "なし"}\n- 公開中: ${next.length} 件\n`, { flag: "a" });
