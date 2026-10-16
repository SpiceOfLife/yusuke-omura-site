/* Shared interactions: kinetic type splitting, scroll reveals, page transitions,
   cursor, magnetic buttons, scroll-velocity marquee, mobile menu. No dependencies. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- split text into characters (keeps words together) ---------- */
  function split(el) {
    if (el.dataset.splitDone) return;
    const text = el.textContent;
    el.setAttribute("aria-label", text.trim());
    el.textContent = "";
    let i = 0;
    text.split(/(\s+)/).forEach((word) => {
      if (/^\s+$/.test(word)) { el.append(document.createTextNode(" ")); return; }
      const w = document.createElement("span");
      w.className = "w"; w.setAttribute("aria-hidden", "true");
      for (const c of word) {
        const s = document.createElement("span");
        s.className = "ch"; s.textContent = c; s.style.setProperty("--i", i++);
        w.append(s);
      }
      el.append(w);
    });
    el.dataset.splitDone = "1";
  }
  $$(".split").forEach(split);

  /* ---------- reveal on scroll ---------- */
  let proxy;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = proxy.get(e.target) || e.target;
      el.classList.add("in");
      el.dispatchEvent(new CustomEvent("reveal"));
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  // clip-path: inset(100%) で隠した画像は交差判定に乗らないことがあるため、親要素を見張って代わりに開く
  proxy = new Map();
  $$(".img-reveal").forEach((el) => { proxy.set(el.parentElement, el); io.observe(el.parentElement); });
  $$(".reveal, .rise, .eyebrow, [data-reveal]").forEach((el) => io.observe(el));

  /* ---------- scroll progress + scroll velocity ---------- */
  const bar = $(".progress");
  let lastY = scrollY, velocity = 0;
  addEventListener("scroll", () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    velocity = scrollY - lastY; lastY = scrollY;
  }, { passive: true });

  /* ---------- marquee driven by time + scroll velocity ---------- */
  $$(".marquee-track").forEach((track) => {
    track.innerHTML += track.innerHTML; // duplicate for seamless loop
    let x = 0, dir = track.dataset.dir === "right" ? 1 : -1;
    const step = () => {
      const half = track.scrollWidth / 2;
      x += dir * (0.6 + Math.min(18, Math.abs(velocity)) * 0.5);
      velocity *= 0.92;
      if (x <= -half) x += half; if (x >= 0 && dir > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0)`;
      requestAnimationFrame(step);
    };
    if (!reduce) requestAnimationFrame(step);
  });

  /* ---------- scroll-linked width on headings (kinetic) ---------- */
  const stretchy = $$("[data-stretch]");
  if (stretchy.length && !reduce) {
    const tick = () => {
      stretchy.forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, 1 - (r.top + r.height / 2) / innerHeight)); // 0 bottom → 1 top
        const wdth = 50 + p * 100, wght = 900 - p * 600;
        el.style.fontVariationSettings = `"wdth" ${wdth.toFixed(1)}, "wght" ${wght.toFixed(0)}`;
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- custom cursor ---------- */
  const cur = $(".cursor");
  if (cur && matchMedia("(pointer: fine)").matches && !reduce) {
    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;
    addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const loop = () => { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener("pointerover", (e) => cur.classList.toggle("big", !!e.target.closest("a, button, [data-cursor]")));
  } else if (cur) cur.remove();

  /* ---------- magnetic buttons ---------- */
  if (!reduce) $$(".btn, [data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--x", `${(e.clientX - r.left - r.width / 2) * 0.25}px`);
      el.style.setProperty("--y", `${(e.clientY - r.top - r.height / 2) * 0.35}px`);
    });
    el.addEventListener("pointerleave", () => { el.style.setProperty("--x", "0px"); el.style.setProperty("--y", "0px"); });
  });

  /* ---------- tilt cards ---------- */
  if (!reduce) $$("[data-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
      el.style.setProperty("--gx", `${(px + 0.5) * 100}%`); el.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });

  /* ---------- mobile menu ---------- */
  const menu = $(".menu"), openBtn = $(".menu-btn"), closeBtn = $(".menu-close");
  const setMenu = (open) => {
    if (!menu) return;
    menu.classList.toggle("open", open); menu.setAttribute("aria-hidden", String(!open));
    openBtn && openBtn.setAttribute("aria-expanded", String(open));
    if (open) setTimeout(() => menu.querySelector("a")?.focus(), 300); else openBtn?.focus();
  };
  openBtn?.addEventListener("click", () => setMenu(true));
  closeBtn?.addEventListener("click", () => setMenu(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menu?.classList.contains("open")) setMenu(false); });

  /* ---------- page transitions (curtain wipe) ---------- */
  const curtain = $(".curtain");
  let entered = false;
  try { entered = sessionStorage.getItem("yo-nav") === "1"; sessionStorage.removeItem("yo-nav"); } catch (e) {}
  if (curtain && entered && !reduce) { curtain.classList.add("reveal"); setTimeout(() => curtain.classList.remove("reveal"), 900); }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || !curtain || reduce || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || a.hasAttribute("download")) return;
    e.preventDefault();
    try { sessionStorage.setItem("yo-nav", "1"); } catch (err) {}
    curtain.classList.remove("reveal"); curtain.classList.add("cover");
    setTimeout(() => { location.href = url.href; }, 620);
  });
  addEventListener("pageshow", (e) => { if (e.persisted && curtain) curtain.classList.remove("cover"); });

  /* ---------- count-up numbers (used across pages) ---------- */
  window.countUp = (el, to, dur = 1600) => {
    const from = 0, dec = (String(to).split(".")[1] || "").length, t0 = performance.now();
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    const f = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (from + (to - from) * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  };
  $$("[data-count]").forEach((el) => {
    el.textContent = "0";
    const target = el.closest("[data-reveal]") || el;
    if (target === el) { el.setAttribute("data-reveal", ""); io.observe(el); }
    target.addEventListener("reveal", () => window.countUp(el, parseFloat(el.dataset.count)), { once: true });
  });

  /* header gets a solid backdrop once content scrolls under it */
  const onHead = () => document.body.classList.toggle("scrolled", scrollY > 60);
  addEventListener("scroll", onHead, { passive: true }); onHead();

  document.documentElement.classList.add("js");
})();
