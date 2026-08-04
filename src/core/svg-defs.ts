import { CVD_FILTERS } from "./cvd-filters.js";

/**
 * Das <svg> mit den Filterdefinitionen, auf die `a11y.css` per
 * `filter: url(#gc-a11y-…)` verweist.
 *
 * Zwei Dinge daran sind nicht verhandelbar:
 *
 * 1. **`color-interpolation-filters="linearRGB"`.** Die Matrizen sind in
 *    linearem RGB gerechnet (siehe `tools/generate-cvd-filters.mjs`). Mit `sRGB`
 *    rechnet der Filter im gammakorrigierten Raum, und die Korrektur ist dann
 *    still falsch — sie sieht plausibel aus und trennt die Verwechslungsfarben
 *    nicht. `linearRGB` ist zwar der Standardwert, wird aber ausgeschrieben,
 *    damit es niemand „aufräumt".
 *
 * 2. **Nicht `display: none`.** Ein SVG mit `display: none` liefert in mehreren
 *    Engines keine auflösbaren Filterreferenzen — `filter: url(#…)` greift dann
 *    ins Leere und die Seite bleibt unverändert, ohne Fehlermeldung. Deshalb
 *    stattdessen aus dem Fluss genommen und auf Größe 0 gesetzt.
 *
 * Für den flackerfreien Start muss dieses SVG **serverseitig** im HTML stehen,
 * nicht per JavaScript nachgeschoben: sonst hat die Seite beim ersten Paint eine
 * Filterreferenz ohne Ziel. Die React-Fassung rendert es deshalb als JSX im
 * Layout (`src/react/A11yFilterDefs.tsx`); diese Zeichenkette ist für Seiten
 * ohne Build.
 */
export function cvdSvgMarkup(): string {
  const filters = CVD_FILTERS.map(
    (f) =>
      `<filter id="${f.id}" color-interpolation-filters="linearRGB">` +
      `<feColorMatrix type="matrix" values="${f.values.join(" ")}"/>` +
      `</filter>`,
  ).join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" ` +
    `width="0" height="0" ` +
    `style="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none">` +
    `<defs>${filters}</defs></svg>`
  );
}

/** Hängt die Definitionen einmalig an den Body. Nur für Seiten ohne Build. */
export function ensureCvdSvg(doc: Document = document): void {
  const MARKER = "gc-a11y-filter-defs";
  if (doc.getElementById(MARKER)) return;
  const host = doc.createElement("div");
  host.id = MARKER;
  host.setAttribute("aria-hidden", "true");
  host.innerHTML = cvdSvgMarkup();
  doc.body.appendChild(host);
}
