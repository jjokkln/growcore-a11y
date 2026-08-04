import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ACTIVE_ATTR,
  SCHEMA,
  SETTINGS_VERSION,
  STORAGE_KEY,
  bootScript,
} from "../dist/core/index.js";
import { fakeElement, fakeStorage } from "./helpers.mjs";

/**
 * Der wichtigste Test des Pakets.
 *
 * Das Bootskript entsteht, indem `projectToDom` per `toString()` in einen String
 * geschrieben wird. Das funktioniert nur, solange die Funktion nichts außerhalb
 * ihrer Parameter referenziert. Ein einziges vergessenes Import — eine
 * Konstante, eine Hilfsfunktion — erzeugt einen `ReferenceError` im `<head>`,
 * bevor irgendetwas geladen ist. Das ist statisch nicht sichtbar: `tsc` und Lint
 * sehen nur eine ganz normale Funktion.
 *
 * Deshalb wird hier der erzeugte Text WIRKLICH AUSGEFÜHRT, in einem Kontext, in
 * dem es nichts außer `window` und `document` gibt.
 */
function runBoot(rawEntry, { key = STORAGE_KEY, throwOnAccess = false } = {}) {
  const root = fakeElement();
  const storage = fakeStorage(rawEntry === null ? {} : { [key]: rawEntry }, { throwOnAccess });
  const win = { localStorage: storage };
  const doc = { documentElement: root };

  // Kein Modul-Scope, kein `globalThis`-Zugriff: nur diese zwei Bindungen.
  const fn = new Function("window", "document", bootScript(key));
  fn(win, doc);
  return root;
}

const payload = (settings, v = SETTINGS_VERSION) => JSON.stringify({ v, s: settings });

test("Bootskript wendet einen gespeicherten Zustand ohne jeden Import an", () => {
  const root = runBoot(payload({ textScale: 3, color: "contrast-dark", hideImages: true }));
  assert.equal(root.attrs.get("data-a11y-text"), "3");
  assert.equal(root.props.get("--a11y-text-scale"), "1.5");
  assert.equal(root.attrs.get("data-a11y-color"), "contrast-dark");
  assert.equal(root.attrs.get("data-a11y-hide-images"), "");
  assert.equal(root.attrs.has(ACTIVE_ATTR), true);
});

test("Bootskript benutzt dieselbe Projektion wie die Laufzeit", async () => {
  // Gleiche Eingabe, zwei Wege, identisches Ergebnis. Bricht dieser Test, sind
  // Skript und Laufzeit auseinandergelaufen — genau der Fehler, den die
  // toString()-Bauweise verhindern soll.
  const settings = { textScale: 2, cvd: "protan", cvdStrength: 40, focusBoost: true };
  const viaBoot = runBoot(payload(settings));

  const { projectToDom } = await import("../dist/core/index.js");
  const viaRuntime = fakeElement();
  projectToDom(viaRuntime, settings, SCHEMA, ACTIVE_ATTR);

  assert.deepEqual([...viaBoot.attrs.entries()].sort(), [...viaRuntime.attrs.entries()].sort());
  assert.deepEqual([...viaBoot.props.entries()].sort(), [...viaRuntime.props.entries()].sort());
});

test("Ohne Eintrag passiert nichts", () => {
  const root = runBoot(null);
  assert.equal(root.attrs.size, 0);
  assert.equal(root.props.size, 0);
});

test("Falsche Version wird verworfen statt halb angewendet", () => {
  const root = runBoot(payload({ textScale: 4 }, SETTINGS_VERSION + 1));
  assert.equal(root.attrs.size, 0);
});

test("Kaputter oder fremder Inhalt bricht das Parsen des Dokuments nicht", () => {
  for (const junk of ["", "{", "null", "[]", '"text"', '{"v":1}', '{"v":1,"s":null}']) {
    assert.doesNotThrow(() => runBoot(junk), `Eingabe: ${junk}`);
  }
});

test("Ein werfender localStorage bricht nichts (Safari im privaten Modus)", () => {
  let root;
  assert.doesNotThrow(() => {
    root = runBoot(payload({ textScale: 2 }), { throwOnAccess: true });
  });
  assert.equal(root.attrs.size, 0, "ohne Speicher gilt der Standardzustand");
});

test("Skripttext enthält keinen Verweis auf den Modul-Scope", () => {
  const script = bootScript();
  // Diese Namen wären Referenzen nach außen bzw. Spuren des Modulsystems und
  // würden im <head> werfen, wo es weder `require` noch `exports` gibt.
  for (const name of ["require(", "import ", "exports.", "__importDefault"]) {
    assert.equal(script.includes(name), false, `Skript darf "${name}" nicht enthalten`);
  }
  // Und er muss syntaktisch gültig sein.
  assert.doesNotThrow(() => new Function("window", "document", script));
});
