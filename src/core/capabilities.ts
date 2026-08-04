/**
 * Was der laufende Browser kann — abgefragt, nicht aus dem User-Agent geraten.
 */

/**
 * Kann dieser Browser die Farbfehlsicht-Korrektur darstellen?
 *
 * Sie braucht `filter: url(#…)` auf `<html>`. Firefox wendet SVG-Filter dort
 * nicht an (gemessen 04.08.2026 über chromium/firefox/webkit, Herleitung und
 * alle verworfenen Alternativen stehen im Kommentar in `styles/a11y.css`).
 * Auf `<body>` würde es funktionieren, bricht aber in allen drei Engines
 * `position: fixed`.
 *
 * Erkennung über `-moz-orient`: gemessen ausschließlich in Firefox unterstützt,
 * und als CSS-Eigenschaft in derselben Form auch in `a11y.css` abfragbar. So gibt
 * es **eine** Bedingung für Sperre und Hinweis, statt zwei, die auseinanderlaufen.
 *
 * Kein User-Agent-Test: der lügt, ist auf Mobilgeräten unzuverlässig und wäre bei
 * einem Firefox-Fork falsch.
 */
export function isCvdCorrectionSupported(): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return true;
  return !CSS.supports("-moz-orient", "inline");
}
