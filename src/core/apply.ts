import { ACTIVE_ATTR, SCHEMA } from "./schema.js";
import { projectToDom } from "./project.js";
import { DEFAULTS, type A11ySettings } from "./settings.js";

/**
 * Einstellungen auf das Dokument anwenden.
 *
 * Ziel ist immer `document.documentElement`, nie ein Knoten im Inhalt. Das ist
 * kein Stilentscheid, sondern der Fallstrick aus
 * `growcore-kundendashboard/context/troubleshooting.md`: Attribute, die per JS
 * auf server-gerenderte Inhaltsknoten gesetzt werden, verschwinden wieder, weil
 * React die gestreamten Knoten ~200 ms nach dem ersten Paint austauscht.
 * `<html>` überlebt das — nachgewiesen durch `ProjectAppearanceEffect` im selben
 * Repo, das dort schon CSS-Variablen zur Laufzeit setzt.
 */
export function applySettings(
  settings: A11ySettings,
  root: HTMLElement | null = typeof document === "undefined" ? null : document.documentElement,
): void {
  if (!root) return;
  projectToDom(root, settings as unknown as Record<string, unknown>, SCHEMA, ACTIVE_ATTR);
}

/** Alles zurück auf Standard — im DOM, nicht im Speicher (das macht der Aufrufer). */
export function resetDom(
  root: HTMLElement | null = typeof document === "undefined" ? null : document.documentElement,
): void {
  applySettings(DEFAULTS, root);
}
