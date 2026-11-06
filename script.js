(() => {
  "use strict";

  const canvas = document.getElementById("creatureCanvas");
  const stage = document.getElementById("stageWrap");
  const ctx = canvas.getContext("2d", { alpha: true });
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const palettes = {
    emerald: { body: "#70d69b", light: "#c1f4d0", dark: "#277d55", glow: "#53e58e", belly: "#a6d9ad" },
    toxic:   { body: "#c2e65a", light: "#edff9d", dark: "#668b2c", glow: "#c4ff4f", belly: "#d5e89a" },
    forest:  { body: "#b0a978", light: "#e0d7a5", dark: "#686d43", glow: "#c5bd77", belly: "#d0c69b" },
    cyber:   { body: "#67c8d8", light: "#b8f3f2", dark: "#287f91", glow: "#5deaff", belly: "#a2dfe0" },
    shadow:  { body: "#a6a9b5", light: "#e2e5ed", dark: "#555b6c", glow: "#b6c6db", belly: "#bfc3ce" }
  };

  const settings = {
    speed: 1, scale: 1, sensitivity: 0.65, mode: "follow",
    skin: "emerald", glow: true, eyeGlow: true, paused: false
  };

  let width = 1, height = 1, dpr = 1, raf = 0, lastTime = 0, fpsFrames = 0, fpsTime = 0;
  let elapsed = 0, pointerActive = false, hasInteracted = false;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const creature = { x: 0, y: 0, angle: 0, vx: 0, vy: 0 };
  const body = [];
  const BODY_COUNT = 27;
  const TAU = Math.PI * 2;
  let lastFpsUpdate = 0;

  function resize() {
    const rect = stage.getBoundingClientRect();
    const oldW = width, oldH = height;
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.7);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!oldW || !oldH || !body.length) {
      creature.x = width * 0.5;
      creature.y = height * 0.52;
      pointer.x = pointer.targetX = width * 0.68;
      pointer.y = pointer.targetY = height * 0.5;
      seedBody();
    } else {
      const sx = width / oldW, sy = height / oldH;
      creature.x *= sx; creature.y *= sy;
      body.forEach(p => { p.x *= sx; p.y *= sy; });
      pointer.x *= sx; pointer.y *= sy; pointer.targetX *= sx; pointer.targetY *= sy;
    }
  }

  function seedBody() {
    body.length = 0;
    for (let i = 0; i < BODY_COUNT; i++) {
      body.push({ x: creature.x - i * 7, y: creature.y, angle: 0 });
    }
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function angleDiff(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.targetX = clamp(event.clientX - rect.left, 0, width);
    pointer.targetY = clamp(event.clientY - rect.top, 0, height);
    pointerActive = true;
    if (!hasInteracted) {
      hasInteracted = true;
      $("stageHint").classList.add("hidden");
    }
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    setPointer(event);
  }, { passive: false });
  canvas.addEventListener("pointermove", setPointer, { passive: true });
  canvas.addEventListener("pointerup", () => { if (settings.mode !== "follow" && settings.mode !== "precision") pointerActive = false; });
  canvas.addEventListener("pointercancel", () => { pointerActive = false; });
  canvas.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse") pointerActive = false; });
  window.addEventListener("blur", () => { pointerActive = false; });

  function targetPoint(time) {
    const cx = width * 0.5, cy = height * 0.5;
    if (settings.mode === "idle") {
      return { x: cx + Math.cos(time * 0.42) * width * 0.17, y: cy + Math.sin(time * 0.65) * height * 0.14 };
    }
    if (settings.mode === "explore") {
      return { x: cx + Math.cos(time * 0.27) * width * 0.29 + Math.sin(time * 0.71) * 35,
               y: cy + Math.sin(time * 0.39) * height * 0.25 };
    }
    if (!pointerActive && !hasInteracted) {
      return { x: cx + width * 0.18, y: cy };
    }
    if (!pointerActive && settings.mode === "follow") {
      return { x: lerp(pointer.targetX, cx, 0.025), y: lerp(pointer.targetY, cy, 0.025) };
    }
    return { x: pointer.targetX, y: pointer.targetY };
  }

  function update(dt) {
    elapsed += dt * settings.speed;
    const target = targetPoint(elapsed);
    const dx = target.x - creature.x, dy = target.y - creature.y;
    const distance = Math.hypot(dx, dy);
    const desiredAngle = Math.atan2(dy, dx);
    const turn = settings.mode === "precision" ? 0.24 : 0.105;
    creature.angle += angleDiff(creature.angle, desiredAngle) * Math.min(1, turn * settings.sensitivity * 1.55 * dt * 60);
    const force = clamp(distance * 0.012 * settings.sensitivity, 0, settings.mode === "precision" ? 4.8 : 3.2);
    creature.vx = lerp(creature.vx, Math.cos(creature.angle) * force, 0.12 * dt * 60);
    creature.vy = lerp(creature.vy, Math.sin(creature.angle) * force, 0.12 * dt * 60);
    creature.x += creature.vx * dt * 60;
    creature.y += creature.vy * dt * 60;

    const spacing = 7.2 * settings.scale;
    for (let i = 0; i < body.length; i++) {
      const previous = i === 0 ? creature : body[i - 1];
      const p = body[i];
      const vx = p.x - previous.x, vy = p.y - previous.y;
      const a = Math.atan2(vy, vx);
      const sway = Math.sin(elapsed * 4.2 - i * 0.34) * (i / BODY_COUNT) * 0.13;
      const finalAngle = a + sway;
      const desiredX = previous.x - Math.cos(finalAngle) * spacing;
      const desiredY = previous.y - Math.sin(finalAngle) * spacing;
      p.x = lerp(p.x, desiredX, 0.42);
      p.y = lerp(p.y, desiredY, 0.42);
      p.angle = Math.atan2(previous.y - p.y, previous.x - p.x);
    }

    const margin = 38 * settings.scale;
    creature.x = clamp(creature.x, margin, Math.max(margin, width - margin));
    creature.y = clamp(creature.y, margin, Math.max(margin, height - margin));
  }

  function drawLimb(anchor, angle, length, phase, palette, side) {
    const stride = Math.sin(elapsed * 7 + phase) * 8 * settings.scale;
    const lift = Math.max(0, Math.cos(elapsed * 7 + phase)) * 5 * settings.scale;
    const shoulderX = anchor.x + Math.cos(angle) * 3 * settings.scale;
    const shoulderY = anchor.y + Math.sin(angle) * 3 * settings.scale;
    const elbowX = shoulderX + Math.cos(angle + side * 0.9) * length * 0.55;
    const elbowY = shoulderY + Math.sin(angle + side * 0.9) * length * 0.55;
    const footX = elbowX + Math.cos(angle + side * 0.45) * length * 0.55 + stride;
    const footY = elbowY + Math.sin(angle + side * 0.45) * length * 0.55 - lift;
    ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.quadraticCurveTo(elbowX - side * 4, elbowY, footX, footY);
    ctx.strokeStyle = palette.dark; ctx.lineWidth = 6 * settings.scale; ctx.lineCap = "round"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.quadraticCurveTo(elbowX - side * 4, elbowY, footX, footY);
    ctx.strokeStyle = palette.body; ctx.lineWidth = 3.3 * settings.scale; ctx.stroke();
    ctx.beginPath(); ctx.arc(footX, footY, 3.2 * settings.scale, 0, TAU); ctx.fillStyle = palette.light; ctx.fill();
    for (let toe = -1; toe <= 1; toe++) {
      const tx = footX + Math.cos(angle + toe * 0.65) * 7 * settings.scale;
      const ty = footY + Math.sin(angle + toe * 0.65) * 7 * settings.scale;
      ctx.beginPath(); ctx.moveTo(footX, footY); ctx.lineTo(tx, ty);
      ctx.strokeStyle = palette.light; ctx.lineWidth = 1.6 * settings.scale; ctx.stroke();
    }
  }

  function drawBody(palette) {
    const s = settings.scale;
    // Tail: a smooth tapered ribbon following the articulated spine.
    ctx.beginPath();
    body.forEach((p, i) => {
      const prev = i === 0 ? creature : body[i - 1];
      const r = Math.max(1.2, (10.5 - i * 0.34) * s);
      const a = Math.atan2(p.y - prev.y, p.x - prev.x) + Math.PI / 2;
      const left = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
      if (i === 0) ctx.moveTo(left.x, left.y); else ctx.lineTo(left.x, left.y);
    });
    for (let i = body.length - 1; i >= 0; i--) {
      const p = body[i], prev = i === 0 ? creature : body[i - 1];
      const r = Math.max(1.2, (10.5 - i * 0.34) * s);
      const a = Math.atan2(p.y - prev.y, p.x - prev.x) + Math.PI / 2;
      ctx.lineTo(p.x - Math.cos(a) * r, p.y - Math.sin(a) * r);
    }
    ctx.closePath();
    if (settings.glow) { ctx.shadowColor = palette.glow; ctx.shadowBlur = 18 * s; }
    const gradient = ctx.createLinearGradient(creature.x, creature.y - 16 * s, body[body.length - 1].x, body[body.length - 1].y + 10 * s);
    gradient.addColorStop(0, palette.light); gradient.addColorStop(.34, palette.body); gradient.addColorStop(1, palette.dark);
    ctx.fillStyle = gradient; ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = palette.light; ctx.globalAlpha = .36; ctx.lineWidth = 1.2 * s; ctx.stroke(); ctx.globalAlpha = 1;

    // Back plates and subtle scale marks.
    for (let i = 3; i < body.length - 2; i += 2) {
      const p = body[i], a = p.angle + Math.PI / 2;
      const size = Math.max(1.2, (4.2 - i * .09) * s);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, size * 1.3, size * .65, a, 0, TAU);
      ctx.fillStyle = palette.light; ctx.globalAlpha = .35; ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  function drawHead(palette) {
    const s = settings.scale, a = creature.angle;
    const headX = creature.x + Math.cos(a) * 14 * s;
    const headY = creature.y + Math.sin(a) * 14 * s;
    ctx.save(); ctx.translate(headX, headY); ctx.rotate(a);
    if (settings.glow) { ctx.shadowColor = palette.glow; ctx.shadowBlur = 16 * s; }
    ctx.beginPath(); ctx.moveTo(18*s, 0); ctx.quadraticCurveTo(13*s, -13*s, -3*s, -10*s);
    ctx.quadraticCurveTo(-12*s, -8*s, -10*s, 0); ctx.quadraticCurveTo(-12*s, 8*s, -3*s, 10*s);
    ctx.quadraticCurveTo(13*s, 13*s, 18*s, 0); ctx.closePath();
    const g = ctx.createLinearGradient(-8*s, -10*s, 12*s, 10*s); g.addColorStop(0,palette.light);g.addColorStop(1,palette.body);
    ctx.fillStyle=g;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=palette.dark;ctx.lineWidth=1.5*s;ctx.stroke();
    // Jaw and nostrils.
    ctx.beginPath();ctx.moveTo(2*s,0);ctx.lineTo(17*s,0);ctx.strokeStyle=palette.dark;ctx.lineWidth=1*s;ctx.stroke();
    for (const side of [-1,1]) {
      ctx.beginPath();ctx.arc(8*s,side*5*s,1.2*s,0,TAU);ctx.fillStyle=palette.dark;ctx.fill();
      ctx.beginPath();ctx.ellipse(0,side*6.8*s,4.8*s,3.8*s,0,0,TAU);ctx.fillStyle=palette.dark;ctx.fill();
      ctx.beginPath();ctx.arc(1.2*s,side*6.8*s,2.1*s,0,TAU);ctx.fillStyle=settings.eyeGlow?palette.glow:"#dce9dc";ctx.fill();
      ctx.beginPath();ctx.arc(1.8*s,side*6.8*s,.9*s,0,TAU);ctx.fillStyle="#07110e";ctx.fill();
    }
    ctx.restore();
  }

  function drawCreature() {
    const palette = palettes[settings.skin];
    const s = settings.scale;
    ctx.save();
    // Ground shadow.
    ctx.beginPath();ctx.ellipse(creature.x,creature.y+16*s,28*s,9*s,0,0,TAU);
    ctx.fillStyle="rgba(0,0,0,.24)";ctx.fill();
    // Four legs attach to front and rear body sections.
    const front = body[4], rear = body[13];
    drawLimb(front, front.angle + Math.PI/2, 20*s, 0, palette, 1);
    drawLimb(front, front.angle - Math.PI/2, 20*s, Math.PI, palette, -1);
    drawLimb(rear, rear.angle + Math.PI/2, 18*s, Math.PI/2, palette, 1);
    drawLimb(rear, rear.angle - Math.PI/2, 18*s, Math.PI*1.5, palette, -1);
    drawBody(palette);
    drawHead(palette);
    ctx.restore();
  }

  function drawHabitat() {
    ctx.clearRect(0, 0, width, height);
    // Quiet radial halo behind the creature.
    const p = palettes[settings.skin];
    const halo = ctx.createRadialGradient(creature.x, creature.y, 4, creature.x, creature.y, 170 * settings.scale);
    halo.addColorStop(0, settings.glow ? hexToRgba(p.glow, .075) : "rgba(0,0,0,0)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo; ctx.fillRect(0, 0, width, height);
    drawCreature();
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const n = parseInt(value, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  function frame(timestamp) {
    raf = requestAnimationFrame(frame);
    if (!lastTime) lastTime = timestamp;
    const rawDt = Math.min((timestamp - lastTime) / 1000, .04);
    lastTime = timestamp;
    if (!settings.paused && !document.hidden && !reducedMotion.matches) update(rawDt);
    else if (!settings.paused && !document.hidden && reducedMotion.matches) update(Math.min(rawDt, .016));
    drawHabitat();
    fpsFrames++;
    if (timestamp - lastFpsUpdate > 700) {
      const fps = Math.round(fpsFrames * 1000 / Math.max(1, timestamp - lastFpsUpdate));
      $("fpsReadout").textContent = `${fps} FPS`;
      fpsFrames = 0; lastFpsUpdate = timestamp;
    }
  }

  function setMode(mode) {
    settings.mode = mode;
    document.querySelectorAll(".mode-btn").forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    $("modeLabel").textContent = `${mode.toUpperCase()} MODE`;
    pointerActive = mode === "follow" || mode === "precision" ? pointerActive : false;
  }

  function bindControls() {
    $("speedControl").addEventListener("input", e => {
      settings.speed = Number(e.target.value);
      $("speedValue").textContent = `${settings.speed.toFixed(1)}×`;
    });
    $("scaleControl").addEventListener("input", e => {
      settings.scale = Number(e.target.value) / 100;
      $("scaleValue").textContent = `${e.target.value}%`;
    });
    $("sensitivityControl").addEventListener("input", e => {
      settings.sensitivity = Number(e.target.value) / 100;
      $("sensitivityValue").textContent = `${e.target.value}%`;
    });
    document.querySelectorAll(".mode-btn").forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
    document.querySelectorAll(".skin-btn").forEach(btn => btn.addEventListener("click", () => {
      settings.skin = btn.dataset.skin;
      document.querySelectorAll(".skin-btn").forEach(item => {
        const active = item === btn; item.classList.toggle("selected", active); item.setAttribute("aria-pressed", String(active));
      });
    }));
    $("glowToggle").addEventListener("change", e => settings.glow = e.target.checked);
    $("eyeToggle").addEventListener("change", e => settings.eyeGlow = e.target.checked);
    $("pauseButton").addEventListener("click", () => {
      settings.paused = !settings.paused;
      $("pauseIcon").textContent = settings.paused ? "▶" : "Ⅱ";
      $("pauseText").textContent = settings.paused ? "Resume creature" : "Pause creature";
      $("stateLabel").textContent = settings.paused ? "PAUSED" : "RUNNING";
    });
    $("resetButton").addEventListener("click", () => {
      creature.x = width * .5; creature.y = height * .52; creature.angle = 0; creature.vx = creature.vy = 0;
      seedBody(); hasInteracted = false; pointerActive = false; $("stageHint").classList.remove("hidden");
      pointer.targetX = width * .68; pointer.targetY = height * .5;
    });
  }

  document.addEventListener("visibilitychange", () => { lastTime = 0; });
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize, { passive: true });
  reducedMotion.addEventListener?.("change", () => { lastTime = 0; });

  bindControls();
  resize();
  raf = requestAnimationFrame(frame);
})();
