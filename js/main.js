

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  initReveals();
  initScrollSpy();
  initBoard();

  function initReveals() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -8% 0px" });

    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  (function () {
    var list = document.getElementById("tl-list");
    if (!list) return;
    var spans = list.querySelectorAll(".tl-item[data-span-to]");
    if (!spans.length) return;
    var items = [].slice.call(list.querySelectorAll(".tl-item[data-year]"));

    function nodeY(el) { return el.offsetTop + 9; }

    function yForYear(target) {
      var lo = null, hi = null;
      for (var i = 0; i < items.length; i++) {
        var y = +items[i].getAttribute("data-year");
        if (y <= target && (!lo || y >= +lo.getAttribute("data-year"))) lo = items[i];
        if (y >= target && !hi) hi = items[i];
      }
      if (!lo) return hi ? nodeY(hi) : 0;
      if (!hi || hi === lo) return nodeY(lo);
      var ly = +lo.getAttribute("data-year"), hy = +hi.getAttribute("data-year");
      var f = hy === ly ? 0 : (target - ly) / (hy - ly);
      return nodeY(lo) + (nodeY(hi) - nodeY(lo)) * f;
    }

    function size() {
      for (var i = 0; i < spans.length; i++) {
        var el = spans[i];
        var end = yForYear(+el.getAttribute("data-span-to"));
        var h = Math.max(34, Math.round(end - nodeY(el)));
        el.style.setProperty("--span-h", h + "px");
      }
    }

    size();

    var btn = document.getElementById("tl-toggle");
    if (btn) btn.addEventListener("click", function () { setTimeout(size, 0); });
    if (window.ResizeObserver) new ResizeObserver(size).observe(list);
    else window.addEventListener("resize", size);
  })();

  (function () {
    var btn = document.getElementById("tl-toggle");
    var list = document.getElementById("tl-list");
    if (!btn || !list) return;
    btn.addEventListener("click", function () {
      var open = list.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  })();

  function initScrollSpy() {
    var sections = [].slice.call(document.querySelectorAll(".section[id]"));
    var dots = [].slice.call(document.querySelectorAll(".nav-dot"));
    if (!sections.length || !dots.length) return;

    var raf = null;

    function update() {
      raf = null;
      var line = window.scrollY + window.innerHeight * 0.35;
      var active = 0;
      sections.forEach(function (section, i) {
        if (section.offsetTop <= line) active = i;
      });

      if (window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2) {
        active = sections.length - 1;
      }
      dots.forEach(function (dot, i) {
        dot.classList.toggle("active", i === active);
        if (i === active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    function onScroll() { if (raf === null) raf = requestAnimationFrame(update); }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  function initBoard() {
    var root = document.querySelector(".onb");
    var stage = document.getElementById("onb-stage");
    var cv = document.getElementById("onb-canvas");
    if (!root || !stage || !cv) return;

    var ctx = cv.getContext("2d");
    var elLine = document.getElementById("onb-line");
    var progBox = document.getElementById("onb-prog");

    var REGIMENS = [
      { name: "MOPP", year: 1964, cells: [6, 21, 25, 3362] },
      { name: "Pediatric ALL", year: 1965, cells: [2, 7, 8, 22, 23, 25, 56, 57, 59, 62, 3327, 3358, 3363, 3364, 3488, 3493, 3494, 3508, 3509, 3511] },
      { name: "ABVD", year: 1975, cells: [14, 19, 20, 32, 33, 34, 3355, 3391, 3396, 3397] },
      { name: "CHOP", year: 1976, cells: [6, 10, 14, 21, 25, 26, 3337, 3362, 3366, 3370] },
      { name: "PVB", year: 1977, cells: [19, 49, 51, 3460] },
      { name: "BEP", year: 1987, cells: [51, 84, 88, 3658] },
      { name: "Platinum doublet", year: 1995, cells: [101] },
      { name: "R-CHOP", year: 1997, cells: [6, 10, 14, 21, 25, 26, 120, 124, 125, 127, 3337, 3362, 3366, 3370, 3887, 3891, 3895, 3902, 3906, 3907] },
      { name: "FOLFOX", year: 2002, cells: [48] },
      { name: "FOLFOXIRI", year: 2007, cells: [48, 108, 115, 3824] },
      { name: "Pembro + chemo", year: 2018, cells: [46, 436, 445, 7427] },
      { name: "D-VRd", year: 2021, cells: [238, 283, 298, 535, 550, 552, 5583, 9015, 9060, 9075] }
    ];

    var CONFIG = {

      bands: [[28, 0.8929], [3321, 0.2032], [91881, 0.00789]],

      marks: [[28, "1980"], [3321, "pairs"], [91881, "combinations"]],

      states: [
        {
          n: 28, zoom: 0.80, upto: 1980,
          frac: [25, 28, "1980 \u00b7 2-drug combinations"],
          line: "In <b>1980</b>, <b>13</b> of these combinations became part of curative regimens in at least one cancer."
        },
        {

          n: 19248516, zoom: 0.96, upto: 2100,
          frac: [2906, 19248516, "2026 \u00b7 2,3 drugs, dose, schedule"],
          line: "By <b>2026</b>, 82 classes, 2- and 3-drug combos at three doses and two schedules each."
        },
        {

          n: 19248516, zoom: 0.96, upto: 2100, fill: true,
          line: "<mark>Oncko is built to search it.</mark>"
        }
      ]
    };

    var GOLD = {}, GOLDBY = {};

    function goldFor(upto) {
      if (GOLDBY[upto]) return GOLDBY[upto];
      var m = {};
      REGIMENS.forEach(function (r) {
        if (r.year <= upto) r.cells.forEach(function (i) {
          m[i] = true;
          for (var v = 1; v < gvar(i); v++) m[outerSlot(i, v)] = true;
        });
      });
      return (GOLDBY[upto] = m);
    }

    function h(i) {
      var x = ((i + 1) * 2654435761) % 4294967296;
      x ^= x >>> 15; x = (x * 2246822507) % 4294967296;
      x ^= x >>> 13; x = (x * 3266489909) % 4294967296;
      return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
    }

    function h2(i) { return h(i * 2 + 1013904223); }

    var COMBOS = 91881, FULL = 19248516, SPAN = FULL - COMBOS;

    function gvar(c) { return 1 + Math.floor(h2(c) * 3); }

    function outerSlot(c, v) {
      return COMBOS + (c * 40001 + v * 7919) % SPAN;
    }

    var OUTER = (function () {
      var want = 1513, set = {}, list = [], k = 0, i;
      while (list.length < want && k < want * 40) {
        i = COMBOS + Math.floor(h(k * 7 + 3) * SPAN);
        k++;
        if (!set[i]) { set[i] = 1; list.push(i); }
      }
      list.sort(function (a, b) { return a - b; });
      return { set: set, list: list };
    })();

    var FILL = (function () {
      var m = {}, want = 2900, k = 0, i;
      while (k < want * 40 && Object.keys(m).length < want) {
        i = COMBOS + Math.floor(h(k * 13 + 977) * SPAN);
        k++;
        if (!OUTER.set[i]) m[i] = 1;
      }
      return m;
    })();

    function tried(i) {
      if (i >= COMBOS) return OUTER.set[i] === 1;
      var b = CONFIG.bands;
      for (var k = 0; k < b.length; k++) if (i < b[k][0]) return h(i) < b[k][1];
      return false;
    }

    function pos(i) {
      var s = Math.floor(Math.sqrt(i)), r = i - s * s;
      return r <= s ? [r, s] : [s, 2 * s - r];
    }

    REGIMENS.forEach(function (r) {
      r.cells.forEach(function (i) {
        GOLD[i] = true;
        for (var v = 1; v < gvar(i); v++) GOLD[outerSlot(i, v)] = true;
      });
    });

    var INTEREST = (function () {
      var a = [], out = [], i;
      for (i = 0; i < COMBOS; i++) if (GOLD[i] || tried(i)) a.push(i);
      for (i = 0; i < OUTER.list.length; i++) out.push(OUTER.list[i]);
      Object.keys(GOLD).forEach(function (k) { k = +k; if (k >= COMBOS) out.push(k); });
      Object.keys(FILL).forEach(function (k) { out.push(+k); });
      out.sort(function (p, q) { return p - q; });
      for (i = 0; i < out.length; i++) if (i === 0 || out[i] !== out[i - 1]) a.push(out[i]);
      return a;
    })();

    var F = 0, dpr = 1, cam = [], CSSV = {}, fillA = 0, sharp = true;

    function tokens() {
      var cs = getComputedStyle(root);
      CSSV.ground = cs.getPropertyValue("--ground").trim() || "#0A1312";
      CSSV.field = cs.getPropertyValue("--surface-2").trim() || "#16231D";
      CSSV.mint = cs.getPropertyValue("--mint").trim() || "#6FDCAE";
      CSSV.lime = cs.getPropertyValue("--lime").trim() || "#CEE444";
      CSSV.text = cs.getPropertyValue("--text").trim() || "#FFFFFF";
      CSSV.face = cs.getPropertyValue("--sans").trim() || "sans-serif";
    }

    function layout() {
      F = stage.clientWidth || 400;
      if (!F) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(F * dpr);
      cv.height = Math.round(F * dpr);
      cam = CONFIG.states.map(function (s) {
        var cols = Math.ceil(Math.sqrt(s.n));
        return { cols: cols, pitch: (F * s.zoom) / cols };
      });
    }

    function paint(n, pitch, org, nMin, grow, gA, gB, e) {
      var cols = Math.ceil(Math.sqrt(n));
      var x0 = org, y0 = org;
      var gap = Math.max(pitch * 0.22, 0.4);
      var side = Math.max(pitch - gap, 0.6);
      var radius = side > 5 ? Math.min(2, side * 0.18) : 0;

      function box(x, y, sz, fill, alpha) {
        ctx.fillStyle = fill;
        ctx.globalAlpha = alpha;
        if (radius && ctx.roundRect) {
          ctx.beginPath(); ctx.roundRect(x, y, sz, sz, radius); ctx.fill();
        } else {
          ctx.fillRect(x, y, sz, sz);
        }
      }

      function cell(i, a) {
        var p = pos(i), x = x0 + p[0] * pitch, y = y0 + p[1] * pitch;
        if (x > F || y > F || x + side < 0 || y + side < 0) return;
        var t = tried(i), was = gA[i], now = gB[i];

        if (t) {

          box(x, y, side < 1.5 ? 1.5 : side, CSSV.mint, a * (0.40 + h(i) * 0.26));
        } else {
          box(x, y, side, CSSV.field, a * 0.8);
        }

        if (fillA > 0.01 && FILL[i]) {
          var fs = side < 2.1 ? 2.1 : side;
          if (sharp > 0.02) {
            ctx.shadowColor = CSSV.lime;
            ctx.shadowBlur = sharp * Math.max(2, Math.min(fs * 0.45, 8));
          }
          box(x, y, fs, CSSV.lime, a * fillA * 0.85);
          ctx.shadowBlur = 0;
        }

        var ga = (was && now) ? 1 : now ? e : was ? 1 - e : 0;
        if (ga > 0.01) {
          var sz = side < 2.5 ? 2.8 : side;
          if (sharp > 0.02) {
            ctx.shadowColor = CSSV.mint;
            ctx.shadowBlur = sharp * Math.max(3, Math.min(sz * 0.55, 13));
          }
          box(x, y, sz, CSSV.mint, a * ga);
          ctx.shadowBlur = 0;

          if (sz > 4.5) box(x + sz * 0.3, y + sz * 0.3, sz * 0.4, CSSV.text, a * ga * 0.92);
        }
      }

      if (side < 2.4) {

        ctx.globalAlpha = 0.72 * (nMin >= n ? 1 : grow > 0.5 ? 1 : grow);
        ctx.fillStyle = CSSV.field;
        ctx.fillRect(x0, y0, cols * pitch, cols * pitch);
        ctx.globalAlpha = 1;
        for (var k = 0; k < INTEREST.length; k++) {
          var i = INTEREST[k];
          if (i >= n) break;
          cell(i, i < nMin ? 1 : grow);
        }
      } else {

        var vis = Math.ceil(F / pitch) + 2;
        var lim = Math.min(n, vis * vis);

        for (var j = 0; j < lim; j++) cell(j, j < nMin ? 1 : grow);
      }
      ctx.globalAlpha = 1;

      ctx.lineWidth = 1;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "500 9.5px " + CSSV.face;
      CONFIG.marks.forEach(function (m) {
        if (m[0] >= n) return;
        var w = Math.ceil(Math.sqrt(m[0])) * pitch;
        var a = (m[0] >= nMin ? grow : 1);
        ctx.strokeStyle = CSSV.mint;
        ctx.globalAlpha = 0.3 * a;
        ctx.strokeRect(x0 - 1.5, y0 - 1.5, w + 3, w + 3);

        if (w < 20) return;
        ctx.globalAlpha = 0.85 * a;
        ctx.fillStyle = CSSV.mint;

        ctx.shadowColor = CSSV.ground;
        ctx.shadowBlur = 5;
        ctx.fillText(m[1], x0 + w + 6, Math.max(y0 + 1, 7));
        ctx.fillText(m[1], x0 + w + 6, Math.max(y0 + 1, 7));
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;
    }

    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function render(a, b, t) {
      if (!cam.length) return;
      var A = CONFIG.states[a], B = CONFIG.states[b], e = ease(t);
      fillA = (A.fill ? 1 - e : 0) + (B.fill ? e : 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, F, F);
      var pitch = Math.exp(Math.log(cam[a].pitch) * (1 - e) + Math.log(cam[b].pitch) * e);

      var orgA = (F - cam[a].cols * cam[a].pitch) / 2;
      var orgB = (F - cam[b].cols * cam[b].pitch) / 2;
      var org = orgA * (1 - e) + orgB * e;
      paint(Math.max(A.n, B.n), pitch, org, Math.min(A.n, B.n),
            B.n >= A.n ? e : 1 - e, goldFor(A.upto), goldFor(B.upto), e);
    }

    var N = CONFIG.states.length;
    var track = document.querySelector(".board-track");
    var pin   = document.querySelector(".board-pin");
    var hint = document.getElementById("onb-hint");
    var elFrac = document.getElementById("onb-frac");
    var elNum = document.getElementById("onb-num");
    var elDen = document.getElementById("onb-den");
    var elBasis = document.getElementById("onb-basis");
    var lastBasis = "", lastNumS = "", lastDenS = "";
    var target = 0;
    var cur = 0;
    var state = -1;
    var raf = null, lastKey = "";

    var MAXSTEP = 1 / 28;


    var COARSE = window.matchMedia
      ? window.matchMedia("(hover: none) and (pointer: coarse)").matches
      : "ontouchstart" in window;
    var SCRUB = !reduceMotion;

    var near = false;
    var scrubRaf = null;

    CONFIG.states.forEach(function (_, i) {
      var b = document.createElement("button");
      b.className = "onb-tick";
      b.type = "button";
      b.innerHTML = "<i></i>";
      b.setAttribute("aria-label", "Step " + (i + 1) + " of " + N);
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        if (SCRUB) scrollToBeat(i); else goTo(i);
      });
      progBox.appendChild(b);
    });

    if (hint) hint.textContent = reduceMotion ? "Tap to advance" : "Scroll to play";

    function hideHint() {}


    function plateau(u) {
      if (u <= 0.12) return 0;
      if (u >= 0.88) return 1;
      var x = (u - 0.12) / 0.76;
      return x * x * (3 - 2 * x);
    }

    function comma(n) {
      return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function geo(x0, x1, e) {
      return Math.exp(Math.log(x0) * (1 - e) + Math.log(x1) * e);
    }

    function quant(v, e) {
      if (e <= 0.002 || e >= 0.998) return Math.round(v);
      var m = Math.pow(10, Math.max(0, Math.floor(Math.log(v) / Math.LN10) - 2));
      return Math.round(v / m) * m;
    }

    function put(el, s, which) {
      if (which === 0) { if (s === lastNumS) return; lastNumS = s; }
      else { if (s === lastDenS) return; lastDenS = s; }
      el.textContent = s;
    }

    function fraction(a, e, fade) {
      if (!elFrac) return;
      var fa = CONFIG.states[a].frac, fb = CONFIG.states[a + 1].frac;
      if (fa && fb) {
        put(elNum, comma(quant(geo(fa[0], fb[0], e), e)), 0);
        put(elDen, comma(quant(geo(fa[1], fb[1], e), e)), 1);
        elFrac.style.opacity = 1;
        var lab = e < 0.5 ? fa[2] : fb[2];
        if (lab !== lastBasis) { lastBasis = lab; elBasis.textContent = lab; }
        elBasis.style.opacity = fade;
      } else if (fa) {

        put(elNum, comma(fa[0]), 0);
        put(elDen, comma(fa[1]), 1);

        if (fa[2] && fa[2] !== lastBasis) { lastBasis = fa[2]; elBasis.textContent = fa[2]; }
        elFrac.style.opacity = reduceMotion ? (e < 0.5 ? 1 : 0) : 1 - e;
      } else {
        elFrac.style.opacity = 0;
      }
    }

    function draw() {
      var a = Math.floor(cur);
      if (a > N - 2) a = N - 2;
      if (a < 0) a = 0;
      var u = cur - a;
      var e = reduceMotion ? (u < 0.5 ? 0 : 1) : plateau(u);

      var nearest = e < 0.5 ? a : a + 1;
      if (nearest !== state) {
        state = nearest;
        root.dataset.state = state;
        elLine.innerHTML = CONFIG.states[state].line;
        stage.setAttribute("aria-label", elLine.textContent + " Tap to advance.");
      }
      var fade = reduceMotion ? 1 : Math.min(1, Math.abs(e - 0.5) / 0.26);
      elLine.style.opacity = fade;

      root.classList.toggle("at-end", cur > N - 1.02);
      fraction(a, e, fade);

      sharp = 1 - Math.min(1, Math.abs(e - 0.5) / 0.42);

      var key = a + ":" + e.toFixed(3) + ":" + sharp.toFixed(2);
      if (key !== lastKey) { lastKey = key; render(a, a + 1, e); }

      Array.prototype.forEach.call(progBox.children, function (b, n) {
        var fill = n <= a ? 1 : n === a + 1 ? e : 0;
        b.firstChild.style.transform = "scaleX(" + fill + ")";
        b.classList.toggle("done", fill > 0.99);
        b.setAttribute("aria-current", n === state ? "step" : "false");
      });
    }

    function loop() {
      var d = target - cur;
      if (Math.abs(d) < 0.0008) { cur = target; raf = null; draw(); return; }
      var step = d * 0.085;
      if (Math.abs(d) > 1.05) {
        if (step > MAXSTEP) step = MAXSTEP;
        if (step < -MAXSTEP) step = -MAXSTEP;
      }
      cur += step;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function goTo(i) {
      i = i < 0 ? 0 : i > N - 1 ? N - 1 : i;
      if (i === target) return;
      target = i;
      hideHint();
      if (reduceMotion) { cur = target; draw(); return; }
      if (raf === null) raf = requestAnimationFrame(loop);
    }


    var HOLD  = COARSE ? [190, 130, 210] : [300, 200, 320];
    var TRANS = COARSE ? [260, 260]        : [450, 450];

    var SPAN  = 0;
    (function () {
      for (var i = 0; i < HOLD.length; i++) SPAN += HOLD[i];
      for (var j = 0; j < TRANS.length; j++) SPAN += TRANS[j];
    })();

    function runway() {
      if (SCRUB && track) track.style.height = "calc(100svh + " + SPAN + "px)";
    }

    function travelled() {
      if (!track) return 0;
      var t = -track.getBoundingClientRect().top;
      return t < 0 ? 0 : t > SPAN ? SPAN : t;
    }

    function beatAt(x) {
      for (var i = 0; i < N; i++) {
        if (x <= HOLD[i]) return i;
        x -= HOLD[i];
        if (i >= TRANS.length) return N - 1;
        if (x <= TRANS[i]) return i + x / TRANS[i];
        x -= TRANS[i];
      }
      return N - 1;
    }

    function scrub() {
      scrubRaf = null;
      var v = beatAt(travelled());
      if (Math.abs(v - cur) < 0.0005) return;
      cur = v;
      target = Math.round(v);
      draw();
    }

    function onScroll() {
      if (near && scrubRaf === null) scrubRaf = requestAnimationFrame(scrub);
    }

    function offsetOfBeat(i) {
      var x = 0;
      for (var k = 0; k < i; k++) x += HOLD[k] + (TRANS[k] || 0);
      return x + HOLD[i] * 0.5;
    }

    function scrollToBeat(i) {
      if (!track) return;
      var top = track.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: Math.round(top + offsetOfBeat(i)), behavior: "smooth" });
    }

    function step(dir) {
      var want = target + dir;
      if (want < 0 || want > N - 1) return;
      target = want;
      hideHint();
      if (reduceMotion) { cur = target; draw(); return; }
      if (raf === null) raf = requestAnimationFrame(loop);
    }

    if (SCRUB) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
    }

    if (track && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          near = en.isIntersecting;
          if (near) onScroll();
        });
      }, { rootMargin: "40% 0px 40% 0px" }).observe(track);
    } else {
      near = true;
    }


    stage.addEventListener("click", function () {
      var i = Math.round(cur) + 1;
      if (i > N - 1) return;
      if (SCRUB) scrollToBeat(i); else goTo(i);
    });

    root.tabIndex = 0;
    root.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
            : e.key === "ArrowLeft"  || e.key === "ArrowUp"   ? -1 : 0;
      if (!d) return;
      var i = Math.round(cur) + d;

      if (i < 0 || i > N - 1) return;
      e.preventDefault();
      if (SCRUB) scrollToBeat(i); else goTo(i);
    });

    function reserve() {
      var save = elLine.innerHTML, tall = 0;
      elLine.style.minHeight = "0px";
      CONFIG.states.forEach(function (st) {
        elLine.innerHTML = st.line;
        tall = Math.max(tall, elLine.offsetHeight);
      });
      elLine.innerHTML = save;
      elLine.style.minHeight = tall + "px";
    }


    function boot() {
      tokens(); layout(); reserve(); lastKey = "";
      runway();
      if (SCRUB) { cur = beatAt(travelled()); target = Math.round(cur); }
      else cur = target;
      draw();
    }

    if (window.ResizeObserver) new ResizeObserver(boot).observe(stage);
    else window.addEventListener("resize", boot);

    boot();
  }
});
