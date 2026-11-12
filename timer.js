// Cronômetro: contagem regressiva (descansos, aquecimento) e cronômetro progressivo.
// Usa horário absoluto (Date.now), então continua certo se a tela bloquear; o estado fica salvo no aparelho.
const Timer = (function () {
  const PRESETS = [30, 45, 60, 90, 120, 180, 300, 600];
  let key, st, tick = null, ctx = null, lock = null, open = false, flash = false;
  const now = () => Date.now();
  const rem = () => (st.run ? Math.max(0, st.end - now()) : st.left); // ms que faltam (modo timer)
  const el = () => st.acc + (st.run ? now() - st.t0 : 0); // ms decorridos (modo cronômetro)
  const mmss = (ms, up) => { const s = up ? Math.floor(ms / 1000) : Math.ceil(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const label = (s) => (s < 60 ? s + "s" : s / 60 + " min");
  const save = () => { try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) { /* sem armazenamento: o cronômetro só não sobrevive a recarregar */ } };

  // Áudio e tela ligada só podem ser liberados dentro de um toque do usuário.
  function unlock() {
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch (e) { /* sem áudio */ }
  }
  function keepAwake(on) {
    try {
      if (on && !lock && navigator.wakeLock) navigator.wakeLock.request("screen").then((l) => { lock = l; l.addEventListener("release", () => { lock = null; }); }, () => {});
      else if (!on && lock) { lock.release(); lock = null; }
    } catch (e) { /* tela pode apagar: o horário continua certo */ }
  }
  function beep() {
    try {
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + i * 0.35;
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
        o.start(t0); o.stop(t0 + 0.3);
      }
    } catch (e) { /* sem som: o aviso visual continua */ }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  }

  function finish(silent) {
    st.run = false; st.left = 0; save(); keepAwake(false);
    clearInterval(tick); tick = null;
    if (!silent) { flash = true; beep(); }
    draw();
  }
  function onTick() { if (st.mode === "t" && st.run && rem() === 0) finish(); else draw(); }
  function play() {
    unlock();
    if (st.run) { // pausar
      if (st.mode === "t") st.left = rem(); else st.acc = el();
      st.run = false; keepAwake(false); clearInterval(tick); tick = null;
    } else {
      flash = false;
      if (st.mode === "t") { if (st.left <= 0) st.left = st.dur; st.end = now() + st.left; } else st.t0 = now();
      st.run = true; keepAwake(true); tick = tick || setInterval(onTick, 250);
    }
    save(); draw();
  }
  function reset() { st.run = false; st.left = st.dur; st.acc = 0; flash = false; keepAwake(false); clearInterval(tick); tick = null; save(); draw(); }
  function go(sec) { // inicia uma contagem regressiva do zero
    unlock(); st.mode = "t"; st.dur = sec * 1000; st.left = st.dur; st.run = false; play();
  }

  function draw() {
    const nav = document.getElementById("tmnav"), box = document.getElementById("tmpanel");
    if (!nav) return;
    const t = st.mode === "t", ms = t ? rem() : el();
    const active = st.run || (t ? st.left !== st.dur : st.acc > 0);
    nav.querySelector("span").textContent = flash ? "Fim!" : active ? mmss(ms, !t) : "Timer";
    nav.classList.toggle("run", st.run); nav.classList.toggle("fim", flash);
    box.hidden = !open;
    if (!open) return;
    box.classList.toggle("fim", flash);
    document.getElementById("tmtime").textContent = flash ? "0:00" : mmss(ms, !t);
    document.getElementById("tmplay").textContent = st.run ? "Pausar" : active && !flash ? "Retomar" : "Iniciar";
    for (const b of box.querySelectorAll("[data-v=t],[data-v=c]")) { b.classList.toggle("sel", b.dataset.v === st.mode); b.setAttribute("aria-pressed", b.dataset.v === st.mode); }
    box.querySelector(".tmchips").hidden = !t;
    document.getElementById("tmadd").hidden = !t;
  }

  const act = {
    toggle: () => { open = !open; unlock(); },
    close: () => { open = false; },
    mode: (v) => { if (v !== st.mode) { reset(); st.mode = v; save(); } },
    go: (v) => go(+v),
    play, reset,
    add: (v) => { if (st.run) st.end += v * 1000; else st.left += v * 1000; save(); },
  };

  function init(storageKey) {
    key = storageKey;
    try { st = JSON.parse(localStorage.getItem(key)); } catch (e) { st = null; }
    if (!st || typeof st !== "object") st = { mode: "t", run: false, end: 0, left: 90000, dur: 90000, t0: 0, acc: 0 };
    document.getElementById("tmpanel").innerHTML = `<div class="tmbox">
      <div class="row"><div class="seg grow"><button data-tm="mode" data-v="t">Timer</button><button data-tm="mode" data-v="c">Cronômetro</button></div>
        <button data-tm="close" aria-label="Fechar cronômetro"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div id="tmtime" class="tmtime" role="timer">0:00</div>
      <div class="tmchips">${PRESETS.map((s) => `<button data-tm="go" data-v="${s}" aria-label="Contar ${label(s)}">${label(s)}</button>`).join("")}</div>
      <div class="row"><button id="tmplay" class="pri grow" data-tm="play">Iniciar</button><button id="tmadd" data-tm="add" data-v="15" aria-label="Somar 15 segundos">+15s</button><button data-tm="reset">Zerar</button></div></div>`;
    document.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-tm],[data-tm-go]");
      if (!b) return;
      if (b.dataset.tmGo) { const s = +b.dataset.tmGo; if (s > 0) go(s); } else act[b.dataset.tm](b.dataset.v);
      draw();
    });
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { if (st.run && st.mode === "t" && rem() === 0) finish(); else if (st.run) keepAwake(true); draw(); } });
    if (st.run) { if (st.mode === "t" && rem() === 0) { st.run = false; st.left = 0; save(); } else tick = setInterval(onTick, 250); }
    draw();
  }

  return { init, go };
})();
if (typeof module !== "undefined") module.exports = Timer;
