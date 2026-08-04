import {
  SCHEMA,
  SETTINGS_VERSION,
  TEXT_SCALES,
  type SchemaEntry,
  type SettingName,
} from "./schema.js";

/**
 * Der Einstellungstyp wird AUS dem Schema abgeleitet, nicht daneben gepflegt.
 * Eine neue Option im Schema ist damit sofort ein Typfehler an jeder Stelle,
 * die sie noch nicht behandelt — genau das soll passieren.
 */
type ValueOf<E> = E extends { kind: "enum"; values: readonly (infer V)[] }
  ? V
  : E extends { kind: "step" }
    ? number
    : E extends { kind: "range" }
      ? number
      : E extends { kind: "flag" }
        ? boolean
        : never;

export type A11ySettings = { [K in SettingName]: ValueOf<(typeof SCHEMA)[K]> };

function defaultFor(entry: SchemaEntry): string | number | boolean {
  switch (entry.kind) {
    case "enum":
      // Der erste Wert IST der Standard. Eine leere Werteliste wäre ein
      // Schemafehler, kein Laufzeitfall — deshalb hart, nicht stillschweigend.
      if (entry.values.length === 0) throw new Error("Enum ohne Werte im Schema");
      return entry.values[0] as string;
    case "step":
      return 0;
    case "range":
      return entry.fallback;
    case "flag":
      return false;
  }
}

/**
 * Die Standardeinstellung. Bewusst zur Laufzeit aus dem Schema erzeugt statt
 * als zweite Liste hingeschrieben: eine handgepflegte Kopie wäre die zweite
 * Wahrheit, die irgendwann von der ersten abweicht.
 */
export const DEFAULTS: A11ySettings = Object.freeze(
  Object.fromEntries(
    (Object.keys(SCHEMA) as SettingName[]).map((name) => [name, defaultFor(SCHEMA[name])]),
  ),
) as A11ySettings;

/**
 * Einen beliebigen Wert zu gültigen Einstellungen lesen. Alles, was nicht
 * passt, fällt auf den Standard zurück — Feld für Feld, nicht als Ganzes.
 *
 * Warum feldweise: Ein Eintrag aus einer älteren Fassung, dem eine Option fehlt,
 * ist kein Müll. Wer sich 175 % Schrift eingestellt hat, soll die nach einem
 * Update behalten, auch wenn drei neue Schalter dazugekommen sind. Nur ein
 * echter Versionssprung (`SETTINGS_VERSION`) verwirft alles — dafür ist er da.
 */
export function sanitize(raw: unknown): A11ySettings {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULTS } as Record<string, unknown>;

  for (const name of Object.keys(SCHEMA) as SettingName[]) {
    const entry: SchemaEntry = SCHEMA[name];
    const value = input[name];

    switch (entry.kind) {
      case "enum":
        if (typeof value === "string" && entry.values.includes(value)) out[name] = value;
        break;
      case "step":
        if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= entry.max) {
          out[name] = value;
        }
        break;
      case "range":
        if (typeof value === "number" && Number.isFinite(value)) {
          out[name] = Math.min(entry.max, Math.max(entry.min, Math.round(value)));
        }
        break;
      case "flag":
        if (typeof value === "boolean") out[name] = value;
        break;
    }
  }

  return out as A11ySettings;
}

/** Weicht überhaupt etwas vom Standard ab? Steuert den Zustand des Triggers. */
export function isPristine(settings: A11ySettings): boolean {
  return (Object.keys(SCHEMA) as SettingName[]).every((name) => settings[name] === DEFAULTS[name]);
}

/** Der Multiplikator zur eingestellten Schriftgrößen-Stufe. */
export function textScaleFactor(settings: A11ySettings): number {
  return TEXT_SCALES[settings.textScale] ?? 1;
}

export { SETTINGS_VERSION };
