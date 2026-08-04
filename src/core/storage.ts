import { SETTINGS_VERSION, STORAGE_KEY } from "./schema.js";
import { DEFAULTS, sanitize, type A11ySettings } from "./settings.js";

/**
 * Persistenz im Gerät des Nutzers, sonst nirgends.
 *
 * Muster übernommen aus `growcore-kundendashboard`
 * (`src/components/configurator/configurator-draft.ts`) — dort ist der teuer
 * gelernte Teil schon drin:
 *
 *  1. `storage()` in `try/catch`. Kein `typeof window`-Check allein: Safari im
 *     privaten Modus und ein Browser mit gesperrtem Speicher **werfen** beim
 *     Zugriff auf `localStorage`, statt `null` zu liefern.
 *  2. Ein roher String als stabile Kennung für `useSyncExternalStore` — ein
 *     jedes Mal neu geparstes Objekt hätte bei jedem Vergleich eine neue
 *     Identität und würde endlos neu rendern.
 *  3. Versionsfeld, und ein nicht passender Eintrag gilt als "nichts gespeichert".
 *
 * Bewusst ANDERS als beim Fragebogen-Entwurf: **kein Verfallsdatum.** Eine
 * Sehbeeinträchtigung läuft nicht nach sieben Tagen ab. Wer sich 175 % Schrift
 * eingestellt hat, will sie in drei Monaten immer noch.
 *
 * Datenschutz: Das ist eine technische Nutzerpräferenz, die das Gerät nie
 * verlässt — kein Cookie, kein Server, keine Einwilligung nötig. Sie gehört mit
 * einem Satz in die Datenschutzerklärung, nicht in ein Consent-Banner.
 */

type Payload = { v: number; s: Record<string, unknown> };

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Der rohe String aus dem Speicher — stabile Kennung für `useSyncExternalStore`. */
export function readRaw(key: string = STORAGE_KEY): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Rohwert zu Einstellungen lesen. Alles Unpassende fällt auf Standards zurück. */
export function parse(raw: string | null): A11ySettings {
  if (!raw) return DEFAULTS;
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return DEFAULTS;
  }
  if (!decoded || typeof decoded !== "object") return DEFAULTS;
  const payload = decoded as Partial<Payload>;
  // Ein echter Versionssprung verwirft alles. Innerhalb einer Version wird
  // feldweise ergänzt, siehe `sanitize()`.
  if (payload.v !== SETTINGS_VERSION) return DEFAULTS;
  return sanitize(payload.s);
}

export function read(key: string = STORAGE_KEY): A11ySettings {
  return parse(readRaw(key));
}

export function write(settings: A11ySettings, key: string = STORAGE_KEY): void {
  try {
    const payload: Payload = { v: SETTINGS_VERSION, s: settings };
    storage()?.setItem(key, JSON.stringify(payload));
  } catch {
    // Voller oder gesperrter Speicher: Die Einstellung gilt für diese Sitzung
    // weiter, sie überlebt nur den Neuladen nicht. Kein Grund, etwas zu melden.
  }
}

export function clear(key: string = STORAGE_KEY): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* s. o. */
  }
}

/**
 * Für `useSyncExternalStore`: benachrichtigt bei Änderungen in ANDEREN Tabs
 * (das `storage`-Event feuert nie im auslösenden Tab) und bei eigenen
 * Änderungen über ein selbst ausgelöstes Ereignis.
 */
export const CHANGE_EVENT = "growcore-a11y:change";

export function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
