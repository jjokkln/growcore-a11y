# Browser-Messungen

Zwei Fragen, die nur eine echte Rendering-Engine beantwortet, und deren Antworten
die Architektur bestimmen. Beide wurden am 04.08.2026 über chromium, firefox und
webkit gemessen; die Ergebnisse stehen im Wurzel-`README.md`.

```bash
node test/browser/filter-containing-block.mjs
node test/browser/top-layer-counterfilter.mjs
```

**Playwright ist hier keine Abhängigkeit.** Die Skripte importieren es über einen
absoluten Pfad aus `growcore-kundendashboard/node_modules` — zwei
Gelegenheitsmessungen rechtfertigen keine 300 MB Browser-Downloads im
Paket-`node_modules`. Wer sie eigenständig laufen lassen will:

```bash
npm i -D playwright && npx playwright install chromium firefox webkit
```

und den Import oben in beiden Dateien auf `"playwright"` zurückstellen.

## Warum der absolute Importpfad, nicht `NODE_PATH`

In ESM zieht `NODE_PATH` nicht. Ein Skript außerhalb des Repos findet dessen
`node_modules` nur über einen absoluten Pfad plus Default-Export
(`import pw from "…/playwright/index.js"`), nicht über den Paketnamen. Dieselbe
Falle ist im AI-OS unter `playwright-verifikationstechniken` notiert.

## Was diese Skripte richtig machen und worauf zu achten ist

Beide enthalten eine **Gegenprobe**, und die ist der eigentliche Wert. Beim
Containing-Block-Test wird derselbe Filter zusätzlich auf ein Wrapper-DIV
angewendet, wo er `position: fixed` brechen **muss**. Bricht er dort nicht, misst
der Test nichts und „überall grün" wäre kein Befund, sondern ein blinder Test.

Beim Gegenfilter-Test ist mir genau dieser Fehler zuerst unterlaufen: Ich hatte
die `invert`-Regel für `<html>` nie definiert, nur die für das Panel. Alle drei
Engines meldeten übereinstimmend „Gegenfilter trägt nicht" — ein perfekt
konsistentes, vollständig falsches Ergebnis. Aufgefallen ist es nur, weil das
Skript auch die Fläche *außerhalb* des Panels mitmisst und dort „nicht
invertiert" stand, was bei aktivem Invert-Modus unmöglich ist. Kontrollpunkte,
deren erwarteter Wert bekannt ist, gehören deshalb in jede solche Messung.
