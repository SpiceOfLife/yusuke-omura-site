// src/ → dist/ を組み立てる小さなビルド。
//  - <!--#head title="…" description="…" path="/…" --> を <head> の中身に展開（OGP・正規URL込み）
//  - <!--#header current="…" --> / <!--#footer --> を共通パーツに展開
//  - サイトURLは site.config.json の siteUrl（環境変数 SITE_URL で上書き可）
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const conf = JSON.parse(readFileSync("site.config.json", "utf8"));
const SITE = (process.env.SITE_URL || conf.siteUrl).replace(/\/$/, "");
const NAV = [["home", "/", "Home"], ["profile", "/profile", "Profile"], ["works", "/works", "Works"], ["numbers", "/numbers", "Numbers"], ["lab", "/lab", "Lab"]];
const attrs = (s) => Object.fromEntries([...s.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const head = ({ title, description, path = "/" }) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(conf.siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/assets/img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0A1220">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,100..900&family=IBM+Plex+Mono:wght@400;500&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Person", name: "Yusuke Omura", alternateName: "大村優介",
  url: SITE, image: `${SITE}/assets/img/portrait.jpg`, jobTitle: "Pianist, Multi-instrumentalist, Composer", sameAs: [conf.youtube, "https://ours-blanc.app/"] })}</script>`;

const header = ({ current }) => `<a class="sr-only" href="#main">本文へ移動</a>
<div class="progress" aria-hidden="true"></div>
<div class="curtain" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
<div class="cursor" aria-hidden="true"></div>
<header class="site-head">
  <a class="logo" href="/" aria-label="Yusuke Omura ホーム">${[..."YUSUKE OMURA"].map((c) => c === " " ? " " : `<span>${c}</span>`).join("")}</a>
  <nav class="nav" aria-label="メイン">${NAV.map(([k, href, label]) => `<a href="${href}"${k === current ? ' aria-current="page"' : ""}><span class="roll" data-text="${label}">${label}</span></a>`).join("")}</nav>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
</header>
<div class="menu" id="menu" aria-hidden="true">
  <button class="menu-close" type="button">Close</button>
  ${NAV.map(([k, href, label]) => `<a href="${href}"${k === current ? ' aria-current="page"' : ""}>${label}</a>`).join("\n  ")}
</div>`;

const footer = () => `<footer class="site-foot">
  <p class="foot-big"><a href="${conf.youtube}" target="_blank" rel="noopener"><span class="split">Listen ↗</span></a></p>
  <div class="foot-row">
    <span>© ${new Date().getFullYear()} Yusuke Omura / ${conf.label}</span>
    <div class="foot-links">
      <a href="${conf.youtube}" target="_blank" rel="noopener">YouTube</a>
      <a href="https://ours-blanc.app/" target="_blank" rel="noopener">ours-blanc</a>
      <a href="#main">Page top ↑</a>
    </div>
  </div>
</footer>
<script src="/assets/js/main.js" defer></script>`;

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("src/assets", "dist/assets", { recursive: true });
for (const f of readdirSync("src/pages").filter((f) => f.endsWith(".html"))) {
  let html = readFileSync(join("src/pages", f), "utf8");
  html = html.replace(/<!--#head(.*?)-->/s, (_, a) => head(attrs(a)))
             .replace(/<!--#header(.*?)-->/s, (_, a) => header(attrs(a)))
             .replace(/<!--#footer\s*-->/, footer())
             .replaceAll("__SITE_URL__", SITE);
  writeFileSync(join("dist", f), html);
}
const urls = readdirSync("src/pages").filter((f) => f.endsWith(".html") && f !== "404.html")
  .map((f) => `  <url><loc>${SITE}/${f === "index.html" ? "" : f.replace(".html", "")}</loc></url>`).join("\n");
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`built dist/ for ${SITE}`);
