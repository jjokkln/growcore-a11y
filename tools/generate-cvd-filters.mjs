/**
 * Erzeugt die Farbmatrizen für die Farbfehlsicht-KORREKTUR (Daltonisierung)
 * und schreibt sie als TypeScript-Modul nach src/core/cvd-filters.ts.
 *
 * Warum gerechnet und nicht abgeschrieben: Die Matrizen, die man im Netz findet,
 * sind teils Simulations- und teils Korrekturmatrizen, teils in sRGB und teils
 * in linearem RGB, und die Quellen widersprechen sich. Hier steht der Weg, also
 * ist das Ergebnis prüfbar — und die Prüfungen unten fallen um, wenn jemand an
 * einer Zahl dreht.
 *
 *   node tools/generate-cvd-filters.mjs
 *
 * ── Verfahren ──────────────────────────────────────────────────────────────
 *
 * 1. Simulation nach Viénot, Brettel & Mollon (1999) im LMS-Raum. Lineares RGB
 *    wird über die Hunt-Pointer-Estevez-Matrix nach LMS gebracht, dort wird der
 *    fehlende Zapfentyp aus den beiden anderen rekonstruiert, dann zurück.
 * 2. Daltonisierung nach Fidaner, Lin & Ozgüven: Die Differenz zwischen
 *    Original und Simulation ist der Farbanteil, den die Person nicht sieht.
 *    Dieser Fehler wird auf Kanäle umgelegt, die sie sehen kann (Rot-Grün-Fehler
 *    wandert nach Blau/Gelb).
 * 3. Beides ist linear, lässt sich also zu EINER 3×3-Matrix zusammenfalten:
 *
 *        D = I + s · E · (I − S)
 *
 *    mit S = Simulation, E = Umlegung, s = Stärke 0..1. Ergebnis pro Typ und
 *    Stärke: ein einziges <feColorMatrix>, keine Filterkette.
 *
 * Wichtig für die Anwendung: Die Rechnung gilt in LINEAREM RGB. Das SVG braucht
 * deshalb `color-interpolation-filters="linearRGB"` (ist der Standard, wird aber
 * ausgeschrieben, weil ein `sRGB` an dieser Stelle die Korrektur unbemerkt
 * falsch macht).
 */

import { writeFileSync } from "node:fs";

// ── Matrix-Grundrechenarten (3×3, zeilenweise) ─────────────────────────────
const I3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const mul = (A, B) =>
  A.map((row, i) => B[0].map((_, j) => row.reduce((s, _v, k) => s + A[i][k] * B[k][j], 0)));
const add = (A, B) => A.map((row, i) => row.map((v, j) => v + B[i][j]));
const sub = (A, B) => A.map((row, i) => row.map((v, j) => v - B[i][j]));
const scale = (A, s) => A.map((row) => row.map((v) => v * s));
const apply = (A, v) => A.map((row) => row.reduce((s, m, k) => s + m * v[k], 0));

// ── Lineares RGB <-> LMS (Hunt-Pointer-Estevez, wie bei Fidaner et al.) ────
const RGB_TO_LMS = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];
const LMS_TO_RGB = [
  [0.0809444479, -0.130504409, 0.116721066],
  [-0.0102485335, 0.0540193266, -0.113614708],
  [-0.000365296938, -0.00412161469, 0.693511405],
];

/**
 * Die fehlende Zapfenantwort wird aus den beiden vorhandenen rekonstruiert.
 * Die Koeffizienten stammen aus der Projektion auf die jeweilige
 * Verwechslungsebene (Viénot 1999).
 */
const SIM_LMS = {
  // Protanopie: L fehlt, wird aus M und S geschätzt.
  protan: [
    [0, 2.02344, -2.52581],
    [0, 1, 0],
    [0, 0, 1],
  ],
  // Deuteranopie: M fehlt.
  deutan: [
    [1, 0, 0],
    [0.494207, 0, 1.24827],
    [0, 0, 1],
  ],
  // Tritanopie: S fehlt.
  tritan: [
    [1, 0, 0],
    [0, 1, 0],
    [-0.395913, 0.801109, 0],
  ],
};

/**
 * Umlegung des nicht wahrnehmbaren Fehlers.
 *
 * Für Protan/Deutan (Rot-Grün) wandert der Rot-Fehler nach Grün UND Blau —
 * dadurch entsteht ein Blau-Gelb-Unterschied, den auch ein Rot-Grün-Blinder
 * sicher trennt. Für Tritan (Blau-Gelb) ist es umgekehrt: der Blau-Fehler
 * wandert nach Rot und Grün.
 */
const SHIFT = {
  protan: [
    [0, 0, 0],
    [0.7, 1, 0],
    [0.7, 0, 1],
  ],
  deutan: [
    [0, 0, 0],
    [0.7, 1, 0],
    [0.7, 0, 1],
  ],
  tritan: [
    [1, 0, 0.7],
    [0, 1, 0.7],
    [0, 0, 0],
  ],
};

