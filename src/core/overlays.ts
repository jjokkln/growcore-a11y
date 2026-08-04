import { SCHEMA } from "./schema.js";

/**
 * Das einzige Stück Laufzeit-JavaScript, das die Effekte brauchen: die Position
 * von Lesemaske und Leselineal.
 *
 * Alles andere in diesem Paket ist deklarativ — Attribute auf `<html>`, statisches
 * CSS. Diese zwei Lesehilfen können das nicht sein, weil sie dem Nutzer folgen
 * müssen. Geschrieben wird genau **eine** CSS-Variable, `--a11y-mask-y`; die
 * Verläufe mit ihren harten Stopps stehen in `a11y.css`.
 *
 * Drei Entscheidungen, die man sonst falsch macht:
 *
 * 1. **Der Fokus zählt genauso wie der Zeiger.** Eine Lesemaske, die nur der Maus
 *    folgt, ist für Tastaturnutzer eine Verdunkelung ohne Fenster — also genau
 *    für die Gruppe unbrauchbar, die sie am ehesten braucht. `focusin` bewegt das
 *    Band deshalb mit.
 *
 * 2. **Kein `transition` auf der Position, und das ist Absicht.** Eine
 *    nachlaufende Maske ist für Menschen mit Aufmerksamkeits- oder
 *    Wahrnehmungsstörungen ein Ärgernis, nicht ein Effekt. Das Band sitzt sofort
 *    da, wo gelesen wird.
 *
 * 3. **Gebündelt über `requestAnimationFrame`.** `pointermove` feuert bis zu
 *    einmal pro Mausbewegung; ohne Bündelung würde pro Ereignis ein Style-Write
 *    und damit ein Layout-Durchlauf entstehen. So gibt es höchstens einen
 *    Schreibvorgang je Bildaufbau.
 */

const MASK_VAR = "--a11y-mask-y";

type Cleanup = () => void;

let active: Cleanup | null = null;

function needsPointerTracking(root: HTMLElement): boolean {
  return (
    root.hasAttribute(SCHEMA.readingMask.attr) || root.hasAttribute(SCHEMA.readingRuler.attr)
  );
}

/**
 * Hängt die Verfolgung an oder ab, je nachdem ob eine der beiden Lesehilfen
 * aktiv ist. Idempotent: mehrfaches Aufrufen mit demselben Zustand kostet nichts.
 *
 * Nach jedem `applySettings()` aufrufen — die React-Hülle macht das selbst.
 */
export function syncOverlays(
  root: HTMLElement | null = typeof document === "undefined" ? null : document.documentElement,
): void {
  if (!root) return;

  if (!needsPointerTracking(root)) {
    if (active) {
      active();
      active = null;
    }
    root.style.removeProperty(MASK_VAR);
    return;
  }

  if (active) return;

  let pending = 0;
  let nextY = 0;

  const write = () => {
    pending = 0;
    root.style.setProperty(MASK_VAR, `${Math.round(nextY)}px`);
  };

  const schedule = (y: number) => {
    nextY = y;
    if (pending) return;
    pending = requestAnimationFrame(write);
  };

  const onPointer = (event: PointerEvent | MouseEvent) => schedule(event.clientY);

  const onFocus = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const rect = target.getBoundingClientRect();
    // Mitte des fokussierten Elements, nicht seine Oberkante: bei einem hohen
    // Textfeld läge das Band sonst über dem Rand statt über dem Inhalt.
    schedule(rect.top + rect.height / 2);
  };

  // `passive`, weil hier nie `preventDefault()` aufgerufen wird — sonst muss der
  // Browser bei jedem Ereignis darauf warten, ob wir das Scrollen abbrechen.
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("focusin", onFocus);

  // Startwert setzen, damit das Band nicht bis zur ersten Mausbewegung auf dem
  // CSS-Rückfallwert (50vh) steht und dabei „springt“.
  schedule(window.innerHeight / 2);

  active = () => {
    if (pending) cancelAnimationFrame(pending);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("focusin", onFocus);
  };
}
