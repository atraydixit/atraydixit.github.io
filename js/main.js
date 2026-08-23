/* ==========================================================================
   Oncko — oncko.com
   Three things: scroll reveals, nav scrollspy, and the search board.
   Every init is guarded, so removing a section never breaks the others.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  initReveals();
  initScrollSpy();
  initBoard();

  /* ------------------------------------------------------------- reveals -- */

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

  /* ----------------------------------------------------------- scrollspy -- */

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

  /* ------------------------------------------------------------------ board --

     ONE INDEX SPACE, AND WHY THE ZOOM IS HONEST
     Cells enumerate every (combination, dose/schedule variant) pair, where the
     combination is 2 OR 3 approved mechanism classes ordered by size and then
     colex over classes sorted by first-approval year, and the variant index is
     the OUTER loop. That ordering makes the board strictly nested:
         cells 0..27        the 28 pairs of the 1980 panel
         cells 0..3320      the 3,321 pairs available in 2026
         cells 0..91880     those pairs plus all 88,560 triples, variant 0 only
         cells 0..19248515  the same space at 3 dose levels and 2 schedules per
                            drug, so 6^k variants: 36 per pair, 216 per triple
     Each region is the literal top-left corner of the next, so the whole piece
     is one continuous camera dolly and never asserts a containment that does
     not hold. Pairs are NOT a subset of triples; zooming out is legitimate only
     because the space below is the union of both, with size as the leading sort
     key. Variant index MUST stay the outer loop for the same reason:
     variant*91881 + combo keeps the third region an exact prefix, while
     combo*6^k + variant would not.

     The fourth region is ragged and still a strict prefix: shells 1..35 hold all
     91,881 combinations and shells 36..215 hold only the 88,560 triples, so
     36*91881 + 180*88560 = 19,248,516 exactly.

     BANDS ARE CONDITIONAL, NOT CUMULATIVE, AND EVERY RATE MATCHES ITS OWN
     DENOMINATOR:
         1980   25/28 pairs        = 89.3%   (literature-sourced panel)
         2026   694/3,321 pairs    = 20.9%
         2026   699/88,560 triples = 0.79%
     bands[k] is the tried-fraction for cells in [bands[k-1], bands[k]) only, so
     band 2 is 0.2032 = (694-25)/(3321-28), the conditional rate for the 3,293
     pairs outside the 1980 panel. Blending reproduces 20.90% exactly. If you
     change any rate, change its denominator in the same edit.

     COVERAGE IN THE OUTER REGION IS NOT ZERO AND MUST NOT BE. Anything that
     reached the clinic went through dose escalation, so lighting only variant 0
     would assert that every combination ever tested was tested at exactly one
     dose and schedule, which is false. A combination that reached the clinic
     averages 2.086 registered arms, so the 1,393 tried combinations carry 1.086
     extra variants each: 1,513 outer cells. That total does not change when the
     space grows, because the coverage is measured and only the space is a
     stated convention.

     Those outer cells are GENERATED, not scanned for: at 19.2M cells a
     predicate scan costs ~900ms. OUTER draws its indices from the hash and
     tried() is a set membership test above COMBOS. Per-cell identity is
     illustrative here exactly as in the inner bands; the totals are the claim.
     ---------------------------------------------------------------------- */

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
      move: 780,
      bands: [[28, 0.8929], [3321, 0.2032], [91881, 0.00789]],
      marks: [[28, "1980"], [3321, "pairs"], [91881, "combinations"]],
      states: [
        {
          n: 28, zoom: 0.80, upto: 1980,
          line: "In <b>1980</b>, 8 chemotherapy classes made <b>28</b> possible pairs. <em>89% had been tried</em>, and 13 are curative."
        },
        {
          n: 3321, zoom: 0.90, upto: 2100,
          line: "By <b>2026</b>, 82 drug classes make <b>3,321</b> possible 2-drug combos. <em>21% have been tried.</em>"
        },
        {
          n: 91881, zoom: 0.94, upto: 2100,
          line: "Add 3-drug combos and the space is <b>91,881</b>. <em>Under 1% of those have ever been tested.</em>"
        },
        {
          /* 3,321 pairs x 36 + 88,560 triples x 216. Variant-major, so beat 3
             is the literal top-left corner. 1,393 + 1,513 = 2,906 lit cells,
             i.e. 1 in 6,624. Beat 4 no longer states a coverage figure. */
          n: 19248516, zoom: 0.96, upto: 2100,
          line: "With dose and schedule, the space is <b>19 million</b>. <em>This number doubles every six years.</em>"
        },
        {
          /* Same n and zoom as beat 4, so the camera holds still and the only
             change is the Oncko layer fading in. */
          n: 19248516, zoom: 0.96, upto: 2100, fill: true,
          line: "<mark>Oncko is built to search it.</mark>"
        }
      ]
    };

    var GOLD = {}, GOLDBY = {};

    /* THE SECOND LAYER IS "IN STANDARD OF CARE", NOT "CURATIVE". The regimens
       live on beat 1 are all genuinely curative, so beat 1 may say "curative".
       Later beats add platinum doublet, FOLFOXIRI, pembro+chemo and D-VRd,
       which are life-extending: do not carry "curative" onto them.

       The layer is filtered by beat year, so a 1980 board does not show cells
       that only a later regimen contributes. Cells 46 and 48 are why this
       matters: both are pairs of mechanisms that existed in 1980 but were not
       combined until 2002 and 2018. */
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

    /* decorrelated from h(): the variant count must not be predicted by the
       tried draw, or dose depth would correlate with which cells are lit. */
    function h2(i) { return h(i * 2 + 1013904223); }

    var COMBOS = 91881, FULL = 19248516, SPAN = FULL - COMBOS;

    /* how many dose/schedule variants of a standard-of-care combination are
       themselves validated standard of care */
    function gvar(c) { return 1 + Math.floor(h2(c) * 3); }

    /* Somewhere in the dose/schedule region, scattered rather than stacked at a
       constant stride, which streaks. Used for the standard-of-care layer,
       which is built forward from combinations and so cannot be generated. */
    function outerSlot(c, v) {
      return COMBOS + (c * 40001 + v * 7919) % SPAN;
    }

    /* 1,513 = 1,393 tried combinations x 1.086 extra registered arms each,
       measured. Generated, not scanned: see the note above. */
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

    /* THE ONCKO LAYER, in lime. Cells in the dose/schedule region drawn at a
       size floor so they read at 0.11px per cell, and scattered rather than
       clustered: a disc large enough to read as a blob at this zoom would be
       ~24,000 cells, which is a quantitative claim nothing supports.

       AREA HERE IS ILLUSTRATIVE. `want` is anchored to the count of real
       historical coverage on this board (1,393 in the combination corner plus
       1,513 in the dose/schedule region = 2,906), so the layer has a stateable
       referent. Do not raise it: the board then reads as completed coverage. */
    var FILL = (function () {
      var m = {}, want = 2900, k = 0, i;
      while (k < want * 40 && Object.keys(m).length < want) {
        i = COMBOS + Math.floor(h(k * 13 + 977) * SPAN);
        k++;
        if (!OUTER.set[i]) m[i] = 1;      /* never overwrite a real tested cell */
      }
      return m;
    })();

    function tried(i) {
      if (i >= COMBOS) return OUTER.set[i] === 1;
      var b = CONFIG.bands;
      for (var k = 0; k < b.length; k++) if (i < b[k][0]) return h(i) < b[k][1];
      return false;
    }

    /* L-shell layout: the first m cells always fill the ceil(sqrt(m)) corner
       square. This is what makes each region nest inside the next. */
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

    /* Must be ascending: the fast path relies on `if (i >= n) break`. The
       combination region is scanned (91,881 checks, a few ms); the dose/schedule
       region is assembled from the two generated sources and merged. */
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

    var F = 0, dpr = 1, cam = [], CSSV = {}, fillA = 0;

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
          /* hash-varied so a 89%-full board reads as texture, not a solid slab.
             Floored at 1.5px: side is 0.6px on the dose/schedule beat, and
             without the floor the tried cells vanish and it reads as broken. */
          box(x, y, side < 1.5 ? 1.5 : side, CSSV.mint, a * (0.40 + h(i) * 0.26));
        } else {
          box(x, y, side, CSSV.field, a * 0.8);
        }

        /* Oncko layer: lime, under the standard-of-care highlight so the two
           never fight for the same pixel */
        if (fillA > 0.01 && FILL[i]) {
          var fs = side < 2.1 ? 2.1 : side;
          ctx.shadowColor = CSSV.lime;
          ctx.shadowBlur = Math.max(2, Math.min(fs * 0.45, 8));
          box(x, y, fs, CSSV.lime, a * fillA * 0.85);
          ctx.shadowBlur = 0;
        }

        /* curative layer, cross-faded when a beat adds or drops a regimen */
        var ga = (was && now) ? 1 : now ? e : was ? 1 - e : 0;
        if (ga > 0.01) {
          var sz = side < 2.5 ? 2.8 : side;   /* stays findable when sub-pixel */
          ctx.shadowColor = CSSV.mint;
          ctx.shadowBlur = Math.max(3, Math.min(sz * 0.55, 13));
          box(x, y, sz, CSSV.mint, a * ga);
          ctx.shadowBlur = 0;
          /* white core: brightness, not a second hue, marks the top tier */
          if (sz > 4.5) box(x + sz * 0.3, y + sz * 0.3, sz * 0.4, CSSV.text, a * ga * 0.92);
        }
      }

      if (side < 2.4) {
        /* too small to be worth 90k draw calls: lay the dark field down as one
           rect and paint only the cells that carry signal */
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
        for (var j = 0; j < n; j++) cell(j, j < nMin ? 1 : grow);
      }
      ctx.globalAlpha = 1;

      /* nested regions, outlined once they are no longer the whole picture */
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
        /* a label wider than the box it names is noise, and on the dose beat the
           78- and 3,321-cell labels collide with each other. Outline always,
           name only once the region is big enough to read as a region. The gate
           is 20, not 44: at beat 4 the whole combination board is a 26px corner
           and that is exactly the label that has to survive. */
        if (w < 20) return;
        ctx.globalAlpha = 0.85 * a;
        ctx.fillStyle = CSSV.mint;
        /* the outer field carries scatter now, so the label needs to sit on
           something. Two passes with a ground-coloured shadow = a cheap halo. */
        ctx.shadowColor = CSSV.ground;
        ctx.shadowBlur = 5;
        ctx.fillText(m[1], x0 + w + 6, Math.max(y0 + 1, 7));
        ctx.fillText(m[1], x0 + w + 6, Math.max(y0 + 1, 7));
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;
    }

    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    /* every beat is a prefix of the same board, so every move is one dolly */
    function render(a, b, t) {
      if (!cam.length) return;
      var A = CONFIG.states[a], B = CONFIG.states[b], e = ease(t);
      fillA = (A.fill ? 1 - e : 0) + (B.fill ? e : 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, F, F);
      var pitch = Math.exp(Math.log(cam[a].pitch) * (1 - e) + Math.log(cam[b].pitch) * e);
      /* each state's grid is centred at rest; lerp between those two origins so
         both ends of the dolly land correctly and nothing flies off-canvas */
      var orgA = (F - cam[a].cols * cam[a].pitch) / 2;
      var orgB = (F - cam[b].cols * cam[b].pitch) / 2;
      var org = orgA * (1 - e) + orgB * e;
      paint(Math.max(A.n, B.n), pitch, org, Math.min(A.n, B.n),
            B.n >= A.n ? e : 1 - e, goldFor(A.upto), goldFor(B.upto), e);
    }
    /* --------------------------------------------- scroll-locked beats --

       The board is pinned: .board-track is 400svh and .board-pin is a sticky
       100svh box inside it, so the card holds still while the page scrolls
       past. That gives the beats real runway and means the reader moves through
       the whole sequence.

       THERE IS NO TIMER. Position is the only thing that sets the beat, and the
       control condition to test after any change is PARK AND DO NOTHING: the
       beat must not move.
       ---------------------------------------------------------------- */

    if (reduceMotion) CONFIG.move = 0;

    var state = 0;
    var anim = null, sraf = null;
    var track = document.querySelector(".board-track");

    CONFIG.states.forEach(function (_, i) {
      var b = document.createElement("button");
      b.className = "onb-tick";
      b.type = "button";
      b.innerHTML = "<i></i>";
      b.setAttribute("aria-label", "Step " + (i + 1) + " of " + CONFIG.states.length);
      b.addEventListener("click", function (e) { e.stopPropagation(); go(i); });
      progBox.appendChild(b);
    });

    /* pure position indicators now: nothing animates them, so no transitions */
    function ticks(i) {
      Array.prototype.forEach.call(progBox.children, function (b, n) {
        b.classList.toggle("done", n <= i);
        b.setAttribute("aria-current", n === i ? "step" : "false");
      });
    }

    function copy(i) {
      elLine.innerHTML = CONFIG.states[i].line;
      stage.setAttribute("aria-label", elLine.textContent + " Tap to advance.");
    }

    function go(next) {
      next = (next + CONFIG.states.length) % CONFIG.states.length;
      var from = state;
      state = next;
      root.dataset.state = state;
      ticks(state);
      if (from === state) { copy(state); render(state, state, 1); return; }
      var fades = root.querySelectorAll(".onb-fade");
      Array.prototype.forEach.call(fades, function (n) { n.style.opacity = 0; });
      if (anim) cancelAnimationFrame(anim);
      var t0 = performance.now(), D = CONFIG.move, swapped = false;
      (function step(now) {
        /* D is 0 under reduced motion. (now - t0) / 0 is NaN on the first frame,
           and NaN < 1 is false, so guard it and cut straight to the end state. */
        var t = D > 0 ? Math.min((now - t0) / D, 1) : 1;
        if (!swapped && t >= 0.42) {
          swapped = true;
          copy(state);
          Array.prototype.forEach.call(fades, function (n) { n.style.opacity = 1; });
        }
        render(from, state, t);
        if (t < 1) anim = requestAnimationFrame(step);
      })(t0);
    }

    /* Beat straight from how far through the track we are. Runway is known
       exactly, unlike the old centre-of-viewport estimate. */
    function scrollBeat() {
      sraf = null;
      if (!track) return;
      var runway = track.offsetHeight - window.innerHeight;
      if (runway <= 0) return;
      var p = -track.getBoundingClientRect().top / runway;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      var N = CONFIG.states.length, f = p * N;
      var want = f >= N ? N - 1 : Math.floor(f);
      /* small dead zone: absorbs scroll jitter and the iOS address bar
         resizing innerHeight mid-scroll, without making the scrub feel laggy */
      if (want === state || Math.abs(f - (state + 0.5)) <= 0.55) return;
      go(want);
    }

    window.addEventListener("scroll", function () {
      if (sraf === null) sraf = requestAnimationFrame(scrollBeat);
    }, { passive: true });

    stage.addEventListener("click", function () { go(state + 1); });

    root.tabIndex = -1;   /* arrow keys stay inside the component */
    root.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      go(state + (e.key === "ArrowRight" ? 1 : -1));
    });

    /* reserve the tallest copy block so nothing reflows on a beat change */
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

    function boot() { tokens(); layout(); reserve(); render(state, state, 1); }

    if (window.ResizeObserver) new ResizeObserver(boot).observe(stage);
    else window.addEventListener("resize", boot);

    root.dataset.state = state;
    boot();
    copy(state);
    ticks(state);
    scrollBeat();
  }
});
