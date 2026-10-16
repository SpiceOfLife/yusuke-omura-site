/* Profile: timeline line draws with scroll; instrument chips drop in one by one. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tl = document.querySelector("[data-timeline]");
  if (tl) {
    const onScroll = () => {
      const r = tl.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.7 - r.top) / r.height));
      tl.style.setProperty("--p", reduce ? 1 : p);
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }
  const chips = document.querySelector(".chips");
  if (chips) [...chips.children].forEach((c, i) => c.style.setProperty("--i", i));
})();
