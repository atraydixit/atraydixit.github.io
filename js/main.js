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

  /* ------------------------------------------------------ timeline toggle --

     One control for all seven descriptions, not seven accordions: a per-row
     accordion hides a checkable DOI behind a tap. Compressed is the CSS DEFAULT
     and the class is what opens it, so with JS off a reader still gets year,
     linked title and attribution on every row - the button is the only thing
     that stops working, not the evidence. */
  (function () {
    var btn = document.getElementById("tl-toggle");
    var list = document.getElementById("tl-list");
    if (!btn || !list) return;
    btn.addEventListener("click", function () {
      var open = list.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  })();

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
      /* The last section is shorter than a viewport, so at maximum scroll the
         0.35 line still stops short of its top and its dot could never light at
         all. Measured 74px short at 1440x900 and 128px at 390x844. Snap to the
         last section once the document bottom is reached. */
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
      /* BEAT 1 CARRIES NO CLASS COUNT, DELIBERATELY. The section lede says 13
         approved classes in 1980; the 1980 panel is 8 chemotherapy classes; the
         caption sources the 8. Stating a class count in the beat as well put 13
         and 8 on the same screen for the same year with nothing reconciling
         them. The beat's job is the curative layer, the fraction's job is the
         coverage, the lede's job is the growth, the caption's job is provenance.
         One number, one role. Do not put a class count back in the beat.
         ---------------------------------------------------------------------
         These bands are what make the copy's counts literal rather than
         approximate: they integrate to 25.0 at n=28, 694.1 at n=3,321 and
         1,392.9 at n=91,881, which are exactly the build's covered counts
         (25/28, 694/3,321, and 694+699 of 91,881). The board draws the number
         the sentence states. Change one and you must change the other. */
      bands: [[28, 0.8929], [3321, 0.2032], [91881, 0.00789]],
      /* The marks stay at all three depths even though only two are beats now:
         they annotate the nested structure that is visible inside the wide view,
         so a reader can still see where pairs end and triples begin. */
      marks: [[28, "1980"], [3321, "pairs"], [91881, "combinations"]],

      /* THREE BEATS, NOT FIVE. The intermediate reveals (3,321 and 91,881) were
         cut because the section lede already carries both ("over 90,000 possible
         pairs and triples") and the doubling clause, so nothing above the board
         is lost. It also halves the gate: the arriving gesture docks and two
         gestures finish the sequence.

         `frac` is [numerator, denominator, basis label]. The numbers are not
         decoration: 25/28 and 2,906/19,248,516 are exactly what the bands draw
         at those n. The basis DOES change between the two beats (combinations,
         then combinations x dose x schedule) and the label says so on the page
         rather than hiding it. On a fully consistent basis 1980 is 52/1,008,
         which still gives a 343x collapse in searched fraction; that is the
         answer to have ready, not the one on screen. */
      states: [
        {
          n: 28, zoom: 0.80, upto: 1980,
          frac: [25, 28, "1980 \u00b7 2-drug combinations"],
          line: "In <b>1980</b>, <b>13</b> of these combinations became part of curative regimens in at least one cancer."
        },
        {
          /* 3,321 pairs x 36 + 88,560 triples x 216 = 19,248,516. Variant-major,
             so beat 1 is the literal top-left corner. 1,393 + 1,513 = 2,906 lit. */
          n: 19248516, zoom: 0.96, upto: 2100,
          frac: [2906, 19248516, "2026 \u00b7 with dose and schedule"],
          line: "By <b>2026</b>, 82 classes, at three doses and two schedules each."
        },
        {
          /* Same n and zoom as beat 2, so the camera holds still and the only
             change is the Oncko layer fading in. No fraction: the instrument
             fades out here, because this beat is a direction, not a measurement. */
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
        /* CULL TO THE VISIBLE PREFIX. Only a prefix of the board can ever be on
           canvas: the L-shell layout puts the first k^2 indices in the top-left
           k x k square, and org is (F - cols*pitch)/2 with zoom <= 0.96, so the
           origin is always positive and the board grows right and down from it.
           Everything past the visible square is off-screen by construction.

           Without this bound, a segment whose far end is the 19,248,516-cell
           board loops 19.2 MILLION times per frame while the pitch is still big
           enough to keep side >= 2.4. Measured at 150-300ms per frame, which is
           not just a stutter: it starves setTimeout past GESTURE_END, so one
           wheel gesture gets split in two and spends two beats. */
        var vis = Math.ceil(F / pitch) + 2;
        var lim = Math.min(n, vis * vis);

        for (var j = 0; j < lim; j++) cell(j, j < nMin ? 1 : grow);
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
    var pin   = document.querySelector(".board-pin");
    var hint = document.getElementById("onb-hint");
    var elFrac = document.getElementById("onb-frac");
    var elNum = document.getElementById("onb-num");
    var elDen = document.getElementById("onb-den");
    var elBasis = document.getElementById("onb-basis");
    var lastBasis = "", lastNumS = "", lastDenS = "";
    var target = 0;          /* the beat being asked for */
    var cur = 0;             /* where the camera actually is, 0..N-1 */
    var state = -1;          /* nearest whole beat, for copy and aria */
    var raf = null, lastKey = "";

    /* a segment may not be crossed in fewer than 28 frames (~470ms at 60fps).
       Gestures only ever move the target one beat, but a tick click can move
       four, and this is what stops that from teleporting. */
    var MAXSTEP = 1 / 28;


    /* TWO NATIVE MECHANICS, NO CAPTURE ANYWHERE.
       This replaces a gate that consumed the reader's wheel and touch events and
       held the page in place. It failed on real hardware for two independent
       testers while every synthetic profile passed, which is the signature of a
       bug in the layer a harness cannot reach: on iOS `touch-action` on the root
       scroller is honoured inconsistently and a momentum scroll already under
       way cannot be cancelled at all, and on desktop the arriving gesture was
       spent docking the board, so the reader's first push did nothing.

       Nothing here calls preventDefault on a vertical gesture any more. There is
       no spring, no failsafe, no escape hatch and no gesture classifier, because
       there is nothing left to escape from.

         DESKTOP  the beat is a pure function of scroll position. The track is
                  2.2 viewports tall and the board is `position: sticky` inside
                  it, so scrolling through the track plays the sequence and
                  scrolling past it leaves. This is strictly BETTER than the gate
                  at the one thing the gate was for: a scrub renders every beat
                  on the way past, because the reader traverses every position.
                  A gate could be defeated by one long fling. A scrub cannot.
         TOUCH    a carousel - swipe sideways, tap the board, tap a tick - on a
                  one-viewport track, because 2.2 viewports of scrolling for a
                  single card is punishing on a phone.

       Detection is by POINTER, not width: a narrow desktop window is still a
       mouse and an iPad is still iOS. The CSS that makes the track tall and the
       board sticky keys off the SAME query, so the two cannot disagree. */
    var TOUCH = window.matchMedia
      ? window.matchMedia("(hover: none) and (pointer: coarse)").matches
      : "ontouchstart" in window;
    var SCRUB = !TOUCH && !reduceMotion;

    var near = false;      /* board is on or near screen; skips work when not */
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

    if (hint) hint.textContent = reduceMotion ? "Tap to advance"
      : TOUCH ? "Swipe to advance" : "Scroll to play";

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

    function comma(n) {
      return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /* Geometric, not linear: the same interpolation the camera pitch uses, so
       the digits and the dolly move together. A linear roll would spend almost
       all its travel in the last few frames and read as a jump. */
    function geo(x0, x1, e) {
      return Math.exp(Math.log(x0) * (1 - e) + Math.log(x1) * e);
    }

    /* Three significant figures while rolling, exact at the ends. Two reasons,
       and the second is the load-bearing one: a seven-digit counter flickering
       at 60Hz is illegible anyway, and quantizing collapses most frames onto a
       string that is already on screen, so the DOM write can be skipped. Each
       textContent write on these large glyphs measured ~7ms with no GPU (31.2ms
       a frame with both writes live against 16.7ms with them stubbed), and it
       is not layout: a fixed-width, `contain`ed box made no difference. */
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
        /* the trailing beat carries no fraction: hold the numbers and fade out */
        put(elNum, comma(fa[0]), 0);
        put(elDen, comma(fa[1]), 1);
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
      fraction(a, e, fade);

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

    /* ---- the scrub ----------------------------------------------------- */

    /* Progress through the sticky window: 0 when the board arrives, 1 when it is
       about to leave. Measured from the PIN rather than from innerHeight, because
       a phone address bar changes innerHeight mid-scroll and `svh` does not. */
    function progress() {
      if (!track || !pin) return 0;
      var span = track.offsetHeight - pin.offsetHeight;
      if (span <= 0) return 0;
      var p = -track.getBoundingClientRect().top / span;
      return p < 0 ? 0 : p > 1 ? 1 : p;
    }

    /* The scrub sets `cur` DIRECTLY and never starts the animation loop, so
       there is no spring to settle and nothing to fight: the camera is exactly
       where the reader has scrolled to. `target` is kept in sync only so a later
       tick click or swipe has a sane starting point. */
    function scrub() {
      scrubRaf = null;
      var v = progress() * (N - 1);
      if (Math.abs(v - cur) < 0.0005) return;
      cur = v;
      target = Math.round(v);
      draw();
    }

    function onScroll() {
      if (near && scrubRaf === null) scrubRaf = requestAnimationFrame(scrub);
    }

    /* Where the page must be for beat i. The explicit controls move the PAGE and
       let the scrub follow, so the scrollbar and the board can never disagree. */
    function scrollToBeat(i) {
      if (!track || !pin) return;
      var span = track.offsetHeight - pin.offsetHeight;
      var top = track.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: Math.round(top + span * (i / (N - 1))), behavior: "smooth" });
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

    /* `near` keeps the scroll handler from doing rect work while the reader is
       elsewhere on the page. The margin is generous on purpose: the scrub must
       already be following by the time the board is visible, or the first frame
       the reader sees is beat 1 when it should be mid-transition. */
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


    /* `target`, not `state`: `state` is the nearest DRAWN beat, so tapping or
       swiping mid-transition against it is a dead input. Against `target` every
       gesture lands, and MAXSTEP keeps a burst of them animating rather than
       teleporting. */
    var swiped = false;

    stage.addEventListener("click", function () {
      if (swiped) { swiped = false; return; }   /* that was a swipe, not a tap */
      var i = Math.round(cur) + 1;
      if (i > N - 1) return;
      if (SCRUB) scrollToBeat(i); else goTo(i);
    });

    if (TOUCH) {
      var SWIPE_MIN = 45;   /* px of horizontal travel that counts as a swipe */
      var AXIS_LOCK = 10;   /* px of travel before the axis is decided */
      var card = (root.closest && root.closest(".board-wrap")) || root;
      var sx = 0, sy = 0, axis = 0;   /* 0 undecided, 1 horizontal, 2 vertical */

      card.addEventListener("touchstart", function (e) {
        if (e.touches.length !== 1) { axis = 2; return; }
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
        axis = 0;
      }, { passive: true });

      card.addEventListener("touchmove", function (e) {
        if (e.touches.length !== 1 || axis === 2) return;
        var dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
        if (!axis) {
          if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
          /* decided ONCE per touch and never revisited, so a swipe that drifts
             downward does not turn into a scroll halfway through, and a scroll
             that wobbles sideways never steals a beat */
          axis = Math.abs(dx) > Math.abs(dy) ? 1 : 2;
        }
        /* only the horizontal branch ever cancels. A vertical gesture on a
           phone is the reader leaving, and that is now allowed. */
        if (axis === 1 && e.cancelable) e.preventDefault();
      }, { passive: false });

      card.addEventListener("touchend", function (e) {
        if (axis !== 1) { axis = 0; return; }
        axis = 0;
        var t = e.changedTouches && e.changedTouches[0];
        if (!t || Math.abs(t.clientX - sx) < SWIPE_MIN) return;
        swiped = true;
        goTo(target + (t.clientX - sx < 0 ? 1 : -1));   /* left = forward */
      }, { passive: true });
    }

    /* Focusable, so the arrow keys can be reached at all - it was tabIndex -1,
       which made the board keyboard-navigable only by accident of the ticks. */
    root.tabIndex = 0;
    root.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
            : e.key === "ArrowLeft"  || e.key === "ArrowUp"   ? -1 : 0;
      if (!d) return;
      var i = Math.round(cur) + d;
      /* at the ends, do NOT preventDefault: the arrow key falls through and
         scrolls the page, which is what a reader at the last beat wants */
      if (i < 0 || i > N - 1) return;
      e.preventDefault();
      if (SCRUB) scrollToBeat(i); else goTo(i);
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
    /* boot repaints at the current beat. Under the scrub the beat is a function
       of scroll position, so it re-reads that rather than snapping to a whole
       beat - a phone address bar collapsing counts as a resize, and snapping
       there would jump the camera under the reader's finger. */
    function boot() {
      tokens(); layout(); reserve(); lastKey = "";
      if (SCRUB) { cur = progress() * (N - 1); target = Math.round(cur); }
      else cur = target;
      draw();
    }

    if (window.ResizeObserver) new ResizeObserver(boot).observe(stage);
    else window.addEventListener("resize", boot);

    boot();
  }
});
