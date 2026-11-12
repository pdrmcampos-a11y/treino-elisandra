// Lógica pura (sem DOM) para poder testar no Node.
(function (root) {
  const ORDER = ["A", "B", "C"]; // ciclo de musculação
  const ALL = [...ORDER, "K"]; // K = calistenia: treino extra, fora do ciclo

  // Treino do dia: o que já está em andamento hoje, senão o próximo da sequência A→B→C.
  function nextTreino(sessions, today) {
    const last = sessions.filter((s) => ORDER.includes(s.t)).pop(); // treinos extras não mexem na sequência
    if (!last) return "A";
    if (last.d === today) return last.t;
    return ORDER[(ORDER.indexOf(last.t) + 1) % ORDER.length];
  }

  // Cargas registradas de um exercício, da mais antiga para a mais recente.
  function history(sessions, id) {
    return sessions.filter((s) => s.kg[id] != null).map((s) => s.kg[id]);
  }

  // Mesma carga nas duas últimas vezes → hora de subir (dupla progressão).
  function suggestUp(h) {
    return h.length >= 2 && h[h.length - 1] === h[h.length - 2];
  }

  // Grava (ou remove, se kg == null) a carga de um exercício na sessão do dia/treino.
  function upsert(sessions, d, t, id, kg) {
    let s = sessions.find((x) => x.d === d && x.t === t);
    if (kg == null) {
      if (!s) return sessions;
      delete s.kg[id];
      if (!Object.keys(s.kg).length) sessions.splice(sessions.indexOf(s), 1); // in place: o app ignora o retorno
      return sessions;
    }
    if (!s) { s = { d, t, kg: {} }; sessions.push(s); }
    s.kg[id] = kg;
    return sessions;
  }

  // Backup colado pelo usuário: só aceita o formato exato (um backup torto deixaria o app em branco).
  const okDate = (d) => typeof d === "string" && /^\d{4}-\d\d-\d\d$/.test(d);
  function validBackup(o) {
    return !!o && Array.isArray(o.sessions) && Array.isArray(o.bodyweight)
      && o.sessions.every((s) => s && okDate(s.d) && ALL.includes(s.t) && s.kg && typeof s.kg === "object"
        && Object.values(s.kg).every(Number.isFinite))
      && [o.bodyweight, o.waist || []].every((l) => Array.isArray(l) && l.every((e) => e && okDate(e.d) && Number.isFinite(e.v)))
      && (o.notes === undefined || (!!o.notes && typeof o.notes === "object" && Object.values(o.notes).every((v) => typeof v === "string")))
      && (o.xn === undefined || (!!o.xn && typeof o.xn === "object" && Object.values(o.xn).every((v) => v && Array.isArray(v.tags) && v.tags.every((g) => typeof g === "string") && typeof v.txt === "string")));
  }

  // Dias entre duas datas "YYYY-MM-DD" (ambas lidas em UTC, então a conta é exata).
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

  // Semana do ciclo: 1 na semana do primeiro treino registrado (0 se ainda não há treino).
  const weeksSince = (sessions, today) =>
    sessions.length ? Math.floor(daysBetween(sessions.map((s) => s.d).sort()[0], today) / 7) + 1 : 0;

  // Parado = mesma carga nos 3 últimos treinos do exercício.
  const stalled = (h) => h.length >= 3 && h[h.length - 1] === h[h.length - 2] && h[h.length - 2] === h[h.length - 3];

  // Hora de trocar o ciclo: 12 semanas, ou 8+ semanas com 3+ exercícios parados.
  const shouldChange = (weeks, nStalled) => weeks >= 12 || (weeks >= 8 && nStalled >= 3);

  // Calendário: lead = dia da semana do dia 1 (0 = domingo), n = quantos dias o mês (m: 0-11) tem.
  const monthCells = (y, m) => ({ lead: new Date(Date.UTC(y, m, 1)).getUTCDay(), n: new Date(Date.UTC(y, m + 1, 0)).getUTCDate() });

  const f = (n) => String(n).replace(".", ",");

  // Notas ainda não enviadas num relatório. db.notes: {"AAAA-MM-DD"+treino: texto}; db.xn: {exercício: {tags, txt, d}}; last: data do último relatório.
  function notesSince(db, last) {
    const n = Object.keys(db.notes || {}).filter((k) => db.notes[k] && (!last || k.slice(0, 10) > last)).length;
    const x = Object.values(db.xn || {}).filter((v) => v && (v.txt || v.tags.length) && (!last || v.d > last)).length;
    return n + x;
  }

  // Texto para colar no chat: programa atual, cargas, treinos feitos e notas, para revisar o treino.
  function report(db, W, today, perfil) {
    const ex = Object.values(W).flatMap((w) => w.ex), byId = (id) => ex.find((e) => e.id === id);
    const recent = db.sessions.filter((s) => daysBetween(s.d, today) <= 42);
    const L = [`RELATÓRIO DE TREINO · ${today} · semana ${weeksSince(db.sessions, today)} do ciclo`, perfil, "", "PROGRAMA ATUAL"];
    for (const k of Object.keys(W)) L.push(`${k} (${W[k].n}): ` + W[k].ex.map((e) => `${e.n} ${e.a}`).join("; "));
    L.push("", `TREINOS NAS ÚLTIMAS 6 SEMANAS: ${recent.length} (` + Object.keys(W).map((k) => `${k}: ${recent.filter((s) => s.t === k).length}`).join(", ") + ")", "", "REGISTROS (kg, ou a unidade indicada; do mais antigo para o mais recente)");
    for (const e of ex) {
      const h = history(db.sessions, e.id);
      if (!e.bw && h.length) L.push(`- ${e.n} (${e.u || "kg"}): ${h.slice(-6).map(f).join(" → ")}${!e.nu && stalled(h) ? " (parado)" : ""}`);
    }
    for (const [k, nome, u] of [["bodyweight", "PESO CORPORAL", "kg"], ["waist", "CINTURA", "cm"]]) {
      if ((db[k] || []).length) L.push("", `${nome} (${u}): ` + db[k].slice(-6).map((e) => f(e.v)).join(" → "));
    }
    const xs = Object.keys(db.xn || {}).filter((id) => byId(id) && (db.xn[id].txt || db.xn[id].tags.length));
    if (xs.length) {
      L.push("", "NOTAS POR EXERCÍCIO");
      for (const id of xs) { const x = db.xn[id]; L.push(`- ${byId(id).n}${x.tags.length ? " [" + x.tags.join(", ") + "]" : ""}${x.txt ? ": " + x.txt : ""}`); }
    }
    const ns = Object.keys(db.notes || {}).filter((k) => db.notes[k]).sort();
    if (ns.length) { L.push("", "NOTAS DOS TREINOS"); for (const k of ns.slice(-12)) L.push(`- ${k.slice(0, 10)} (treino ${k[10]}): ${db.notes[k]}`); }
    L.push("", "Com base nisso, revise meu programa (exercícios, séries, cargas, descanso) com base científica e diga o que mudar e por quê.");
    return L.join("\n");
  }

  // Segundos de um descanso escrito como "90s", "2 min" ou "60s leve"; null se não for um tempo ("ritmo leve").
  const restSecs = (r) => { const m = /^(\d+)\s*(min|s)\b/.exec(r || ""); return m ? +m[1] * (m[2] === "min" ? 60 : 1) : null; };

  const api = { ORDER, ALL, restSecs, nextTreino, history, suggestUp, upsert, validBackup, daysBetween, weeksSince, stalled, shouldChange, monthCells, notesSince, report };
  if (typeof module !== "undefined") module.exports = api;
  else root.Logic = api;
})(typeof self !== "undefined" ? self : this);
