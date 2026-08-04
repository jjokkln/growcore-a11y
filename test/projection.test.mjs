import assert from "node:assert/strict";
import { test } from "node:test";

import { ACTIVE_ATTR, DEFAULTS, SCHEMA, projectToDom, sanitize } from "../dist/core/index.js";
import { fakeElement } from "./helpers.mjs";

function project(partial) {
  const el = fakeElement();
  projectToDom(el, sanitize(partial), SCHEMA, ACTIVE_ATTR);
  return el;
}

test("Standardeinstellung schreibt NICHTS ins DOM", () => {
  const el = project({});
  assert.equal(el.attrs.size, 0, `unerwartete Attribute: ${[...el.attrs.keys()]}`);
  assert.equal(el.props.size, 0, `unerwartete Variablen: ${[...el.props.keys()]}`);
});

test("Enum schreibt nur abweichende Werte", () => {
  assert.equal(project({ color: "default" }).attrs.has("data-a11y-color"), false);
  assert.equal(project({ color: "contrast-dark" }).attrs.get("data-a11y-color"), "contrast-dark");
});

test("Stufe setzt Attribut UND die zugehörige CSS-Variable", () => {
  const el = project({ textScale: 3 });
  assert.equal(el.attrs.get("data-a11y-text"), "3");
  assert.equal(el.props.get("--a11y-text-scale"), "1.5", "Stufe 3 entspricht 150 %");

  const blue = project({ blueLight: 2 });
  assert.equal(blue.attrs.get("data-a11y-blue"), "2");
  assert.equal(blue.props.get("--a11y-blue-strength"), "0.16");
});

test("Korrekturstärke: volle Stufe schreibt kein Attribut, schwächere schon", () => {
  // Volle Korrektur ist der Standardfall, also greift in a11y.css die Grundregel
  // `html[data-a11y-cvd="deutan"]` und es braucht kein zweites Attribut.
  const full = project({ cvd: "deutan" });
  assert.equal(full.attrs.get("data-a11y-cvd"), "deutan");
  assert.equal(full.attrs.has("data-a11y-cvd-strength"), false);

  const weaker = project({ cvd: "deutan", cvdStrength: 2 });
  assert.equal(weaker.attrs.get("data-a11y-cvd"), "deutan");
  assert.equal(weaker.attrs.get("data-a11y-cvd-strength"), "2");
  // Eine Stufe ohne varValues bekommt keine CSS-Variable.
  assert.equal(weaker.props.size, 0);
});

test("Schalter schreiben ein leeres Attribut, aus entfernt es", () => {
  assert.equal(project({ hideImages: true }).attrs.get("data-a11y-hide-images"), "");
  assert.equal(project({ hideImages: false }).attrs.has("data-a11y-hide-images"), false);
});

test("data-a11y-active markiert genau dann, wenn etwas eingestellt ist", () => {
  assert.equal(project({}).attrs.has(ACTIVE_ATTR), false);
  assert.equal(project({ focusBoost: true }).attrs.has(ACTIVE_ATTR), true);
  assert.equal(project({ textScale: 1 }).attrs.has(ACTIVE_ATTR), true);
});

test("Zurücksetzen räumt frühere Attribute wirklich weg", () => {
  const el = fakeElement();
  projectToDom(el, sanitize({ textScale: 4, color: "invert", hideImages: true }), SCHEMA, ACTIVE_ATTR);
  assert.ok(el.attrs.size > 0);

  projectToDom(el, DEFAULTS, SCHEMA, ACTIVE_ATTR);
  assert.equal(el.attrs.size, 0, `Reste: ${[...el.attrs.keys()]}`);
  assert.equal(el.props.size, 0, `Reste: ${[...el.props.keys()]}`);
});

test("Ein manipulierter Fremdwert wird wie der Standard behandelt, nicht übernommen", () => {
  // Nicht über sanitize() — direkt, wie es das Bootskript aus localStorage bekäme.
  const el = fakeElement();
  projectToDom(
    el,
    { color: "'; drop table --", textScale: "4", hideImages: 1 },
    SCHEMA,
    ACTIVE_ATTR,
  );
  assert.equal(el.attrs.size, 0, `nichts davon darf ins DOM: ${[...el.attrs.entries()]}`);
});

test("Jeder Schema-Eintrag ist im DOM erreichbar", () => {
  // Wächter gegen einen halb verdrahteten neuen Schalter: für jeden Eintrag muss
  // sich ein Zustand finden, der SICHTBAR etwas am Element ändert.
  for (const [name, entry] of Object.entries(SCHEMA)) {
    let value;
    if (entry.kind === "enum") value = entry.values[1];
    else if (entry.kind === "step") value = entry.max;
    else value = true;

    const el = fakeElement();
    projectToDom(el, { [name]: value }, SCHEMA, ACTIVE_ATTR);
    assert.ok(
      el.attrs.size > 0 || el.props.size > 0,
      `Einstellung "${name}" hat keine Wirkung im DOM`,
    );
  }
});
