/* Numbers: infographic animations — gantt bars, waffle tiles, ring segments, ensemble dots.
   Each figure carries data-reveal; main.js adds .in when it scrolls into view and the CSS animates. */
(() => {
  "use strict";
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* gantt: position each bar on the shared year axis, and draw the axis ticks */
  $$("[data-gantt]").forEach((g) => {
    const from = +g.dataset.from, to = +g.dataset.to, span = to - from;
    $$(".g-row", g).forEach((row, i) => {
      const a = (+row.dataset.start - from) / span, b = (+row.dataset.end - from) / span;
      const bar = row.querySelector(".g-bar");
      bar.style.left = `${a * 100}%`; bar.style.width = `${(b - a) * 100}%`;
      bar.style.setProperty("--i", i);
      bar.dataset.years = `${+row.dataset.end - +row.dataset.start} yrs`;
    });
    const axis = g.querySelector(".g-axis");
    for (let y = from; y <= to; y++) {
      if (y !== to && ((y - from) % 4 || to - y < 3)) continue;
      const t = document.createElement("span");
      t.textContent = y; t.style.left = `${(y - from) / span * 100}%`;
      axis.append(t);
    }
  });

  /* waffle + family bars: stagger index */
  $$(".waffle span").forEach((s, i) => s.style.setProperty("--i", i));
  $$(".families li").forEach((s, i) => s.style.setProperty("--i", i));

  /* ring: five arcs with small gaps, drawn one after another */
  $$("[data-ring]").forEach((fig) => {
    const svg = fig.querySelector("svg"), n = fig.querySelectorAll(".ring-legend li").length;
    const r = 120, C = 2 * Math.PI * r, gap = 10, seg = C / n - gap;
    const NS = "http://www.w3.org/2000/svg";
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", 160); c.setAttribute("cy", 160); c.setAttribute("r", r);
      c.setAttribute("class", "ring-seg");
      c.style.setProperty("--len", seg); c.style.setProperty("--C", C); c.style.setProperty("--i", i);
      c.style.strokeDasharray = `${seg} ${C}`;
      c.style.transform = `rotate(${-90 + (360 / n) * i + (gap / C) * 180}deg)`;
      svg.append(c);
    }
    $$(".ring-legend li", fig).forEach((li, i) => li.style.setProperty("--i", i));
  });

  /* ensembles: one dot per player */
  $$(".ens").forEach((e, k) => {
    const n = +e.dataset.n, box = e.querySelector(".dots");
    for (let i = 0; i < n; i++) {
      const d = document.createElement("i");
      d.style.setProperty("--i", i); d.style.setProperty("--k", k);
      box.append(d);
    }
  });

  $$(".honors li").forEach((li, i) => li.style.setProperty("--i", i));
})();
