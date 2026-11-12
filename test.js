// Rodar: node test.js
const assert = require("assert");
const L = require("./logic.js");

assert.strictEqual(L.nextTreino([], "2026-11-09"), "A");
assert.strictEqual(L.nextTreino([{ d: "2026-11-09", t: "A", kg: { x: 1 } }], "2026-11-11"), "B");
assert.strictEqual(L.nextTreino([{ d: "2026-11-13", t: "C", kg: { x: 1 } }], "2026-11-16"), "A");
assert.strictEqual(L.nextTreino([{ d: "2026-11-09", t: "A", kg: { x: 1 } }], "2026-11-09"), "A"); // em andamento

assert.strictEqual(L.suggestUp([]), false);
assert.strictEqual(L.suggestUp([20]), false);
assert.strictEqual(L.suggestUp([20, 20]), true);
assert.strictEqual(L.suggestUp([20, 20, 22.5]), false);

let s = [];
L.upsert(s, "2026-11-09", "A", "leg", 60);
L.upsert(s, "2026-11-09", "A", "goblet", 16);
assert.deepStrictEqual(s, [{ d: "2026-11-09", t: "A", kg: { leg: 60, goblet: 16 } }]);
L.upsert(s, "2026-11-09", "A", "leg", 65); // atualiza
assert.strictEqual(s[0].kg.leg, 65);
L.upsert(s, "2026-11-09", "A", "leg", null);
L.upsert(s, "2026-11-09", "A", "goblet", null);
assert.deepStrictEqual(s, []); // sessão vazia some
assert.deepStrictEqual(L.history([{ kg: { a: 1 } }, { kg: {} }, { kg: { a: 2 } }], "a"), [1, 2]);

const good = { sessions: [{ d: "2026-11-09", t: "A", kg: { leg: 60, plank: 0 } }], bodyweight: [{ d: "2026-11-09", v: 65.2 }], waist: [{ d: "2026-11-09", v: 75 }] };
assert.strictEqual(L.validBackup(good), true);
assert.strictEqual(L.validBackup({ sessions: [], bodyweight: [] }), true);
assert.strictEqual(L.validBackup(null), false);
assert.strictEqual(L.validBackup({ sessions: [], bodyweight: [], waist: [{ d: "2026-11-09", v: "x" }] }), false);
assert.strictEqual(L.validBackup({ sessions: [{ d: "x" }], bodyweight: [] }), false); // sem kg, data torta
assert.strictEqual(L.validBackup({ sessions: [{ d: "2026-11-09", t: "Z", kg: {} }], bodyweight: [] }), false);
assert.strictEqual(L.validBackup({ sessions: [{ d: "2026-11-09", t: "A", kg: { leg: "<img>" } }], bodyweight: [] }), false);
assert.strictEqual(L.validBackup({ sessions: [], bodyweight: [{ d: "<b>", v: 65 }] }), false);

assert.strictEqual(L.daysBetween("2026-11-07", "2026-11-07"), 0);
assert.strictEqual(L.daysBetween("2026-10-08", "2026-11-07"), 30);
assert.strictEqual(L.daysBetween("2026-03-01", "2026-03-31"), 30); // sem erro de horário de verão

assert.strictEqual(L.weeksSince([], "2026-11-08"), 0);
assert.strictEqual(L.weeksSince([{ d: "2026-11-08" }], "2026-11-08"), 1);
assert.strictEqual(L.weeksSince([{ d: "2026-11-15" }, { d: "2026-09-13" }], "2026-11-08"), 9); // 56 dias = 8 semanas completas, já na 9ª; usa a data mais antiga
assert.strictEqual(L.stalled([20, 20]), false);
assert.strictEqual(L.stalled([18, 20, 20, 20]), true);
assert.strictEqual(L.stalled([20, 20, 22.5]), false);
assert.strictEqual(L.shouldChange(7, 9), false);
assert.strictEqual(L.shouldChange(8, 2), false);
assert.strictEqual(L.shouldChange(8, 3), true);
assert.strictEqual(L.shouldChange(12, 0), true);
assert.deepStrictEqual(L.monthCells(2026, 10), { lead: 0, n: 30 }); // nov/2026 começa no domingo
assert.deepStrictEqual(L.monthCells(2024, 1), { lead: 4, n: 29 }); // fev/2024 (bissexto) começa na quinta
assert.deepStrictEqual(L.monthCells(2026, 11), { lead: 2, n: 31 }); // dez/2026 começa na terça

