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

console.log("ok");
