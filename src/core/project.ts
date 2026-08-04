/**
 * Die Projektion: Einstellungen -> Attribute und CSS-Variablen auf <html>.
 *
 * ACHTUNG, das ist der Grund für den seltsamen Stil dieser Datei:
 * Diese Funktion wird nicht nur aufgerufen, sondern auch per `toString()` in das
 * Inline-Bootskript geschrieben (siehe `boot.ts`). Sie muss deshalb
 * **vollständig in sich geschlossen** sein:
 *
 *   - Kein Zugriff auf Modul-Variablen, Konstanten oder Imports. Alles, was sie
 *     braucht, kommt über Parameter. Ein einziger Verweis nach außen erzeugt
 *     einen `ReferenceError` im `<head>`, bevor irgendetwas geladen ist.
 *   - Kein `const`/`let` in Blöcken, keine Pfeilfunktionen, kein Spread — bewusst
 *     ES5-Stil, damit der Text auch ohne Transpilation trägt.
 *   - Keine Typ-Importe im Rumpf; die Signatur ist absichtlich strukturell
 *     getypt, damit sie auch mit dem rohen JSON-Schema aufgerufen werden kann.
 *
 * Warum überhaupt so: Wenn Attribute erst nach der Hydration gesetzt werden,
 * sieht der Nutzer für ein paar Hundert Millisekunden die Standardansicht — bei
 * einem Hochkontrast-Nutzer also einen hellen Blitz. Next dokumentiert dafür
 * ausdrücklich das Inline-Skript; `useEffect` und `useLayoutEffect` sind zu spät.
 */

type StyleTarget = {
  setProperty(name: string, value: string): void;
  removeProperty(name: string): void;
};

export type ProjectionTarget = {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  style: StyleTarget;
};

/* eslint-disable prefer-const, no-var, prefer-arrow-callback */
export function projectToDom(
  root: ProjectionTarget,
  settings: Record<string, unknown>,
  schema: Record<string, Record<string, unknown>>,
  activeAttr: string,
): void {
  var names = Object.keys(schema);
  var dirty = false;
  var i;

  for (i = 0; i < names.length; i++) {
    // `as string` nur, weil der Index aus `Object.keys` derselben Struktur kommt
    // — hier kann nichts fehlen. Kein `?.` und kein `!`, damit der Text auch
    // ohne Transpilation als reines ES5 durchgeht.
    var name = names[i] as string;
    var entry = schema[name] as Record<string, unknown>;
    var value = settings[name];
    var kind = entry.kind;
    var attr = entry.attr as string;
    var cssVar = entry.cssVar as string | undefined;

    if (kind === "enum") {
      var values = entry.values as string[];
      // Der erste Wert ist der Standard und wird nie geschrieben. Ein unbekannter
      // Wert wird wie der Standard behandelt, nicht wie ein Fehler — ein fremder
      // localStorage-Eintrag darf die Seite nicht in einen unmöglichen Zustand bringen.
      if (typeof value !== "string" || values.indexOf(value) < 1) {
        root.removeAttribute(attr);
      } else {
        root.setAttribute(attr, value);
        dirty = true;
      }
    } else if (kind === "step") {
      var step = typeof value === "number" ? Math.round(value) : 0;
      if (!(step > 0) || step > (entry.max as number)) {
        root.removeAttribute(attr);
        if (cssVar) root.style.removeProperty(cssVar);
      } else {
        root.setAttribute(attr, String(step));
        if (cssVar) {
          var table = entry.varValues as number[] | undefined;
          var scaled = table ? table[step] : step;
          // Eine Stufe ohne Eintrag in `varValues` ist ein Schemafehler. Im
          // Browser wird sie stillschweigend übersprungen statt eine kaputte
          // Variable zu schreiben; der Test `Jeder Schema-Eintrag ist im DOM
          // erreichbar` fängt den Fall vorher.
          if (typeof scaled === "number") root.style.setProperty(cssVar, String(scaled));
        }
        dirty = true;
      }
    } else if (kind === "range") {
      var fallback = entry.fallback as number;
      var num = typeof value === "number" && isFinite(value) ? value : fallback;
      if (num > (entry.max as number)) num = entry.max as number;
      if (num < (entry.min as number)) num = entry.min as number;
      if (num === fallback) {
        root.style.removeProperty(cssVar as string);
      } else {
        var factor = entry.scale as number | undefined;
        root.style.setProperty(cssVar as string, String(factor ? num * factor : num));
        dirty = true;
      }
    } else if (kind === "flag") {
      if (value === true) {
        root.setAttribute(attr, "");
        dirty = true;
      } else {
        root.removeAttribute(attr);
      }
    }
  }

  if (dirty) root.setAttribute(activeAttr, "");
  else root.removeAttribute(activeAttr);
}
/* eslint-enable prefer-const, no-var, prefer-arrow-callback */