// notas e relatório
assert.strictEqual(L.validBackup({ sessions: [], bodyweight: [], notes: { "2026-11-09A": "ok" }, xn: { smith: { tags: ["Dor"], txt: "", d: "2026-11-09" } } }), true);
assert.strictEqual(L.validBackup({ sessions: [], bodyweight: [], notes: { "2026-11-09A": 5 } }), false);
assert.strictEqual(L.validBackup({ sessions: [], bodyweight: [], xn: { smith: { tags: "Dor", txt: "" } } }), false);
const nd = { notes: { "2026-11-02A": "velha", "2026-11-09B": "nova" }, xn: { a: { tags: [], txt: "x", d: "2026-11-09" }, b: { tags: [], txt: "", d: "2026-11-09" } } };
assert.strictEqual(L.notesSince(nd, undefined), 3); // b está vazia e não conta
assert.strictEqual(L.notesSince(nd, "2026-11-05"), 2);
assert.strictEqual(L.notesSince({}, undefined), 0);
const W = { A: { n: "Pernas", ex: [{ id: "g", n: "Smith", a: "3x10" }, { id: "p", n: "Esteira", a: "15 min", bw: 1 }] }, B: { n: "Sup", ex: [] }, C: { n: "Post", ex: [] } };
const rdb = { sessions: [1, 2, 3].map((i) => ({ d: "2026-11-0" + i, t: "A", kg: { g: 30, p: 0 } })), bodyweight: [{ d: "2026-11-01", v: 65 }, { d: "2026-11-08", v: 64.4 }], waist: [{ d: "2026-11-01", v: 75 }, { d: "2026-11-08", v: 74.5 }],
  xn: { g: { tags: ["Dor"], txt: "joelho", d: "2026-11-09" }, velho: { tags: ["Dor"], txt: "", d: "2026-11-09" } }, notes: { "2026-11-03A": "difícil" } };
const rep = L.report(rdb, W, "2026-11-09", "PERFIL");
assert.ok(rep.includes("- Smith (kg): 30 → 30 → 30 (parado)"));
assert.ok(rep.includes("- Smith [Dor]: joelho"));
assert.ok(!rep.includes("velho") && !rep.includes("Esteira:")); // exercício removido e exercício sem carga ficam de fora
assert.ok(rep.includes("PESO CORPORAL (kg): 65 → 64,4") && rep.includes("CINTURA (cm): 75 → 74,5") && rep.includes("- 2026-11-03 (treino A): difícil") && rep.includes("TREINOS NAS ÚLTIMAS 6 SEMANAS: 3 (A: 3, B: 0, C: 0)"));

// treino extra (K) e cronômetro
assert.strictEqual(L.nextTreino([{ d: "2026-11-09", t: "A", kg: { x: 1 } }, { d: "2026-11-10", t: "K", kg: { x: 1 } }], "2026-11-11"), "B"); // K não pula a sequência
assert.strictEqual(L.nextTreino([{ d: "2026-11-09", t: "A", kg: { x: 1 } }, { d: "2026-11-09", t: "K", kg: { x: 1 } }], "2026-11-09"), "A"); // K no mesmo dia: segue em A
assert.strictEqual(L.nextTreino([{ d: "2026-11-10", t: "K", kg: { x: 1 } }], "2026-11-11"), "A");
assert.strictEqual(L.validBackup({ sessions: [{ d: "2026-11-09", t: "K", kg: { pushup: 12 } }], bodyweight: [] }), true);
assert.strictEqual(L.validBackup({ sessions: [{ d: "2026-11-09", t: "F", kg: {} }], bodyweight: [] }), false);
assert.deepStrictEqual(["90s", "2 min", "60s leve", "3 min leve", "45s", "ritmo leve", "", undefined].map(L.restSecs), [90, 120, 60, 180, 45, null, null, null]);
const rw = { A: { n: "P", ex: [{ id: "m", n: "Flexão", a: "x", u: "reps" }] }, K: { n: "Cali", ex: [] } };
const rr = L.report({ sessions: [1, 2].map((i) => ({ d: "2026-11-0" + i, t: "K", kg: { m: 12 } })), bodyweight: [] }, rw, "2026-11-09", "P");
assert.ok(rr.includes("- Flexão (reps): 12 → 12") && rr.includes("K (Cali)") && rr.includes("K: 2"));

console.log("ok");
