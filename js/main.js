document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // -----------------------------
  // Shared helpers
  // -----------------------------
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

  // -----------------------------
  // Visualization
  // Safe: only runs if required DOM exists
  // -----------------------------
  initVisualization();

  function initVisualization() {
    const DRUG_COUNT = 14;
    const ACTIVE_COUNT = 4;
    const LOOP_MS = 24800;
    const CENTER = { x: 380, y: 165 };
    const SVG_NS = "http://www.w3.org/2000/svg";

    const drugLayer = document.getElementById("drugs");
    const lineLayer = document.getElementById("lines");
    const starLayer = document.getElementById("stars");

    const simEffFill = document.getElementById("simEffFill");
    const simToxFill = document.getElementById("simToxFill");
    const simEffValue = document.getElementById("simEffValue");
    const simToxValue = document.getElementById("simToxValue");

    const orbHalo = document.getElementById("orbHalo");
    const orbOuter = document.getElementById("orbOuter");
    const orbInner = document.getElementById("orbInner");
    const orbLogo = document.getElementById("orbLogo");

    const scoreStage = document.getElementById("scoreStage");
    const scoreSub = document.getElementById("scoreSub");

    const required = [
      drugLayer,
      lineLayer,
      starLayer,
      simEffFill,
      simToxFill,
      simEffValue,
      simToxValue,
      orbHalo,
      orbOuter,
      orbInner,
      orbLogo,
      scoreStage,
      scoreSub,
    ];

    if (required.some((el) => !el)) {
      console.warn("Visualization skipped: one or more required elements are missing.");
      return;
    }

    let currentStage = scoreStage.textContent || "";
    let currentSub = scoreSub.textContent || "";
    let narrativeSwapTimer = null;

    function setNarrative(stage, sub) {
      if (stage === currentStage && sub === currentSub) return;

      currentStage = stage;
      currentSub = sub;

      scoreStage.classList.add("narrative-swap");
      scoreSub.classList.add("narrative-swap");

      if (narrativeSwapTimer) clearTimeout(narrativeSwapTimer);

      narrativeSwapTimer = setTimeout(() => {
        scoreStage.textContent = stage;
        scoreSub.textContent = sub;
        scoreStage.classList.remove("narrative-swap");
        scoreSub.classList.remove("narrative-swap");
      }, 980);
    }

    function seedNoise(i) {
      return (Math.sin(i * 91.713) + 1) / 2;
    }

    function comboIndices(cycle) {
      const start = (cycle * 3) % DRUG_COUNT;
      return Array.from({ length: ACTIVE_COUNT }, (_, i) => (start + i * 2) % DRUG_COUNT);
    }

    function scheduleMorph(t, phase) {
      const v = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 + phase);
      return {
        rx: lerp(0.5, 0.18, v),
        ry: lerp(0.5, 0.34, 1 - v),
        rot: lerp(-24, 24, v),
      };
    }

    function hsla(h, s, l, a) {
      return `hsla(${h}, ${s}%, ${l}%, ${a})`;
    }

    function buildStars() {
      const STAR_COUNT = 28;

      for (let i = 0; i < STAR_COUNT; i++) {
        const star = document.createElementNS(SVG_NS, "circle");
        const x = 40 + ((i * 67) % 520);
        const y = 24 + ((i * 43) % 320);
        const r = 0.8 + (i % 3) * 0.45;
        const phase = (i * 0.7) % (Math.PI * 2);

        star.setAttribute("cx", x.toFixed(2));
        star.setAttribute("cy", y.toFixed(2));
        star.setAttribute("r", r.toFixed(2));
        star.setAttribute("fill", "rgba(255,255,255,0.82)");
        star.setAttribute("opacity", "0.4");
        star.dataset.phase = String(phase);

        starLayer.appendChild(star);
      }
    }

    buildStars();

    const drugs = Array.from({ length: DRUG_COUNT }, (_, i) => {
      const angle = (i / DRUG_COUNT) * Math.PI * 2 - Math.PI / 3;
      const radius = 150 + seedNoise(i + 1) * 90;
      return {
        id: i,
        x: 230 + Math.cos(angle) * radius,
        y: 215 + Math.sin(angle) * (radius * 0.75),
        hue: 185 + ((i * 19) % 55),
        phase: seedNoise(i + 7) * Math.PI * 2,
        baseDose: 18 + seedNoise(i + 3) * 18,
      };
    });

    const drugEls = drugs.map((drug) => {
      const g = document.createElementNS(SVG_NS, "g");
      const glow = document.createElementNS(SVG_NS, "ellipse");
      const core = document.createElementNS(SVG_NS, "ellipse");

      glow.setAttribute("fill", hsla(drug.hue, 82, 68, 0.16));
      core.setAttribute("fill", hsla(drug.hue, 76, 58, 0.92));
      core.setAttribute("stroke", "rgba(255,255,255,0.16)");
      core.setAttribute("stroke-width", "1.2");

      g.appendChild(glow);
      g.appendChild(core);
      drugLayer.appendChild(g);

      return { g, glow, core };
    });

    const lines = Array.from({ length: ACTIVE_COUNT }, () => {
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("stroke", "url(#lineGrad)");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-linecap", "round");
      lineLayer.appendChild(line);
      return line;
    });

    function render(now) {
      const time = now % LOOP_MS;
      const cycle = Math.floor(now / LOOP_MS);
      const active = comboIndices(cycle);
      const activeSet = new Set(active);

      const introEnd = 5200;
      const evalEnd = 9800;
      const optimizeEnd = 18400;
      const finalEnd = 23200;

      let eff = 0;
      let tox = 0;
      scoreStage.classList.remove("emphasis");

      if (time < introEnd) {
        setNarrative("Search initialized", "Selecting an initial multi-drug regimen");
      } else if (time < evalEnd) {
        setNarrative("Combination evaluation", "Measuring the first efficacy and toxicity profile");
        eff = 58;
        tox = 64;
      } else if (time < optimizeEnd) {
        setNarrative("Optimization in progress", "Tuning dose and schedule");
        const t = easeInOut((time - evalEnd) / (optimizeEnd - evalEnd));
        eff = lerp(58, 91, t);
        tox = lerp(64, 24, t);
      } else if (time < finalEnd) {
        setNarrative("Optimized combination", "Achieved higher-efficacy, lower-toxicity regimen");
        scoreStage.classList.add("emphasis");
        eff = 91;
        tox = 24;
      } else {
        setNarrative("Search initialized", "Preparing the next region of combination space");
      }

      simEffFill.style.width = `${eff}%`;
      simToxFill.style.width = `${tox}%`;
      simEffValue.textContent = String(Math.round(eff));
      simToxValue.textContent = String(Math.round(tox));

      const stars = starLayer.children;
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const phase = parseFloat(star.dataset.phase || "0");
        const pulse = 0.58 + 0.42 * (0.5 + 0.5 * Math.sin(now * 0.0011 + phase));
        star.setAttribute("opacity", pulse.toFixed(3));
      }

      const optimizeT = clamp((time - evalEnd) / (optimizeEnd - evalEnd), 0, 1);
      const gatherT = clamp(time / introEnd, 0, 1);
      const mergeT = clamp((time - optimizeEnd) / (finalEnd - optimizeEnd), 0, 1);
      const settleFinal = time >= optimizeEnd && time < finalEnd;

      active.forEach((idx, localIdx) => {
        const line = lines[localIdx];
        const drug = drugs[idx];
        const x = lerp(drug.x, CENTER.x, gatherT * 0.8 + optimizeT * 0.2);
        const y = lerp(drug.y, CENTER.y, gatherT * 0.8 + optimizeT * 0.2);

        line.setAttribute("x1", String(x));
        line.setAttribute("y1", String(y));
        line.setAttribute("x2", String(CENTER.x));
        line.setAttribute("y2", String(CENTER.y));
        line.setAttribute(
          "opacity",
          time < introEnd
            ? String(lerp(0.04, 0.42, gatherT))
            : time < optimizeEnd
              ? "0.48"
              : time < finalEnd
                ? String(lerp(0.48, 0.08, mergeT))
                : "0.08"
        );
      });

      drugs.forEach((drug, i) => {
        const { g, glow, core } = drugEls[i];
        const isActive = activeSet.has(i);
        const driftX = Math.sin(now * 0.00062 + drug.phase) * 7;
        const driftY = Math.cos(now * 0.00078 + drug.phase) * 5.5;

        let x = drug.x + driftX;
        let y = drug.y + driftY;
        let opacity = isActive ? 0.98 : 0.34;
        let rx = lerp(
          drug.baseDose * 0.76,
          drug.baseDose * 1.02,
          0.5 + 0.5 * Math.sin(now * 0.0012 + drug.phase)
        );
        let ry = rx * 0.72;
        let rot = Math.sin(now * 0.00082 + drug.phase) * 10;

        if (isActive) {
          const toCenter = easeInOut(clamp((time - 900) / (introEnd - 900), 0, 1));
          x = lerp(x, CENTER.x + Math.sin(drug.phase) * 16, toCenter);
          y = lerp(y, CENTER.y + Math.cos(drug.phase) * 16, toCenter);

          if (time >= evalEnd && time < optimizeEnd) {
            const pulse = 0.5 + 0.5 * Math.sin(now * 0.0028 + drug.phase);
            const morph = scheduleMorph(now * 0.00028 + optimizeT * 0.8, drug.phase);
            rx = lerp(18, 30, pulse) * morph.rx;
            ry = lerp(13, 23, 1 - pulse) * (0.98 + morph.ry * 0.32);
            rot = morph.rot * 0.72 + pulse * 10 - 5;
          }

          if (settleFinal) {
            opacity = lerp(0.94, 0.0, mergeT);
            rx = lerp(rx, 0.1, mergeT);
            ry = lerp(ry, 0.1, mergeT);
            x = lerp(x, CENTER.x, mergeT);
            y = lerp(y, CENTER.y, mergeT);
            rot = lerp(rot, 0, mergeT);
          }
        }

        g.setAttribute(
          "transform",
          `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)})`
        );
        g.setAttribute("opacity", opacity.toFixed(3));

        glow.setAttribute("cx", "0");
        glow.setAttribute("cy", "0");
        glow.setAttribute("rx", (rx * 1.85).toFixed(2));
        glow.setAttribute("ry", (ry * 1.85).toFixed(2));

        core.setAttribute("cx", "0");
        core.setAttribute("cy", "0");
        core.setAttribute("rx", Math.max(0.1, rx).toFixed(2));
        core.setAttribute("ry", Math.max(0.1, ry).toFixed(2));
      });

      const orbT =
        time < optimizeEnd
          ? 0
          : time < finalEnd
            ? easeInOut((time - optimizeEnd) / (finalEnd - optimizeEnd))
            : 0;

      const stable = time >= finalEnd - 2200 && time < finalEnd;
      const orbPulse = stable ? 0 : 0.5 + 0.5 * Math.sin(now * 0.0018);

      const haloR = lerp(58, 102, orbT) + orbPulse * 1.2;
      const outerR = lerp(34, 57, orbT) + orbPulse * 0.45;
      const innerR = lerp(18, 28, orbT);
      const orbOpacity = time < optimizeEnd ? 0.08 : time < finalEnd ? lerp(0.12, 1, orbT) : 0.08;
      const logoSize = lerp(86, 122, orbT);
      const logoOpacity = time < optimizeEnd ? 0 : time < finalEnd ? lerp(0.0, 0.96, orbT) : 0;

      orbHalo.setAttribute("r", haloR.toFixed(2));
      orbOuter.setAttribute("r", outerR.toFixed(2));
      orbInner.setAttribute("r", innerR.toFixed(2));

      orbHalo.setAttribute("opacity", (orbOpacity * 0.82).toFixed(3));
      orbOuter.setAttribute("opacity", orbOpacity.toFixed(3));
      orbInner.setAttribute("opacity", Math.min(0.95, orbOpacity + 0.08).toFixed(3));

      orbLogo.setAttribute("width", logoSize.toFixed(2));
      orbLogo.setAttribute("height", logoSize.toFixed(2));
      orbLogo.setAttribute("x", (CENTER.x - logoSize / 2).toFixed(2));
      orbLogo.setAttribute("y", (CENTER.y - logoSize / 2).toFixed(2));
      orbLogo.setAttribute("opacity", logoOpacity.toFixed(3));

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  // -----------------------------
  // Reveal animations
  // Safe fallback: if unsupported, reveal everything
  // -----------------------------
  initRevealAnimations();

  function initRevealAnimations() {
    const revealEls = document.querySelectorAll(
      ".reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale"
    );

    if (!revealEls.length) return;

    if (!("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("in-view", entry.isIntersecting);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  }

  // -----------------------------
  // Side nav scrollspy
  // -----------------------------
  initScrollSpy();

  function initScrollSpy() {
    const sections = [...document.querySelectorAll(".section[data-nav]")];
    const navDots = [...document.querySelectorAll(".nav-dot")];

    if (!sections.length || !navDots.length) return;

    function updateActiveNav() {
      const trigger = window.scrollY + window.innerHeight * 0.42;
      let currentIdx = 0;

      sections.forEach((section, idx) => {
        if (trigger >= section.offsetTop) currentIdx = idx;
      });

      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;

      if (nearBottom) currentIdx = sections.length - 1;

      navDots.forEach((dot, i) => {
        dot.classList.toggle("active", i === currentIdx);
      });
    }

    window.addEventListener("scroll", updateActiveNav, { passive: true });
    window.addEventListener("resize", updateActiveNav);
    window.addEventListener("load", updateActiveNav);

    updateActiveNav();
  }

  // -----------------------------
  // Optional today timeline
  // Safe if missing
  // -----------------------------
  initTodayTimeline();

  function initTodayTimeline() {
    const dateEl = document.getElementById("today-date");
    const marker = document.getElementById("timeline-today");

    if (!dateEl || !marker) return;

    const now = new Date();
    dateEl.textContent = now.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
});