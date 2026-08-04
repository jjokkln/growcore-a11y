"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { applySettings } from "../core/apply.js";
import { STORAGE_KEY } from "../core/schema.js";
import { DEFAULTS, isPristine, type A11ySettings } from "../core/settings.js";
import {
  clear,
  notifyChanged,
  parse,
  readRaw,
  subscribe,
  write,
} from "../core/storage.js";

/**
 * Die Einstellungen als React-Zustand.
 *
 * `useSyncExternalStore` und nicht `useState` + `useEffect`, aus drei Gründen:
 *
 * 1. Die Wahrheit steht im `localStorage`, nicht in React. Ein zweiter Tab, der
 *    die Schriftgröße ändert, muss hier ankommen — das `storage`-Ereignis feuert
 *    im auslösenden Tab nie, deshalb löst `notifyChanged()` zusätzlich ein
 *    eigenes Ereignis aus.
 * 2. Beim ersten Rendern liefert `getServerSnapshot` die Standardwerte, was mit
 *    dem serverseitigen HTML übereinstimmt — kein Hydrations-Konflikt. Das
 *    Aussehen der Seite hängt daran ohnehin nicht, weil das Bootskript die
 *    Attribute längst gesetzt hat, bevor React überhaupt läuft.
 * 3. `useState(…)` in einem `useEffect` nachzuziehen ist unter React 19 ein
 *    Lint-Fehler (`react-hooks/set-state-in-effect`) und war schon vorher das
 *    falsche Werkzeug.
 *
 * Der Schnappschuss ist der ROHE String aus dem Speicher, nicht das geparste
 * Objekt: `useSyncExternalStore` vergleicht per Identität, ein jedes Mal neu
 * geparstes Objekt würde also endlos neu rendern.
 */
export type UseA11yResult = {
  settings: A11ySettings;
  /** Eine einzelne Einstellung ändern. */
  set: <K extends keyof A11ySettings>(name: K, value: A11ySettings[K]) => void;
  /** Alles auf Standard, auch im Speicher. */
  reset: () => void;
  /** Ist überhaupt etwas eingestellt? Steuert die Kennzeichnung am Trigger. */
  pristine: boolean;
};

export function useA11y(storageKey: string = STORAGE_KEY): UseA11yResult {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(storageKey),
    () => null, // Server: immer Standard, passt zum gerenderten HTML
  );

  const settings = useMemo(() => parse(raw), [raw]);

  // Nach jedem Wechsel des gespeicherten Zustands das DOM nachziehen. Beim
  // ersten Lauf ist das ein No-op, weil das Bootskript dieselben Attribute schon
  // gesetzt hat — nötig ist es für Änderungen aus einem anderen Tab.
  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const set = useCallback<UseA11yResult["set"]>(
    (name, value) => {
      const next = { ...parse(readRaw(storageKey)), [name]: value };
      write(next, storageKey);
      // Sofort anwenden, nicht erst im Effect: der Nutzer soll die Wirkung im
      // selben Bildaufbau sehen, in dem er den Schalter umlegt.
      applySettings(next);
      notifyChanged();
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    clear(storageKey);
    applySettings(DEFAULTS);
    notifyChanged();
  }, [storageKey]);

  return { settings, set, reset, pristine: isPristine(settings) };
}
