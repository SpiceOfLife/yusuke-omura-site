// src/ → dist/ を組み立てる小さなビルド。
//  - <!--#head title="…" description="…" path="/…" --> を <head> の中身に展開（OGP・正規URL込み）
//  - <!--#header current="…" --> / <!--#footer --> を共通パーツに展開
//  - サイトURLは site.config.json の siteUrl（環境変数 SITE_URL で上書き可）
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { marked } from "marked";

const conf = JSON.parse(readFileSync("site.config.json", "utf8"));
const SITE = (process.env.SITE_URL || conf.siteUrl).replace(/\/$/, "");
const NAV = [["home", "/", "Home"], ["profile", "/profile", "Profile"], ["works", "/works", "Works"], ["numbers", "/numbers", "Numbers"], ["live", "/live", "Live"], ["lab", "/lab", "Lab"], ["blog", "/blog/", "Blog"]];
const attrs = (s) => Object.fromEntries([...s.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// 検索エンジン向けの構造化データ（人物・サイト・パンくず）
const PERSON = {
  "@type": "Person", "@id": `${SITE}/#person`,
  name: "大村優介", alternateName: ["Yusuke Omura", "おおむら ゆうすけ", "大村 優介"],
  url: `${SITE}/`, image: `${SITE}/assets/img/portrait.jpg`,
  jobTitle: ["ジャズピアニスト", "マルチ楽器奏者", "作曲家", "編曲家"],
  description: "1993年生まれ。洗足学園音楽大学ジャズ科卒業。ピアノ・トランペットを中心に鍵盤・管楽器・弦楽器を演奏するマルチ楽器奏者、作編曲家。自主レーベル Shirokuma Records 主宰。",
  birthDate: "1993",
  alumniOf: { "@type": "CollegeOrUniversity", name: "洗足学園音楽大学", alternateName: "Senzoku Gakuen College of Music" },
  memberOf: { "@type": "MusicGroup", name: "CARATORIUM" },
  brand: { "@type": "Organization", name: conf.label, logo: `${SITE}/assets/img/icon-512.png` },
  award: ["SAPPORO CITY JAZZ 2023 ベストプレイヤー賞", "Japan Jazz Pop Competition 2023 クリエイター部門 銀賞"],
  knowsAbout: ["Jazz", "Piano", "Trumpet", "Composition", "Arrangement", "Mixing", "Mastering"],
  sameAs: [conf.youtube, conf.instagram, conf.facebook, conf.apps].filter(Boolean),
};
const PAGE_NAMES = { "/profile": "プロフィール", "/works": "作品", "/numbers": "数字で見る大村優介", "/lab": "Lab", "/live": "ライブ", "/blog/": "ブログ" };
const ld = (path, title, extra = []) => {
  const graph = [PERSON, { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: conf.siteName, alternateName: ["Yusuke Omura 公式サイト", "大村優介 公式サイト", "Yusuke Omura"], inLanguage: "ja", publisher: { "@id": `${SITE}/#person` } },
    { "@type": path === "/" ? "ProfilePage" : "WebPage", url: `${SITE}${path}`, name: title, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#person` }, ...(path === "/" ? { mainEntity: { "@id": `${SITE}/#person` } } : {}) }];
  if (PAGE_NAMES[path]) graph.push({ "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: PAGE_NAMES[path], item: `${SITE}${path}` }] });
  if (path === "/works") graph.push({ "@type": "MusicAlbum", name: "Faint traces of vague emotions, revealed through irregular waves", byArtist: { "@id": `${SITE}/#person` },
    datePublished: "2026-09-21", recordLabel: { "@type": "Organization", name: conf.label }, image: `${SITE}/assets/img/album-faint-traces.jpg` });
  graph.push(...extra);
  return { "@context": "https://schema.org", "@graph": graph };
};

const head = ({ title, description, path = "/", image, ogType, extraLd = [] }) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<meta name="robots" content="index,follow,max-image-preview:large">
${conf.googleSiteVerification ? `<meta name="google-site-verification" content="${conf.googleSiteVerification}">\n` : ""}<meta name="author" content="大村優介 Yusuke Omura">
<meta property="og:type" content="${ogType || (path === "/" ? "profile" : "website")}">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="${esc(conf.siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}${image || "/assets/img/og.jpg"}">
${image ? "" : `<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n`}
<meta property="og:image:alt" content="大村優介 Yusuke Omura">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0A1220">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/assets/img/icon-192.png" type="image/png" sizes="192x192">
<link rel="icon" href="/assets/img/icon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,100..900&family=IBM+Plex+Mono:wght@400;500&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="alternate" type="application/rss+xml" title="${esc(conf.siteName)} Blog" href="/blog/feed.xml">
<script type="application/ld+json">${JSON.stringify(ld(path, title, extraLd)).replace(/</g, "\\u003c")}</script>`;

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
      <a href="${conf.instagram}" target="_blank" rel="noopener">Instagram</a>
      <a href="${conf.apps}" target="_blank" rel="noopener">ours-blanc</a>
      <a href="#main">Page top ↑</a>
    </div>
  </div>
</footer>
<script src="/assets/js/main.js" defer></script>`;


/* ---------- live（content/live.json）: 予定は MusicEvent の構造化データ付きで出す ---------- */
const todayJst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const lives = (existsSync("content/live.json") ? JSON.parse(readFileSync("content/live.json", "utf8")) : []).sort((a, b) => a.date.localeCompare(b.date));
const upcoming = lives.filter((l) => l.date >= todayJst), past = lives.filter((l) => l.date < todayJst).reverse();
const dow = (d) => "日月火水木金土"[new Date(d + "T00:00:00+09:00").getUTCDay()];
const liveDate = (l) => `${l.date.replaceAll("-", ".")} (${dow(l.date)})`;
const eventLd = (l) => ({ "@type": "MusicEvent", name: `${l.title}｜大村優介`, startDate: `${l.date}T${l.start || "19:00"}:00+09:00`, ...(l.open ? { doorTime: `${l.date}T${l.open}:00+09:00` } : {}),
  eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: { "@type": "Place", name: l.venue, address: { "@type": "PostalAddress", streetAddress: l.address, addressLocality: l.locality, addressRegion: l.region, addressCountry: "JP" } },
  performer: [{ "@id": `${SITE}/#person` }, ...(l.performers || []).filter((p) => !p.startsWith("大村優介")).map((p) => ({ "@type": "Person", name: p.replace(/\s*\(.*\)$/, "") }))],
  organizer: { "@id": `${SITE}/#person` }, image: `${SITE}/assets/img/og.jpg`, description: `${l.venue}にて。出演: ${(l.performers || []).join("、")}。${l.priceNote || ""}`,
  ...(l.price ? { offers: { "@type": "Offer", price: String(l.price), priceCurrency: "JPY", availability: "https://schema.org/InStock", url: l.url || `${SITE}/live`, validFrom: `${new Date().toISOString().slice(0, 10)}` } } : {}) });
const liveCard = (l, i) => `<li class="live-card reveal" style="--i:${i}">
      <time class="lc-date" datetime="${l.date}">${liveDate(l)}</time>
      <div class="lc-body">
        <h3 class="lc-title">${esc(l.title)}</h3>
        <p class="lc-venue">${esc(l.venue)}<span class="muted">　${esc(l.address || "")}</span></p>
        ${l.performers?.length ? `<p class="lc-who">${l.performers.map(esc).join(" / ")}</p>` : ""}
        <p class="lc-meta mono">${l.open ? `OPEN ${l.open} / ` : ""}START ${l.start || ""}${l.priceNote ? ` ・ ${esc(l.priceNote)}` : ""}</p>
        ${l.url ? `<a class="lc-link" href="${l.url}" target="_blank" rel="noopener">詳細・ご予約 ↗</a>` : ""}
      </div>
    </li>`;
const nextLive = upcoming[0] ? `<section class="section wrap next-live" aria-labelledby="next-live-h">
    <p class="eyebrow" id="next-live-h">Next Live</p>
    <ol class="live-list">${liveCard(upcoming[0], 0)}</ol>
    <a class="btn reveal" href="/live">Schedule <span class="arrow">→</span></a>
  </section>` : "";

const postsEarly = existsSync("content/blog/posts.json") ? JSON.parse(readFileSync("content/blog/posts.json", "utf8")) : [];
const latestPosts = postsEarly.length ? `<section class="section wrap latest-posts" aria-labelledby="latest-posts-h">
    <p class="eyebrow" id="latest-posts-h">Blog</p>
    <ol class="post-grid">${postsEarly.slice(0, 3).map((p, i) => `<li class="post-card reveal" style="--i:${i}">
      <a href="/blog/${p.slug}"><time class="pc-date" datetime="${p.date}">${p.date.replaceAll("-", ".")}</time><span class="pc-title">${esc(p.title)}</span><span class="pc-arrow" aria-hidden="true">→</span></a>
    </li>`).join("\n    ")}</ol>
    <a class="btn reveal" href="/blog/">All posts <span class="arrow">→</span></a>
  </section>` : "";
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("src/assets", "dist/assets", { recursive: true });
cpSync("src/_headers", "dist/_headers");
cpSync("src/favicon.ico", "dist/favicon.ico");  // 検索結果のアイコン（Shirokuma Records のロゴ）  // Cloudflare Pages のレスポンスヘッダー
for (const f of readdirSync("src/pages").filter((f) => f.endsWith(".html"))) {
  let html = readFileSync(join("src/pages", f), "utf8");
  html = html.replace(/<!--#head(.*?)-->/s, (_, a) => head(attrs(a)))
             .replace(/<!--#header(.*?)-->/s, (_, a) => header(attrs(a)))
             .replace(/<!--#footer\s*-->/, footer())
             .replace(/<!--#nextlive\s*-->/, nextLive)
             .replace(/<!--#latestposts\s*-->/, latestPosts)
             .replaceAll("__SITE_URL__", SITE);
  writeFileSync(join("dist", f), html);
}

/* ---------- blog (content/blog は scripts/sync-blog.mjs が Google Drive から作る) ---------- */
const posts = existsSync("content/blog/posts.json") ? JSON.parse(readFileSync("content/blog/posts.json", "utf8")) : [];
if (existsSync("content/blog/img")) cpSync("content/blog/img", "dist/assets/blog", { recursive: true });
mkdirSync("dist/blog", { recursive: true });
const jpDate = (d) => { const [y, m, dd] = d.split("-"); return `${y}.${m}.${dd}`; };
marked.use({ gfm: true, breaks: false });
const render = (md) => marked.parse(md)
  .replace(/<img /g, '<img loading="lazy" decoding="async" ')
  .replace(/<a href="(https?:)/g, '<a target="_blank" rel="noopener" href="$1')
  .replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
const page = (opts, current, body, script = "") => `<!doctype html>
<html lang="ja">
<head>
${head(opts)}
</head>
<body class="${opts.bodyClass}">
${header({ current })}
<main id="main">
${body}
</main>
${footer()}${script}
</body>
</html>
`;
// 関連記事: タイトルの英数字の語（R36S, WASM-4 など）が重なる記事を優先し、足りなければ新しい順で埋める
const words = (t) => new Set((t.match(/[A-Za-z0-9][A-Za-z0-9.+-]{2,}|[ァ-ヶー]{4,}/g) || []).map((w) => w.toLowerCase()));
const related = (p, n = 3) => posts.filter((q) => q.slug !== p.slug)
  .map((q, i) => ({ q, i, s: [...words(q.title)].filter((w) => words(p.title).has(w)).length }))
  .sort((a, b) => b.s - a.s || a.i - b.i).slice(0, n).map((x) => x.q);
const card = (p, i) => `<li class="post-card reveal" style="--i:${i}">
      <a href="/blog/${p.slug}">
        <time class="pc-date" datetime="${p.date}">${jpDate(p.date)}</time>
        <span class="pc-title">${esc(p.title)}</span>
        <span class="pc-arrow" aria-hidden="true">→</span>
      </a>
    </li>`;
writeFileSync("dist/blog/index.html", page({ title: "ブログ｜大村優介 Yusuke Omura", description: "大村優介（Yusuke Omura）のブログ。演奏、制作、日々のこと。", path: "/blog/", bodyClass: "page-blog" }, "blog", `
  <header class="page-hero wrap">
    <p class="eyebrow">Journal</p>
    <h1 class="h2 page-title" data-stretch>Blog</h1>
    <p class="lead reveal">演奏や制作のこと、日々のこと。</p>
  </header>
  <section class="wrap blog-list" aria-label="記事一覧">
    ${posts.length ? `<ol class="post-grid">${posts.map(card).join("\n    ")}</ol>` : `<p class="muted reveal">まだ記事はありません。</p>`}
  </section>`));
writeFileSync("dist/live.html", page({ title: "ライブ・出演情報｜大村優介 Yusuke Omura", description: `ジャズピアニスト大村優介（Yusuke Omura）のライブスケジュール。${upcoming[0] ? `次回は${liveDate(upcoming[0])} ${upcoming[0].venue}「${upcoming[0].title}」。` : ""}出演情報・会場・料金・ご予約。`,
  path: "/live", bodyClass: "page-live", extraLd: upcoming.map(eventLd) }, "live", `
  <header class="page-hero wrap">
    <p class="eyebrow">Schedule</p>
    <h1 class="h2 page-title" data-stretch>Live</h1>
    <p class="lead reveal">ライブ・出演情報。ご予約やお問い合わせは各公演のリンク、または <a href="${conf.instagram}" target="_blank" rel="noopener">Instagram</a> の DM からどうぞ。</p>
  </header>
  <section class="wrap" aria-labelledby="upcoming-h">
    <h2 id="upcoming-h" class="eyebrow">Upcoming</h2>
    ${upcoming.length ? `<ol class="live-list">${upcoming.map(liveCard).join("\n    ")}</ol>` : `<p class="muted reveal">現在決まっている公演はありません。最新情報は Instagram でお知らせします。</p>`}
  </section>
  ${past.length ? `<section class="section wrap" aria-labelledby="past-h"><h2 id="past-h" class="eyebrow">Past</h2><ol class="live-list past">${past.slice(0, 20).map(liveCard).join("\n    ")}</ol></section>` : ""}`));
posts.forEach((p, i) => {
  const md = readFileSync(`content/blog/${p.slug}.md`, "utf8");
  const newer = posts[i - 1], older = posts[i + 1];
  const url = `${SITE}/blog/${p.slug}`;
  const article = { "@type": "BlogPosting", headline: p.title, datePublished: p.date, dateModified: p.modifiedTime || p.date, url, mainEntityOfPage: url,
    author: { "@id": `${SITE}/#person` }, publisher: { "@id": `${SITE}/#person` }, ...(p.image ? { image: `${SITE}${p.image}` } : {}), description: p.description };
  const crumbs = { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE}/` },
    { "@type": "ListItem", position: 2, name: "ブログ", item: `${SITE}/blog/` }, { "@type": "ListItem", position: 3, name: p.title, item: url }] };
  writeFileSync(`dist/blog/${p.slug}.html`, page({ title: `${p.title}｜大村優介 Yusuke Omura`, description: p.description || p.title, path: `/blog/${p.slug}`,
    image: p.image, ogType: "article", extraLd: [article, crumbs], bodyClass: "page-post" }, "blog", `
  <article class="post">
    <header class="post-head wrap">
      <a class="back reveal" href="/blog/">← Blog</a>
      <time class="post-date eyebrow" datetime="${p.date}">${jpDate(p.date)}</time>
      <h1 class="post-title split rise">${esc(p.title)}</h1>
    </header>
    <div class="prose wrap reveal">
${render(md)}
    </div>
    ${posts.length > 1 ? `<section class="wrap related" aria-labelledby="related-h">
      <h2 id="related-h" class="eyebrow">More from the blog</h2>
      <ol class="post-grid">${related(p).map(card).join("\n      ")}</ol>
    </section>` : ""}
    <nav class="post-nav wrap" aria-label="前後の記事">
      ${newer ? `<a class="pn newer" href="/blog/${newer.slug}"><span class="pn-l">Newer →</span><span class="pn-t">${esc(newer.title)}</span></a>` : "<span></span>"}
      ${older ? `<a class="pn older" href="/blog/${older.slug}"><span class="pn-l">← Older</span><span class="pn-t">${esc(older.title)}</span></a>` : "<span></span>"}
    </nav>
  </article>`, '\n<script src="/assets/js/post.js" defer></script>'));
});
const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
writeFileSync("dist/blog/feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${xml(conf.siteName)} Blog</title><link>${SITE}/blog/</link><description>大村優介のブログ</description><language>ja</language>
${posts.slice(0, 30).map((p) => `<item><title>${xml(p.title)}</title><link>${SITE}/blog/${p.slug}</link><guid>${SITE}/blog/${p.slug}</guid><pubDate>${new Date(p.date + "T09:00:00+09:00").toUTCString()}</pubDate><description>${xml(p.description)}</description></item>`).join("\n")}
</channel></rss>
`);
const urls = readdirSync("src/pages").filter((f) => f.endsWith(".html") && f !== "404.html")
  .map((f) => `  <url><loc>${SITE}/${f === "index.html" ? "" : f.replace(".html", "")}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`).join("\n") + `\n  <url><loc>${SITE}/live</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n  <url><loc>${SITE}/blog/</loc><lastmod>${posts[0]?.date || new Date().toISOString().slice(0, 10)}</lastmod></url>`
  + posts.map((p) => `\n  <url><loc>${SITE}/blog/${p.slug}</loc><lastmod>${(p.modifiedTime || p.date).slice(0, 10)}</lastmod></url>`).join("");
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
if (conf.indexNowKey) writeFileSync(`dist/${conf.indexNowKey}.txt`, conf.indexNowKey);
writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`built dist/ for ${SITE}（ブログ ${posts.length} 件）`);
