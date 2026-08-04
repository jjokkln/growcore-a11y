import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULTS,
  SCHEMA,
  TEXT_SCALES,
  isPristine,
  sanitize,
  textScaleFactor,
} from "../dist/core/index.js";

test("Standardeinstellung ist aus dem Schema abgeleitet und vollständig", () => {
  assert.deepEqual(Object.keys(DEFAULTS).sort(), Object.keys(SCHEMA).sort());
  assert.equal(DEFAULTS.textScale, 0);
  assert.equal(DEFAULTS.color, "default");
  assert.equal(DEFAULTS.cvd, "none");
  assert.equal(DEFAULTS.hideImages, false);
  // Stufe 0 der Korrekturstärke IST die volle Korrektur, nicht "aus" — wer den
  // Filter einschaltet, will ihn wirksam haben.
  assert.equal(DEFAULTS.cvdStrength, 0);
  assert.ok(isPristine(DEFAULTS));
});

test("sanitize verwirft Unsinn feldweise statt den ganzen Eintrag", () => {
  const s = sanitize({
    textScale: 3, // gültig
    color: "gibtsnicht", // ungültig -> Standard
    cvd: "deutan", // gültig
    hideImages: "ja", // falscher Typ -> Standard
    readingMask: true, // gültig
    unbekannt: 42, // unbekannt -> ignoriert
  });
  assert.equal(s.textScale, 3, "gültiger Wert bleibt erhalten");
  assert.equal(s.color, "default", "ungültiges Enum fällt zurück");
  assert.equal(s.cvd, "deutan");
  assert.equal(s.hideImages, false, "String statt Boolean fällt zurück");
  assert.equal(s.readingMask, true);
  assert.equal("unbekannt" in s, false, "Fremdschlüssel landen nicht im Ergebnis");
});

test("sanitize hält Stufen in ihren Grenzen", () => {
  assert.equal(sanitize({ textScale: 99 }).textScale, 0, "über max -> Standard");
  assert.equal(sanitize({ textScale: -1 }).textScale, 0);
  assert.equal(sanitize({ textScale: 2.5 }).textScale, 0, "nicht ganzzahlig -> Standard");
  assert.equal(sanitize({ cvdStrength: 3 }).cvdStrength, 3, "gültige Stufe bleibt");
  assert.equal(sanitize({ cvdStrength: 4 }).cvdStrength, 0, "über max -> Standard");
  assert.equal(sanitize({ cvdStrength: -1 }).cvdStrength, 0);
  assert.equal(sanitize({ blueLight: 3 }).blueLight, 3);
  assert.equal(sanitize({ blueLight: 9 }).blueLight, 0);
});

test("sanitize verträgt jeden Müll als Eingabe", () => {
  for (const junk of [null, undefined, 0, "", "text", [], true, NaN]) {
    assert.deepEqual(sanitize(junk), DEFAULTS, `Eingabe ${JSON.stringify(junk)}`);
  }
});

test("isPristine erkennt jede einzelne Abweichung", () => {
  assert.equal(isPristine(sanitize({ textScale: 1 })), false);
  assert.equal(isPristine(sanitize({ focusBoost: true })), false);
  assert.equal(isPristine(sanitize({ cvdStrength: 2 })), false);
  assert.equal(isPristine(sanitize({})), true);
});

test("Schriftgrößen-Stufen ergeben aufsteigende Multiplikatoren", () => {
  assert.equal(textScaleFactor(DEFAULTS), 1);
  assert.equal(textScaleFactor(sanitize({ textScale: 4 })), 1.75);
  for (let i = 1; i < TEXT_SCALES.length; i++) {
    assert.ok(TEXT_SCALES[i] > TEXT_SCALES[i - 1], `Stufe ${i} muss größer sein als ${i - 1}`);
  }
});
