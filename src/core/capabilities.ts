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

/**
 * Kann dieser Browser das Panel über die native Popover-API zeigen?
 *
 * Zwei Bedingungen, und beide müssen stimmen: die DOM-Seite
 * (`HTMLElement.prototype.togglePopover`) **und** die CSS-Seite
 * (`selector(:popover-open)`). `panel.css` blendet das Panel mit
 * `:not(:popover-open)` aus und hat für Browser ohne diesen Selektor eine
 * eigene `@supports not selector(:popover-open)`-Regel. Wäre hier nur die
 * DOM-Seite abgefragt, könnten JavaScript und CSS verschiedener Meinung sein —
 * dann bliebe das Panel unsichtbar, obwohl der Knopf „offen" meldet.
 *
 * Betrifft praktisch Safari vor 17 (iPadOS 16, ältere iPhones): Dort fehlt die
 * API ganz, und `.gc-a11y-panel:not(:popover-open)` wird als ungültige Regel
 * verworfen — das Panel stand dauerhaft offen über der Seite (iPad, 22.10.2026).
 *
 * Auf dem Server gibt es weder `HTMLElement` noch `CSS`: dort `true`, weil das
 * serverseitige HTML dem entsprechen soll, was die Mehrheit der Browser kann.
 */
export function isPopoverSupported(): boolean {
  if (typeof HTMLElement === "undefined") return true;
  if (typeof HTMLElement.prototype.togglePopover !== "function") return false;
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return true;
  try {
    return CSS.supports("selector(:popover-open)");
  } catch {
    return false;
  }
}
