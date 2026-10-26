/**
 * Rückfallebene für Browser ohne Popover-API (Safari vor 17, iPadOS 16).
 *
 * Das Panel benutzt `popover="auto"` und `popovertarget` an den Knöpfen. Wo der
 * Browser das nicht kennt, tun diese Attribute nichts: der Knopf öffnet nichts,
 * der Schließen-Knopf schließt nichts. Diese Funktion baut genau die vier Dinge
 * nach, die die native API sonst mitbringt — nicht mehr:
 *
 *   1. Öffnen/Schließen über jeden Knopf mit `popovertarget="<panel-id>"`,
 *      inklusive `popovertargetaction` (`toggle` | `show` | `hide`).
 *   2. Schließen mit Escape.
 *   3. Schließen bei Klick daneben (Zeigerereignis außerhalb von Panel und
 *      Auslösern).
 *   4. Fokus zurück auf den Auslöser, wenn der Fokus beim Schließen im Panel
 *      lag (oder nirgends, wie nach einem Klick in Safari, der Knöpfe nicht
 *      fokussiert). Beim Klick daneben bleibt der Fokus, wo der Klick ihn
 *      hinsetzt — so verhält sich auch die native API.
 *
 * Sichtbarkeit läuft über das Attribut `data-gc-a11y-open` am Panel, das
 * `panel.css` auswertet. Das `popover`-Attribut wird entfernt: Ohne es greift
 * in Browsern MIT Popover-API die native Regel `[popover]:not(:popover-open)`
 * nicht, und genau das macht die Rückfallebene auch in Chromium prüfbar
 * (`test/browser/popover-fallback.mjs`).
 *
 * Bewusst nicht nachgebaut: Top Layer (ersetzt durch den höchsten `z-index`)
 * und das Stapeln mehrerer `auto`-Popover — das Panel ist das einzige.
 */

export const FALLBACK_OPEN_ATTR = "data-gc-a11y-open";

export type PopoverFallback = {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  /** Entfernt alle Listener. Das Panel bleibt im zuletzt gesetzten Zustand. */
  destroy(): void;
};

export type PopoverFallbackOptions = {
  /** Wird bei jedem Zustandswechsel gerufen — Ersatz für das `toggle`-Ereignis. */
  onToggle?: (open: boolean) => void;
};

export function attachPopoverFallback(
  panel: HTMLElement,
  options: PopoverFallbackOptions = {},
): PopoverFallback {
  const doc = panel.ownerDocument;
  let open = panel.hasAttribute(FALLBACK_OPEN_ATTR);
  let opener: HTMLElement | null = null;

  panel.removeAttribute("popover");

  const invokerOf = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null;
    const el = target.closest<HTMLElement>("[popovertarget]");
    if (!el || !panel.id || el.getAttribute("popovertarget") !== panel.id) return null;
    return el;
  };

  const syncExpanded = () => {
    for (const el of doc.querySelectorAll<HTMLElement>("[popovertarget]")) {
      if (el.getAttribute("popovertarget") !== panel.id) continue;
      if (el.getAttribute("popovertargetaction") === "hide") continue;
      el.setAttribute("aria-expanded", String(open));
    }
  };

  /** Lag der Fokus im Panel oder nirgends? Dann gehört er zurück zum Auslöser. */
  const focusBelongsBack = () => {
    const active = doc.activeElement;
    return !active || active === doc.body || panel.contains(active);
  };

  const set = (next: boolean, restoreFocus: boolean) => {
    if (next === open) return;
    open = next;
    if (open && !opener) {
      // Geöffnet ohne Knopf (Tastenkürzel): zurück dorthin, wo der Fokus war.
      const active = doc.activeElement;
      if (active instanceof HTMLElement && active !== doc.body) opener = active;
    }
    if (open) panel.setAttribute(FALLBACK_OPEN_ATTR, "");
    else panel.removeAttribute(FALLBACK_OPEN_ATTR);
    syncExpanded();
    if (!open && restoreFocus && opener && opener.isConnected) opener.focus();
    if (!open) opener = null;
    options.onToggle?.(open);
  };

  const onClick = (event: MouseEvent) => {
    const invoker = invokerOf(event.target);
    if (!invoker) return;
    const action = invoker.getAttribute("popovertargetaction") ?? "toggle";
    const next = action === "show" ? true : action === "hide" ? false : !open;
    if (next && !open) opener = invoker;
    set(next, focusBelongsBack());
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open || event.key !== "Escape") return;
    event.preventDefault();
    set(false, focusBelongsBack());
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!open) return;
    const target = event.target;
    if (target instanceof Node && panel.contains(target)) return;
    if (invokerOf(target)) return;
    set(false, false);
  };

  // Capture-Phase: ein Projekt, das Klicks mit `stopPropagation` abfängt, soll
  // das Panel nicht unbedienbar machen.
  doc.addEventListener("click", onClick, true);
  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("pointerdown", onPointerDown, true);
  syncExpanded();

  return {
    open: () => set(true, false),
    close: () => set(false, focusBelongsBack()),
    toggle: () => set(!open, focusBelongsBack()),
    isOpen: () => open,
    destroy() {
      doc.removeEventListener("click", onClick, true);
      doc.removeEventListener("keydown", onKeyDown, true);
      doc.removeEventListener("pointerdown", onPointerDown, true);
    },
  };
}
