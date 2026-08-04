/**
 * Alle sichtbaren Texte des Panels, an einer Stelle.
 *
 * Getrennt von der Komponente, damit ein Projekt sie überschreiben kann (andere
 * Anrede, andere Wortwahl) ohne die Logik anzufassen — und damit beim
 * Korrekturlesen niemand JSX durchsuchen muss.
 *
 * Sprachliche Linie: keine Fachbegriffe, kein Englisch, keine Abkürzungen.
 * „Farbfehlsicht" statt „CVD", „Zeilenabstand" statt „Leading". Wer dieses Panel
 * öffnet, hat ein konkretes Problem und keine Lust auf Vokabeln.
 */

export const A11Y_LABELS = {
  triggerOpen: "Barrierefreiheit und Lesehilfen öffnen",
  triggerActive: "Barrierefreiheit und Lesehilfen öffnen — Einstellungen aktiv",
  title: "Ansicht anpassen",
  subtitle: "Gilt nur für dich, auf diesem Gerät. Bleibt beim nächsten Besuch erhalten.",
  close: "Schließen",
  reset: "Alles zurücksetzen",
  resetDone: "Alle Einstellungen zurückgesetzt.",
  statement: "Erklärung zur Barrierefreiheit",

  groups: {
    text: "Text",
    color: "Farben und Kontrast",
    media: "Bilder und Bewegung",
    reading: "Lesehilfen",
  },

  textScale: "Schriftgröße",
  textScaleSteps: ["Normal", "Größer", "Groß", "Sehr groß", "Maximal"],

  leading: "Zeilenabstand",
  leadingValues: { default: "Normal", relaxed: "Weiter", loose: "Am weitesten" },

  tracking: "Buchstabenabstand",
  trackingValues: { default: "Normal", wide: "Weiter", wider: "Am weitesten" },

  align: "Textausrichtung",
  alignValues: { default: "Wie gestaltet", left: "Linksbündig" },

  font: "Schriftart",
  fontValues: {
    default: "Wie gestaltet",
    readable: "Gut lesbar",
    dyslexic: "Für Legasthenie",
  },
  fontNote:
    "„Gut lesbar“ nutzt Atkinson Hyperlegible, entwickelt für Menschen mit Sehbehinderung.",

  color: "Farbmodus",
  colorValues: {
    default: "Wie gestaltet",
    night: "Nachtmodus",
    "contrast-light": "Hoher Kontrast, hell",
    "contrast-dark": "Hoher Kontrast, dunkel",
    invert: "Umgekehrt",
  },

  saturation: "Farbsättigung",
  saturationValues: {
    default: "Normal",
    low: "Blasser",
    high: "Kräftiger",
    grayscale: "Graustufen",
  },

  cvd: "Farbfehlsicht ausgleichen",
  cvdValues: {
    none: "Aus",
    protan: "Rotschwäche",
    deutan: "Grünschwäche",
    tritan: "Blauschwäche",
  },
  cvdStrength: "Stärke des Ausgleichs",
  cvdStrengthSteps: ["Voll", "Stark", "Mittel", "Leicht"],
  cvdUnsupported:
    "Dieser Browser kann den Farbausgleich nicht darstellen. In Chrome, Edge oder Safari funktioniert er.",

  blueLight: "Blaulichtfilter",
  blueLightSteps: ["Aus", "Leicht", "Mittel", "Stark"],

  hideImages: "Bilder ausblenden",
  stopAnimations: "Animationen anhalten",

  readingMask: "Lesemaske",
  readingRuler: "Leselineal",
  readingExclusive: "Lesemaske und Leselineal lassen sich nicht zusammen nutzen.",
  bigCursor: "Großer Mauszeiger",
  highlightLinks: "Links hervorheben",
  focusBoost: "Tastatur-Fokus verstärken",
} as const;

export type A11yLabels = typeof A11Y_LABELS;
