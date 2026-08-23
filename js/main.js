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
          if (sharp > 0.02) {
            ctx.shadowColor = CSSV.lime;
            ctx.shadowBlur = sharp * Math.max(2, Math.min(fs * 0.45, 8));
          }
          box(x, y, fs, CSSV.lime, a * fillA * 0.85);
          ctx.shadowBlur = 0;
        }

        /* curative layer, cross-faded when a beat adds or drops a regimen */
        var ga = (was && now) ? 1 : now ? e : was ? 1 - e : 0;
        if (ga > 0.01) {
          var sz = side < 2.5 ? 2.8 : side;   /* stays findable when sub-pixel */
          if (sharp > 0.02) {
            ctx.shadowColor = CSSV.mint;
            ctx.shadowBlur = sharp * Math.max(3, Math.min(sz * 0.55, 13));
          }
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
    /* ------------------------------------------------- the scroll gate --

       THE SECTION TAKES THE GESTURE. IT DOES NOT FOLLOW THE SCROLL.

       Four earlier mechanics all derived the beat from scroll position, and all
       four failed the same three requirements: the reader could leave before the
       last beat played, could get back to the hero before the first beat played
       going up, and one flick could advance more than one beat.

       Scroll position cannot satisfy those, because scroll position IS the exit.
       Any gesture large enough to carry the scroll past the track leaves the
       section with beats unplayed, and a real trackpad fling is 2,000-5,000px of
       accumulated delta - far more than any single synthetic wheel event, which
       is why a harness that fires one big event certifies a fix the hardware
       does not have.

       So: while the board fills the viewport and the sequence is unfinished in
       the direction of travel, wheel and touch are cancelled and converted into
       discrete beats, and a rAF loop holds the page at the board's own offset.
       Native scroll resumes the instant the sequence finishes that way.

       Two things this must keep, because a gate without them is a broken page:
       - a way out that does not require finishing: Esc, Tab, the nav, and
         reduced motion, plus a hard failsafe if the gate ever stays shut
       - a visible reason the page stopped scrolling: the hint under the ticks
       -------------------------------------------------------------------- */

    var N = CONFIG.states.length;
    var track = document.querySelector(".board-track");
    var docEl = document.documentElement;
    var hint = document.getElementById("onb-hint");
    var target = 0;          /* the beat being asked for */
    var cur = 0;             /* where the camera actually is, 0..N-1 */
    var state = -1;          /* nearest whole beat, for copy and aria */
    var raf = null, lastKey = "";

    /* a segment may not be crossed in fewer than 28 frames (~470ms at 60fps).
       Gestures only ever move the target one beat, but a tick click can move
       four, and this is what stops that from teleporting. */
    var MAXSTEP = 1 / 28;

    /* A momentum tail and a deliberate new push are not told apart by a
       stopwatch - that was the bug behind both "it jumps to 2 on entry" and
       "sometimes it doesn't move when I scroll". A timed swallow window is
       either too short (the tail outlives it and steals a second beat) or too
       long (a real second gesture lands inside it and is eaten). Read the SHAPE
       instead: a tail only ever decays, and a new push rises. */
    var STEP_HOLD   = 300;  /* hard dead time after a step; the camera needs a moment */
    var DOCK        = 650;  /* the gesture that ARRIVES at the board docks it, and must
                               not also advance it - that arrival was the "jump".
                               Long enough to outlast a main-thread stall that would
                               otherwise split the arriving stream into two gestures. */
    var GESTURE_END = 400;  /* silence this long ends a gesture outright */
    var RISE        = 1.35; /* an event this much bigger than the last = a finger again */
    var DRAG_WAIT   = 1400; /* a stream still going this long after its beat... */
    var DRAG_FRAC   = 0.30; /* ...and still this strong, is a drag and not a tail */
    var THRESH_W    = 44;   /* px of wheel delta that buys one beat (a mouse notch is ~120) */
    var THRESH_T    = 30;   /* px of finger travel that buys one beat */
    var FAILSAFE    = 25000;

    var near = false;     /* board is somewhere on screen (cheap short-circuit) */
    var engaged = false;  /* the gate is holding the page */
    var bypass = false;   /* Esc or Tab: no gate for this visit */
    var acc = 0, holdFloor = 0, gateStart = 0, hraf = null, touchY = 0;
    /* one stream spends one beat; `spent` is what enforces it */
    var spent = false, spentT = 0, spentPeak = 0, peak = 0, lastMag = 0, lastT = 0;

    function perf() {
      return window.performance && performance.now ? performance.now() : +new Date();
    }

    CONFIG.states.forEach(function (_, i) {
      var b = document.createElement("button");
      b.className = "onb-tick";
      b.type = "button";
      b.innerHTML = "<i></i>";
      b.setAttribute("aria-label", "Step " + (i + 1) + " of " + N);
      b.addEventListener("click", function (e) { e.stopPropagation(); goTo(i); });
      progBox.appendChild(b);
    });

    if (hint) hint.textContent = reduceMotion ? "Tap to advance" : "Scroll to advance";

    /* The hint STAYS. It used to fade after the first step, on the theory that a
       reader who has advanced once has learned the control. Atray: "should never
       disappear" - and he is right, because the gate keeps holding the page for
       four more beats and a reader who pauses mid-sequence needs to be told why
       the page has stopped, not just told once. */
    function hideHint() {}

    /* ---- the camera ---------------------------------------------------- */

    /* rests for the first and last 12% of a segment so a camera parked between
       beats still reads as a finished frame, with the move spread over the rest */
    function plateau(u) {
      if (u <= 0.12) return 0;
      if (u >= 0.88) return 1;
      var x = (u - 0.12) / 0.76;
      return x * x * (3 - 2 * x);
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
      elLine.style.opacity = reduceMotion ? 1 : Math.min(1, Math.abs(e - 0.5) / 0.26);

      /* Glow is the costly part of a frame, so it fades out through a move rather
         than being drawn always. A boolean here popped visibly at each end. */
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
      var step = d * 0.085;                                 /* ease out */
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

    /* ---- the gate ------------------------------------------------------ */

    function fills() {
      if (!track) return false;
      var r = track.getBoundingClientRect(), vh = window.innerHeight;
      return r.top < vh * 0.34 && r.bottom > vh * 0.66;
    }

    /* where the page rests while the gate is shut. The board is one viewport
       tall in `svh`, which on a phone is shorter than innerHeight once the
       address bar hides, so centre it in whatever slack there is. */
    function anchorTop() {
      var slack = track.offsetHeight - window.innerHeight;
      return Math.round(track.getBoundingClientRect().top + window.pageYOffset
                        + (slack > 0 ? slack / 2 : 0));
    }

    /* settled, not merely targeted: releasing the moment the last beat is
       REQUESTED lets the reader scroll away mid-transition, which is exactly
       the "exit without the last frame completing" complaint. */
    function finished(dir) {
      if (Math.abs(cur - target) > 0.02) return false;
      return dir > 0 ? target >= N - 1 : target <= 0;
    }

    function hold() {
      if (!engaged) { hraf = null; return; }
      if (perf() - gateStart > FAILSAFE) { bypass = true; release(); return; }
      var y = window.pageYOffset, anchor = anchorTop(), d = anchor - y;
      /* a spring, not a wall: momentum the wheel handler could not cancel
         (iOS never gives you that chance) gets pulled back over a few frames */
      if (Math.abs(d) > 0.5) window.scrollTo(0, Math.round(Math.abs(d) > 3 ? y + d * 0.22 : anchor));
      hraf = requestAnimationFrame(hold);
    }

    function engage() {
      engaged = true;
      acc = 0;
      gateStart = perf();
      /* dock, do not advance: the gesture that brought the reader here is spent
         on locking the board in place, and their NEXT one moves it */
      holdFloor = gateStart + DOCK;
      spent = true; spentT = gateStart; spentPeak = peak;
      /* html has scroll-behavior:smooth, which would animate every correction */
      docEl.style.scrollBehavior = "auto";
      docEl.classList.add("gated");
      if (hraf === null) hraf = requestAnimationFrame(hold);
    }

    function release() {
      if (!engaged) return;
      engaged = false;
      acc = 0;
      docEl.style.scrollBehavior = "";
      docEl.classList.remove("gated");
    }

    function step(dir) {
      var want = target + dir;
      if (want < 0 || want > N - 1) return;
      target = want;
      hideHint();
      if (reduceMotion) { cur = target; draw(); return; }
      if (raf === null) raf = requestAnimationFrame(loop);
    }

    function gesture(ev, delta, thresh) {
      if (!near || bypass || reduceMotion || !delta) return;
      var dir = delta > 0 ? 1 : -1;
      var now = perf(), mag = Math.abs(delta), gap = now - lastT;
      lastT = now;

      /* ONE STREAM SPENDS ONE BEAT. Once a stream has bought its beat it stays
         deaf until something proves a human is acting again, and only three
         things count. Nothing here compares decay rates: an earlier version
         measured the tail's decay against a bleeding reference, and a typical
         macOS fling (time constant ~400ms, so ~0.97 per 12ms event) decays at
         very nearly that same rate and so never read as coasting. That was
         "jumps 2 in one swipe sometimes", and no amount of tuning fixes a
         discriminator whose two classes overlap.

           1. silence  - GESTURE_END of nothing at all. Momentum never contains
                         a gap that long; a lifted hand always does.
           2. rising   - one event RISE times bigger than the one before it. A
                         tail only ever falls, so this is a finger pushing again,
                         which is what catches a second flick thrown before the
                         first one's momentum has died.
           3. drag     - still running DRAG_WAIT later and still DRAG_FRAC as
                         strong as the push that bought the last beat. A tail is
                         at a few percent by then; a held two-finger drag is at
                         100%, so a long steady drag keeps advancing.

         `rising` must be computed off lastMag WITHOUT resetting it on a gap: an
         earlier version cleared it, which made the first event after any stall
         look like a new push and handed the rest of the tail a free beat. */
      var rising = mag > lastMag * RISE;
      lastMag = mag;
      /* peak is PER STREAM: leaving a previous gesture's peak in place sets the
         drag threshold by a swipe that already ended, which silently kills the
         drag escape for every gentler stream after it */
      if (gap > GESTURE_END) { acc = 0; spent = false; peak = 0; }
      if (mag > peak) peak = mag;

      if (!engaged) {
        if (!fills() || finished(dir)) return;
        engage();                     /* docks: the arriving stream is spent */
      }

      /* THE ORDER HERE IS THE WHOLE POINT: swallow first, release second. The
         momentum that carried the reader onto the last beat must never also be
         able to carry them off it, so the gate can only open on a new gesture. */
      /* spentPeak keeps RISING while a stream is spent. A swipe's beat is bought
         two or three events in, while the finger is still accelerating, so the
         magnitude at that moment is a fraction of where the swipe actually peaks
         - and sizing the drag threshold off it hands a slow-decaying tail a
         second beat. It has to be measured against the whole stream. */
      if (mag > spentPeak) spentPeak = mag;

      if (now < holdFloor) {
        acc = 0;
        if (ev.cancelable) ev.preventDefault();
        return;
      }
      if (spent) {
        var drag = now - spentT > DRAG_WAIT && mag > spentPeak * DRAG_FRAC;
        if (!rising && !drag) {
          acc = 0;
          if (ev.cancelable) ev.preventDefault();
          return;
        }
        spent = false;
      }
      if (finished(dir)) {
        release();
        return;                       /* this gesture scrolls the page, as it should */
      }

      if (ev.cancelable) ev.preventDefault();
      acc += delta;
      if (Math.abs(acc) < thresh) return;
      step(acc > 0 ? 1 : -1);
      acc = 0;
      spent = true; spentT = now; spentPeak = peak; peak = mag;
      holdFloor = now + STEP_HOLD;
    }

    window.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      var dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      gesture(e, dy, THRESH_W);
    }, { passive: false });

    window.addEventListener("touchstart", function (e) {
      if (e.touches.length === 1) {
        touchY = e.touches[0].clientY;
        acc = 0; peak = 0; spent = false;   /* a new finger is always a new gesture */
      }
    }, { passive: true });

    window.addEventListener("touchmove", function (e) {
      if (e.touches.length !== 1) return;
      var y = e.touches[0].clientY, d = touchY - y;
      touchY = y;
      gesture(e, d, THRESH_T);
    }, { passive: false });

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (near) { bypass = true; release(); }
        return;
      }
      if (e.key === "Tab") { bypass = true; release(); return; }
      if (!engaged) return;
      var dir = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") dir = 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp") dir = -1;
      else if (e.key === "Home" || e.key === "End") { bypass = true; release(); return; }
      if (!dir) return;
      if (finished(dir)) { release(); return; }
      e.preventDefault();
      step(dir);
    });

    /* Any in-page anchor has to beat the gate. The nav dots are plain href="#id"
       links, so without this the hold loop yanks the page straight back and the
       whole nav is a dead control while the board is on screen. */
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest || !t.closest('a[href^="#"]')) return;
      bypass = true;
      release();
    }, true);
    window.addEventListener("hashchange", function () { bypass = true; release(); });

    /* `near` keeps the non-passive wheel listener from doing rect work on every
       event elsewhere on the page, and re-arms the Esc bypass once the board is
       out of sight so one escape does not disable the gate for the whole visit. */
    if (track && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          near = en.isIntersecting;
          if (!near) { bypass = false; release(); }
        });
      }, { rootMargin: "20% 0px 20% 0px" }).observe(track);
    } else {
      near = true;
    }


    stage.addEventListener("click", function () { goTo(state + 1); });

    root.tabIndex = -1;   /* arrow keys stay inside the component */
    root.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      goTo(state + (e.key === "ArrowRight" ? 1 : -1));
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

    /* boot repaints at the current beat. It must NOT recompute the beat from
       scroll position: the beat is gesture state now, and a resize (a phone
       address bar collapsing counts) would otherwise throw the reader back. */
    function boot() {
      tokens(); layout(); reserve(); lastKey = "";
      cur = target;
      draw();
    }

    if (window.ResizeObserver) new ResizeObserver(boot).observe(stage);
    else window.addEventListener("resize", boot);

    boot();
  }
});
