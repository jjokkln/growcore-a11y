import { ACTIVE_ATTR, SCHEMA, SETTINGS_VERSION, STORAGE_KEY } from "./schema.js";
import { projectToDom } from "./project.js";

/**
 * Das Skript, das das Flackern verhindert.
 *
 * Es läuft synchron im `<head>`, während der Browser das HTML parst — also
 * bevor der erste Pixel gemalt wird und lange bevor React hydratisiert. Next
 * dokumentiert genau dieses Vorgehen für persistierte UI-Zustände; `useEffect`
 * und sogar `useLayoutEffect` laufen erst nach der Hydration und damit nach dem
 * ersten Paint. Für einen Hochkontrast-Nutzer wäre das ein greller Blitz beim
 * jedem Seitenaufruf.
 *
 * Der Kniff gegen Auseinanderlaufen: `projectToDom` wird nicht nachgebaut,
 * sondern per `toString()` **wörtlich** in den Skripttext übernommen, mit dem
 * Schema als JSON daneben. Es gibt damit genau eine Projektionslogik im Projekt,
 * und ein neuer Schalter im Schema wirkt in beiden Pfaden gleichzeitig.
 * Voraussetzung dafür ist, dass `projectToDom` nichts von außen referenziert —
 * das erklärt den ES5-Stil dort.
 *
 * `try/catch` um alles: Ein Fehler hier würde das Parsen des Dokuments
 * unterbrechen. Ohne gültigen Eintrag passiert einfach nichts, und die Seite
 * rendert in ihrem Standardzustand.
 */
export function bootScript(key: string = STORAGE_KEY): string {
  return (
    "(function(){try{" +
    "var r=window.localStorage.getItem(" +
    JSON.stringify(key) +
    ");if(!r)return;" +
    "var p=JSON.parse(r);if(!p||p.v!==" +
    String(SETTINGS_VERSION) +
    ")return;" +
    "(" +
    projectToDom.toString() +
    ")(document.documentElement,p.s||{}," +
    JSON.stringify(SCHEMA) +
    "," +
    JSON.stringify(ACTIVE_ATTR) +
    ");" +
    "}catch(e){}})()"
  );
}
