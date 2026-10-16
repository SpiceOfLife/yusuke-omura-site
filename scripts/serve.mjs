// dist/ を Firebase Hosting と同じ cleanUrls 方式で配信する確認用サーバー（/profile → profile.html）。
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".txt": "text/plain", ".xml": "application/xml" };
const port = Number(process.env.PORT || 4173);
const exists = async (f) => (await stat(f).catch(() => null))?.isFile();

createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidates = p.endsWith("/") ? [join("dist", p, "index.html")] : [join("dist", p), join("dist", p + ".html")];
  for (const f of candidates) if (await exists(f)) {
    res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
    return res.end(await readFile(f));
  }
  res.writeHead(404, { "content-type": TYPES[".html"] });
  res.end(await readFile("dist/404.html").catch(() => "not found"));
}).listen(port, () => console.log(`serving dist/ on http://localhost:${port}`));
