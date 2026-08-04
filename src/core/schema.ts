/**
 * Das Schema ist die EINZIGE Beschreibung davon, wie eine Einstellung ins DOM
 * kommt. Alles andere leitet sich daraus ab: `applySettings()` zur Laufzeit,
 * das flackerfreie Bootskript beim HTML-Parsen, `resetSettings()`, und die
 * Prüfung eines aus `localStorage` gelesenen Fremdwerts.
 *
 * Warum eine Datentabelle und keine Reihe von if-Zweigen: Das Bootskript läuft
 * als String im `<head>`, bevor irgendein Modul geladen ist — es kann nichts
 * importieren. Ohne gemeinsame Datenquelle müsste die Projektion zweimal
 * geschrieben werden, und die beiden Fassungen laufen dann garantiert
 * auseinander (die eine kennt eine neue Einstellung, die andere nicht — sichtbar
 * als Aufblitzen der Standardansicht genau bei dieser einen Option). Hier wird
 * stattdessen dieselbe Funktion einmal aufgerufen und einmal per `toString()`
 * ins Skript geschrieben, mit dem Schema als JSON-Argument.
 *
 * Drei Projektionsarten, mehr braucht es nicht:
 *
 *   enum   Auswahl aus festen Werten. Der ERSTE Wert ist der Standard und wird
 *          nie ins DOM geschrieben — `[data-a11y-*]` bedeutet damit immer
 *          "vom Standard abweichend", was die CSS-Selektoren kurz hält.
 *   step   Ganzzahlige Stufe 0..max. 0 ist der Standard. Optional mit einer
 *          CSS-Variablen, die je Stufe einen eigenen Wert bekommt (`varValues`).
 *   flag   An/Aus. Vorhandensein des Attributs ist "an".
 */

export const SETTINGS_VERSION = 1;
export const STORAGE_KEY = "growcore.a11y";

/** Die Schriftgrößen-Stufen als Multiplikator der Wurzel-Schriftgröße. */
export const TEXT_SCALES = [1, 1.125, 1.25, 1.5, 1.75] as const;

export type SchemaEntry =
  | { kind: "enum"; attr: string; values: readonly string[] }
  | { kind: "step"; attr: string; max: number; cssVar?: string; varValues?: readonly number[] }
  | { kind: "flag"; attr: string };

export const SCHEMA = {
  // ---- Text -----------------------------------------------------------------
  textScale: {
    kind: "step",
    attr: "data-a11y-text",
    max: 4,
    cssVar: "--a11y-text-scale",
    varValues: TEXT_SCALES,
  },
  leading: { kind: "enum", attr: "data-a11y-leading", values: ["default", "relaxed", "loose"] },
  tracking: { kind: "enum", attr: "data-a11y-tracking", values: ["default", "wide", "wider"] },
  align: { kind: "enum", attr: "data-a11y-align", values: ["default", "left"] },
  font: { kind: "enum", attr: "data-a11y-font", values: ["default", "readable", "dyslexic"] },

  // ---- Farbe ----------------------------------------------------------------
  // `invert` ist hier ein Token-Override, KEIN CSS-Filter. Grund: filter:invert
  // macht Fotos zu Negativen, und ein Vorfahren-Filter faerbt in Firefox auch
  // Elemente im Top Layer mit (gemessen 04.08.2026) — das Panel wuerde also
  // mit-invertieren. Siehe styles/a11y.css.
  color: {
    kind: "enum",
    attr: "data-a11y-color",
    values: ["default", "night", "contrast-light", "contrast-dark", "invert"],
  },
  // Diese drei brauchen echtes `filter` und laufen auf <html>. Dass die
  // Wurzel-Ausnahme aus Filter Effects L2 `position: fixed` intakt laesst, ist
  // in chromium, firefox und webkit gemessen — nicht angenommen.
  saturation: {
    kind: "enum",
    attr: "data-a11y-saturation",
    values: ["default", "low", "high", "grayscale"],
  },
  cvd: { kind: "enum", attr: "data-a11y-cvd", values: ["none", "protan", "deutan", "tritan"] },
  /**
   * Stufe statt stufenlosem Regler, und das ist eine technische Notwendigkeit:
   * `values` an einem <feColorMatrix> ist ein SVG-Attribut, keine
   * CSS-Eigenschaft — es kann also keine CSS-Variable lesen. Ein stufenloser
   * Regler bräuchte JavaScript, das die Matrix zur Laufzeit einträgt, und das
   * liefe erst nach der Hydration: sichtbarer Farbsprung bei jedem Seitenaufruf.
   * Vier vorgerechnete Matrizen je Typ sind deklarativ und flackerfrei
   * (`cvd-filters.ts`, erzeugt von `tools/generate-cvd-filters.mjs`).
   *
   * Stufe 0 = volle Korrektur = Standard. Anomalien (Deuteranomalie ist weit
   * häufiger als echte Dichromasie) kommen mit einer schwächeren Stufe oft besser
   * zurecht, deshalb gibt es die Abstufung überhaupt.
   */
  cvdStrength: { kind: "step", attr: "data-a11y-cvd-strength", max: 3 },
  blueLight: {
    kind: "step",
    attr: "data-a11y-blue",
    max: 3,
    cssVar: "--a11y-blue-strength",
    varValues: [0, 0.08, 0.16, 0.26],
  },

  // ---- Medien ---------------------------------------------------------------
  hideImages: { kind: "flag", attr: "data-a11y-hide-images" },
  stopAnimations: { kind: "flag", attr: "data-a11y-stop-animations" },

  // ---- Lesehilfen -----------------------------------------------------------
  readingMask: { kind: "flag", attr: "data-a11y-reading-mask" },
  readingRuler: { kind: "flag", attr: "data-a11y-reading-ruler" },
  bigCursor: { kind: "flag", attr: "data-a11y-big-cursor" },
  highlightLinks: { kind: "flag", attr: "data-a11y-highlight-links" },
  focusBoost: { kind: "flag", attr: "data-a11y-focus-boost" },
} as const satisfies Record<string, SchemaEntry>;

export type SettingName = keyof typeof SCHEMA;

/** Signalisiert dem Trigger, dass überhaupt etwas eingestellt ist. */
export const ACTIVE_ATTR = "data-a11y-active";