/** Simulationsmatrix im linearen RGB-Raum. */
function simRgb(type) {
  return mul(LMS_TO_RGB, mul(SIM_LMS[type], RGB_TO_LMS));
}

/** D = I + s · E · (I − S) */
function daltonize(type, strength) {
  const S = simRgb(type);
  return add(I3, scale(mul(SHIFT[type], sub(I3, S)), strength));
}

// ── Prüfungen: fallen um, wenn an den Zahlen gedreht wird ──────────────────
function check(name, condition, detail) {
  if (!condition) {
    console.error(`FEHLGESCHLAGEN: ${name}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
  } else {
    console.log(`  ok   ${name}`);
  }
}

console.log("Prüfungen:");

const WHITE = [1, 1, 1];
for (const type of Object.keys(SIM_LMS)) {
  // Neutrale Farben dürfen sich NICHT verfärben. Formal: S·weiß = weiß, also
  // (I−S)·weiß = 0, also D·weiß = weiß. Eine Korrektur, die Grau einfärbt, ist
  // falsch — und das ist der Fehler, den man am fertigen Filter zuerst sieht.
  const simWhite = apply(simRgb(type), WHITE);
  check(
    `${type}: Simulation lässt Weiß neutral`,
    simWhite.every((v) => Math.abs(v - 1) < 0.02),
    `sim(weiß) = [${simWhite.map((v) => v.toFixed(4))}]`,
  );

  const dalWhite = apply(daltonize(type, 1), WHITE);
  check(
    `${type}: Korrektur lässt Weiß neutral`,
    dalWhite.every((v) => Math.abs(v - 1) < 0.02),
    `D(weiß) = [${dalWhite.map((v) => v.toFixed(4))}]`,
  );

  // Stärke 0 muss die Identität sein, sonst wäre "aus" nicht wirklich aus.
  const zero = daltonize(type, 0);
  check(
    `${type}: Stärke 0 ist die Identität`,
    zero.every((row, i) => row.every((v, j) => Math.abs(v - I3[i][j]) < 1e-12)),
  );
}

/**
 * Die eigentliche Nutzenprüfung — und der Grund, warum die Paare KONSTRUIERT
 * und nicht ausgedacht werden.
 *
 * Der erste Entwurf hat für Protanopie ein Paar geraten (Rot gegen Oliv) und der
 * Test fiel um: Abstand vorher 0,38, nachher 0,44 — Faktor 1,14. Nicht die
 * Matrix war schlecht, das Paar war keins. Zwei Farben, die eine betroffene
 * Person schon vorher gut unterscheidet, können durch eine Korrektur nichts
 * gewinnen. Der Test hätte mit einem lockeren Schwellwert genauso „grün"
 * gemeldet und dabei gar nichts geprüft.
 *
 * Richtig ist, das Paar aus der Definition zu erzeugen: Verwechselt werden genau
 * die Farben, die sich NUR im fehlenden Zapfensignal unterscheiden. Also im
 * LMS-Raum den betroffenen Kanal variieren und den Rest festhalten. Dann prüft
 * der Test zwei Dinge statt einem — dass das Paar wirklich verwechselt wird
 * (`vorher` nahe 0), und dass die Korrektur es trennt.
 */
const MISSING_CHANNEL = { protan: 0, deutan: 1, tritan: 2 };
const inGamut = (c) => c.every((v) => v >= 0.02 && v <= 0.98);
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

/** Zwei Farben, die sich ausschließlich im fehlenden Kanal unterscheiden. */
function confusionPair(type, base = [0.55, 0.42, 0.38]) {
  const c = MISSING_CHANNEL[type];
  const lms = apply(RGB_TO_LMS, base);
  // Größtmöglicher Unterschied, der beide Farben im darstellbaren Bereich hält.
  for (let delta = 0.6; delta > 0.02; delta -= 0.01) {
    const a = [...lms];
    const b = [...lms];
    a[c] = lms[c] * (1 - delta);
    b[c] = lms[c] * (1 + delta);
    const rgbA = apply(LMS_TO_RGB, a);
    const rgbB = apply(LMS_TO_RGB, b);
    if (inGamut(rgbA) && inGamut(rgbB)) return [rgbA, rgbB, delta];
  }
  return null;
}

for (const type of Object.keys(SIM_LMS)) {
  const pair = confusionPair(type);
  check(`${type}: Verwechslungspaar konstruierbar`, pair !== null);
  if (!pair) continue;

  const [c1, c2] = pair;
  const S = simRgb(type);
  const D = daltonize(type, 1);

  // Kontrolle 1: Für einen Sehenden liegen die Farben deutlich auseinander …
  const normal = dist(c1, c2);
  check(
    `${type}: Paar ist für Normalsichtige unterscheidbar`,
    normal > 0.05,
    `Abstand ${normal.toFixed(4)}`,
  );

  // Kontrolle 2: … für die betroffene Person aber praktisch nicht. Ohne diese
  // Prüfung misst der Test unten nichts.
  const before = dist(apply(S, c1), apply(S, c2));
  check(
    `${type}: Paar wird tatsächlich verwechselt`,
    before < 0.02,
    `simulierter Abstand ${before.toFixed(5)} (muss ≈ 0 sein)`,
  );

  // Die eigentliche Aussage: Korrektur anwenden, DANN simulieren.
  const after = dist(apply(S, apply(D, c1)), apply(S, apply(D, c2)));
  check(
    `${type}: Korrektur macht das Paar unterscheidbar`,
    after > 0.05,
    `simulierter Abstand vorher ${before.toFixed(5)}, nachher ${after.toFixed(4)}`,
  );
}

// ── Ausgabe ────────────────────────────────────────────────────────────────
/**
 * Vier Stufen, weil die Filter STATISCH sein müssen: das `values`-Attribut
 * eines <feColorMatrix> ist keine CSS-Eigenschaft und kann daher keine
 * CSS-Variable lesen. Ein stufenloser Regler bräuchte JavaScript, das die
 * Matrix zur Laufzeit einträgt — und das liefe erst nach der Hydration, also
 * mit einem sichtbaren Farbsprung bei jedem Seitenaufruf. Vier vorgerechnete
 * Stufen sind deklarativ, flackerfrei und ausreichend.
 *
 * Stufe 0 ist die volle Korrektur und damit der Standardfall. Anomalien
 * (Deuteranomalie ist weit häufiger als echte Dichromasie) kommen mit einer
 * schwächeren Stufe meist besser zurecht.
 */
const STRENGTHS = [
  { index: 0, value: 1, label: "voll" },
  { index: 1, value: 0.75, label: "stark" },
  { index: 2, value: 0.5, label: "mittel" },
  { index: 3, value: 0.25, label: "leicht" },
];

const round = (v) => {
  const r = Number(v.toFixed(5));
  return Object.is(r, -0) ? 0 : r;
};

const filters = [];
for (const type of ["protan", "deutan", "tritan"]) {
  for (const s of STRENGTHS) {
    const M = daltonize(type, s.value);
    // feColorMatrix erwartet 4 Zeilen à 5 Werte: [R G B A Offset].
    const values = [
      ...M[0].map(round), 0, 0,
      ...M[1].map(round), 0, 0,
      ...M[2].map(round), 0, 0,
      0, 0, 0, 1, 0,
    ];
    filters.push({
      id: s.index === 0 ? `gc-a11y-${type}` : `gc-a11y-${type}-${s.index}`,
      type,
      strengthIndex: s.index,
      strength: s.value,
      label: s.label,
      values,
    });
  }
}

const out = `/**
 * ERZEUGT — nicht von Hand bearbeiten.
 * Quelle: tools/generate-cvd-filters.mjs (dort steht die Herleitung und die
 * Prüfungen). Neu erzeugen mit: node tools/generate-cvd-filters.mjs
 *
 * Farbfehlsicht-KORREKTUR (Daltonisierung), nicht Simulation. Verfahren:
 * Simulation nach Viénot/Brettel/Mollon 1999 im LMS-Raum, Fehlerumlegung nach
 * Fidaner/Lin/Ozgüven, zu einer Matrix zusammengefaltet.
 *
 * Die Rechnung gilt in LINEAREM RGB — das <svg> muss deshalb
 * color-interpolation-filters="linearRGB" tragen.
 */

export type CvdFilter = {
  /** DOM-id, auf die a11y.css per filter: url(#…) verweist. */
  id: string;
  type: "protan" | "deutan" | "tritan";
  /** 0 = volle Korrektur (Standard), 3 = leicht. */
  strengthIndex: number;
  strength: number;
  /** Deutsche Beschriftung für das Panel. */
  label: string;
  /** Die 20 Werte für <feColorMatrix values="…">. */
  values: readonly number[];
};

export const CVD_FILTERS: readonly CvdFilter[] = ${JSON.stringify(filters, null, 2)
  .replace(/"(\w+)":/g, "$1:")
  .replace(/\n/g, "\n")} as const;

/** Die id, die zu Typ und Stärke gehört — dieselbe Logik wie in a11y.css. */
export function cvdFilterId(type: string, strengthIndex: number): string {
  return strengthIndex === 0 ? \`gc-a11y-\${type}\` : \`gc-a11y-\${type}-\${strengthIndex}\`;
}
`;

writeFileSync(new URL("../src/core/cvd-filters.ts", import.meta.url), out);
console.log(`\n${filters.length} Filter geschrieben nach src/core/cvd-filters.ts`);
