/**
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

export const CVD_FILTERS: readonly CvdFilter[] = [
  {
    id: "gc-a11y-protan",
    type: "protan",
    strengthIndex: 0,
    strength: 1,
    label: "voll",
    values: [
      1,
      0,
      0,
      0,
      0,
      0.50895,
      0.49105,
      0,
      0,
      0,
      0.61733,
      -0.61732,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-protan-1",
    type: "protan",
    strengthIndex: 1,
    strength: 0.75,
    label: "stark",
    values: [
      1,
      0,
      0,
      0,
      0,
      0.38171,
      0.61829,
      0,
      0,
      0,
      0.46299,
      -0.46299,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-protan-2",
    type: "protan",
    strengthIndex: 2,
    strength: 0.5,
    label: "mittel",
    values: [
      1,
      0,
      0,
      0,
      0,
      0.25447,
      0.74553,
      0,
      0,
      0,
      0.30866,
      -0.30866,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-protan-3",
    type: "protan",
    strengthIndex: 3,
    strength: 0.25,
    label: "leicht",
    values: [
      1,
      0,
      0,
      0,
      0,
      0.12724,
      0.87276,
      0,
      0,
      0,
      0.15433,
      -0.15433,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-deutan",
    type: "deutan",
    strengthIndex: 0,
    strength: 1,
    label: "voll",
    values: [
      1,
      0,
      0,
      0,
      0,
      0.20232,
      0.79767,
      0,
      0,
      0,
      0.51741,
      -0.51741,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-deutan-1",
    type: "deutan",
    strengthIndex: 1,
    strength: 0.75,
    label: "stark",
    values: [
      1,
      0,
      0,
      0,
      0,
      0.15174,
      0.84826,
      0,
      0,
      0,
      0.38806,
      -0.38806,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-deutan-2",
    type: "deutan",
    strengthIndex: 2,
    strength: 0.5,
    label: "mittel",
    values: [
      1,
      0,
      0,
      0,
      0,
      0.10116,
      0.89884,
      0,
      0,
      0,
      0.25871,
      -0.25871,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-deutan-3",
    type: "deutan",
    strengthIndex: 3,
    strength: 0.25,
    label: "leicht",
    values: [
      1,
      0,
      0,
      0,
      0,
      0.05058,
      0.94942,
      0,
      0,
      0,
      0.12935,
      -0.12935,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-tritan",
    type: "tritan",
    strengthIndex: 0,
    strength: 1,
    label: "voll",
    values: [
      3.61435,
      -2.61438,
      0,
      0,
      0,
      1.61435,
      -0.61437,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-tritan-1",
    type: "tritan",
    strengthIndex: 1,
    strength: 0.75,
    label: "stark",
    values: [
      2.96076,
      -1.96079,
      0,
      0,
      0,
      1.21076,
      -0.21078,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-tritan-2",
    type: "tritan",
    strengthIndex: 2,
    strength: 0.5,
    label: "mittel",
    values: [
      2.30717,
      -1.30719,
      0,
      0,
      0,
      0.80717,
      0.19281,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  },
  {
    id: "gc-a11y-tritan-3",
    type: "tritan",
    strengthIndex: 3,
    strength: 0.25,
    label: "leicht",
    values: [
      1.65359,
      -0.6536,
      0,
      0,
      0,
      0.40359,
      0.59641,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]
  }
] as const;

/** Die id, die zu Typ und Stärke gehört — dieselbe Logik wie in a11y.css. */
export function cvdFilterId(type: string, strengthIndex: number): string {
  return strengthIndex === 0 ? `gc-a11y-${type}` : `gc-a11y-${type}-${strengthIndex}`;
}
