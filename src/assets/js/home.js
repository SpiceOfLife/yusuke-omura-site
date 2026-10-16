/* Home: kinetic hero name, rotating role word, scroll-scrubbed statement, hover image list, parallax. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- hero name: letters rise in, then breathe like a waveform; pointer adds weight ---------- */
  const letters = [];
  $$("[data-kinetic]").forEach((el, line) => {
    const text = el.textContent; el.textContent = "";
    [...text].forEach((c, i) => {
      const s = document.createElement("span");
      s.className = "k"; s.textContent = c; s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--d", `${line * 260 + i * 70}ms`);
      el.append(s); letters.push(s);
    });
  });
  requestAnimationFrame(() => document.body.classList.add("hero-in"));

  if (!reduce && letters.length) {
    let px = -9999, py = -9999;
    addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; }, { passive: true });
    const t0 = performance.now();
    const loop = (t) => {
      const time = (t - t0) / 1000;
      letters.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        const near = Math.max(0, 1 - Math.hypot(dx, dy) / 380);           // 1 when the pointer is on the letter
        const wave = Math.sin(time * 1.6 + i * 0.55);                        // slow standing wave across the name
        const wdth = 80 + wave * 22 + near * 48;
        const wght = 640 + wave * 120 + near * 260;
        s.style.fontVariationSettings = `"wdth" ${Math.min(150, Math.max(50, wdth)).toFixed(1)}, "wght" ${Math.min(900, wght).toFixed(0)}`;
      });
      requestAnimationFrame(loop);
    };
    setTimeout(() => requestAnimationFrame(loop), 1400);
  }

  /* ---------- rotating role word: per-letter flip ---------- */
  const role = $(".role-word");
  if (role) {
    const words = role.dataset.roles.split("|");
    let idx = 0;
    const render = (w, cls) => {
      role.innerHTML = "";
      [...w].forEach((c, i) => {
        const s = document.createElement("span");
        s.textContent = c; s.className = cls; s.style.setProperty("--i", i);
        role.append(s);
      });
    };
    render(words[0], "rl in");
    if (!reduce) setInterval(() => {
      $$(".rl", role).forEach((s) => s.classList.replace("in", "out"));
      setTimeout(() => {
        idx = (idx + 1) % words.length;
        render(words[idx], "rl");
        requestAnimationFrame(() => requestAnimationFrame(() => $$(".rl", role).forEach((s) => s.classList.add("in"))));
      }, 420);
    }, 2400);
  }

  /* ---------- statement: words light up as you scroll past ---------- */
  $$("[data-scrub]").forEach((el) => {
    const text = el.textContent.trim(); el.textContent = "";
    const parts = text.match(/[^、。]+[、。]?/g) || [text];
    const spans = parts.map((p) => { const s = document.createElement("span"); s.className = "scrub"; s.textContent = p; el.append(s); return s; });
    if (reduce) { spans.forEach((s) => s.classList.add("lit")); return; }
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.4)));
      const n = Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle("lit", i < n));
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  });

  /* ---------- hover list with a floating image that trails the pointer ---------- */
  const box = $(".hover-img"), img = box && $("img", box);
  if (box && matchMedia("(pointer: fine)").matches && !reduce) {
    let tx = 0, ty = 0, cx = 0, cy = 0, on = false;
    $$(".hover-list a").forEach((a) => {
      a.addEventListener("pointerenter", () => { img.src = a.dataset.img; on = true; box.classList.add("on"); });
      a.addEventListener("pointerleave", () => { on = false; box.classList.remove("on"); });
    });
    addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const loop = () => {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      const rot = Math.max(-12, Math.min(12, (tx - cx) * 0.08));
      box.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%) rotate(${rot}deg) scale(${on ? 1 : 0.6})`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- hero parallax ---------- */
  const bg = $(".hero-bg img");
  if (bg && !reduce) addEventListener("scroll", () => {
    const y = Math.min(scrollY, innerHeight);
    bg.style.transform = `translate3d(0,${y * 0.3}px,0) scale(${1.08 + y / innerHeight * 0.08})`;
  }, { passive: true });
})();
