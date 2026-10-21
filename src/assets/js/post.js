/* Blog post: paragraphs and images fade in as you read; tap an image to view it large. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prose = document.querySelector(".prose");
  if (!prose) return;
  const blocks = [...prose.children];
  if (!reduce && "IntersectionObserver" in window) {
    prose.classList.add("in"); // the container itself is revealed; animate its children instead
    blocks.forEach((b) => b.classList.add("pb"));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    blocks.forEach((b) => io.observe(b));
  }
  // lightbox
  const box = document.createElement("div");
  box.className = "lightbox"; box.hidden = true; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "画像を拡大表示");
  box.innerHTML = '<img alt=""><button type="button" class="lb-close" aria-label="閉じる">×</button>';
  document.body.append(box);
  const big = box.querySelector("img"), close = box.querySelector(".lb-close");
  let opener = null;
  const hide = () => { box.classList.remove("open"); setTimeout(() => (box.hidden = true), reduce ? 0 : 250); opener?.focus(); };
  prose.querySelectorAll("img").forEach((img) => {
    img.tabIndex = 0; img.setAttribute("role", "button"); img.setAttribute("aria-label", (img.alt || "画像") + "を拡大");
    const open = () => { opener = img; big.src = img.currentSrc || img.src; big.alt = img.alt; box.hidden = false; requestAnimationFrame(() => box.classList.add("open")); close.focus(); };
    img.addEventListener("click", open);
    img.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  box.addEventListener("click", (e) => { if (e.target !== big) hide(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !box.hidden) hide(); });
})();
