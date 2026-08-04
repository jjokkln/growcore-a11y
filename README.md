# @growcore/a11y

Barrierefreiheits-Panel für GrowCore-Websites: Schriftgröße, Zeilenabstand,
Kontrastmodi, Farbfehlsicht-**Korrektur**, Blaulichtfilter, Bilder ausblenden,
Lesehilfen. Framework-freier Kern plus React-Hülle.

**Einbauanleitung: [INSTALL.md](INSTALL.md)** — geschrieben so, dass man sie einer
KI in die Hand geben kann.

## Was das hier NICHT ist

**Kein BFSG-Konformitätswerkzeug.** Das ist keine Vorsicht, das ist der
Sachstand: Die gemeinsame Bewertung der Bund-Länder-Überwachungsstellen für
IT-Barrierefreiheit hält fest, dass eine nicht barrierefreie Website durch ein
Overlay nicht barrierefrei wird. In der WebAIM-Screenreader-Umfrage halten 67 %
der Befragten solche Werkzeuge für unwirksam, unter Menschen mit Behinderung
72 %. accessiBe hat für Compliance-Versprechen ein FTC-Verfahren kassiert.

Maßstab des BFSG ist EN 301 549, praktisch WCAG 2.1 AA, und das betrifft die
Website selbst: `lang`-Attribut, Kontrastverhältnisse, Tastaturbedienbarkeit,
Alt-Texte, verknüpfte Labels, Überschriftenhierarchie, `prefers-reduced-motion`,
Erklärung zur Barrierefreiheit. **Davon erledigt dieses Paket nichts.**

Was es ist: ein **Komfort- und Personalisierungspanel** auf einer Website, die
ihre Hausaufgaben gemacht hat. Deshalb bewusst **nicht** eingebaut:

- keine Erkennung laufender Hilfstechnologie (gibt die Behinderung des Nutzers
  preis, DSGVO-Risiko)
- keine automatische ARIA- oder Alt-Text-Injektion (automatisch erzeugte
  Beschriftungen sind nachweislich unzuverlässig und verdrängen die richtige)
- kein „Screenreader-Modus" (Nutzer bringen ihren eigenen mit, und er ist besser)
- kein Konformitäts-Badge, kein „barrierefrei nach WCAG"-Versprechen

Ausgeliefert wird das Panel immer zusammen mit einer echten
`/barrierefreiheit`-Seite (Erklärung + Feedback-Kontakt) und einem axe-Lauf.

## Aufbau

```
src/core/     framework-frei, kennt nur das DOM
  schema.ts     die EINZIGE Beschreibung aller Einstellungen
  settings.ts   Typen (aus dem Schema abgeleitet), Defaults, sanitize()
  project.ts    Einstellungen -> Attribute + CSS-Variablen auf <html>
  boot.ts       das flackerfreie Inline-Skript
  storage.ts    localStorage, versioniert, wurffest
  apply.ts      Laufzeit-Anwendung
src/styles/   a11y.css (Effekte) + panel.css (Panel selbst), plain CSS
src/react/    <A11yWidget />, <A11yBootScript />, <A11yFilterDefs />
fonts/        Atkinson Hyperlegible + OpenDyslexic (beide OFL) + fonts.css
```

**Noch nicht gebaut:** ein `<script>`-Bundle für Seiten ohne Build-Schritt. Alle
GrowCore-Projekte sind Next/React, deshalb war es bisher unnötig — wer es braucht,
baut einen IIFE-Einstieg um `applySettings` + `bootScript` + `ensureCvdSvg`.

Der Zustand ist eine flache, serialisierbare Struktur. Er landet als
`data-a11y-*`-Attribute und CSS-Variablen auf `<html>`; eine statische
Stylesheet-Datei macht daraus die Wirkung. Kein Runtime-CSS-Bau, keine
UI-Bibliothek, keine Laufzeitabhängigkeit.

### Warum das Schema eine Datentabelle ist

Das Bootskript läuft als String im `<head>`, bevor irgendein Modul geladen ist —
es kann nichts importieren. Statt die Projektion zweimal zu schreiben (und sie
damit garantiert auseinanderlaufen zu lassen), wird **dieselbe** Funktion
`projectToDom` einmal aufgerufen und einmal per `toString()` in den Skripttext
übernommen, mit dem Schema als JSON-Argument.

Damit das trägt, darf `projectToDom` nichts außerhalb ihrer Parameter
referenzieren. Das ist statisch nicht prüfbar — `tsc` und Lint sehen eine ganz
normale Funktion. Deshalb **führt** `test/boot.test.mjs` den erzeugten Text
wirklich aus, in einem Kontext, in dem es nur `window` und `document` gibt.
Dieser Test ist der wichtigste im Paket.

## Gemessene Browser-Eigenschaften

Nicht angenommen, sondern am 04.08.2026 über chromium, firefox und webkit
gemessen (Skripte unter `test/browser/`):

| Frage | Ergebnis |
| --- | --- |
| Bricht `filter` auf `<html>` `position: fixed`? | **Nein**, in allen drei Engines. Die Wurzel-Ausnahme aus Filter Effects L2 greift; Firefox-Bug 1125767 ist erledigt. Gegenprobe: derselbe Filter auf einem Wrapper-DIV bricht es reproduzierbar um genau die Scrollhöhe — der Test unterscheidet also. |
| Entkommt ein Element im Top Layer (`popover`) dem Vorfahren-`filter`? | **Engine-abhängig.** chromium und webkit ja, **firefox nein**. Ein Gegenfilter wäre in zwei von drei Engines falsch, und die Unterscheidung ist per CSS nicht feststellbar. |
| Wirkt `filter: url(#svg)` auf `<html>`? | **chromium ✔ · webkit ✔ · firefox ✘.** Fünf Schreibweisen geprüft (direkt, in Anführungszeichen, über `var()`, beides kombiniert, zusammengesetzt) — in Firefox wirkt keine. Auf einem `<div>` funktioniert es überall, es ist also die Wurzel und nicht die Syntax. |
| Ausweg über `<body>` statt `<html>`? | Filter wirkt überall, **bricht aber `position: fixed` in allen drei Engines** — die Wurzel-Ausnahme gilt nur für die Wurzel. Damit unbrauchbar. |
| Ausweg über `backdrop-filter: url()` auf einer festen Fläche? | Nur chromium. firefox und webkit melden `CSS.supports(…) === true` und tun dann nichts — ein `supports`-Ja ist hier keine Zusage. |

Drei Festlegungen folgen daraus:

1. **`invert` und die Hochkontrast-Modi sind Token-Overrides**, kein CSS-Filter.
   Damit ist die Top-Layer-Frage gegenstandslos — das Panel kann nicht schwarz
   werden, weil nichts invertiert wird. Echtes `filter` benutzen nur Graustufen,
   Sättigung und die Daltonisierung; dass das Panel die mitmacht, ist richtig:
   wer Graustufen einschaltet, will keine farbige Insel.
2. **Die Farbfehlsicht-Korrektur ist in Firefox abgeschaltet**, nicht sichtbar
   wirkungslos. Erkannt über `-moz-orient` (gemessen: nur Firefox) — als
   CSS-Eigenschaft in `a11y.css` **und** über `isCvdCorrectionSupported()` in
   JavaScript dieselbe Bedingung, kein User-Agent-Test. Ein Schalter, der sich
   umlegen lässt und nichts tut, ist schlimmer als einer, der ehrlich fehlt.
3. **Auf Seiten ohne Token-System (plain CSS) gibt es keinen Invert-Modus**, weil
   er dort nur per Filter ginge und in Firefox anders aussähe als in Chromium.

## Befehle

```bash
npm run typecheck   # tsc --noEmit
npm test            # baut und führt die Unit-Tests aus (22)
npm run demo        # Demo-Seite auf http://localhost:4173/demo/

# Browser-Prüfungen (Playwright, geliehen aus growcore-kundendashboard)
node tools/generate-cvd-filters.mjs        # Matrizen neu rechnen, 21 Prüfungen
node test/browser/effects.mjs              # jede CSS-Regel, chromium
ENGINES=all node test/browser/effects.mjs  # dieselben 106 Prüfungen ×3 Engines
```

Die Prüfungen in `test/browser/effects.mjs` messen jeweils die Größe, um die es
geht — Schriftgröße in Pixeln, Kontrastverhältnis, Pixelfarbe, Abstand zweier
Verwechslungsfarben — und tragen wo möglich eine **Kontrollmessung** daneben, die
belegt, dass die Messung überhaupt unterscheidet. Drei Fehler sind allein dadurch
aufgefallen: ein von Hand geratenes „Verwechslungspaar", das keins war; Messpunkte
außerhalb des Sichtbereichs, die als schwarze Fläche zurückkamen; und eine
Kontrollmessung, die von der Phase einer Animation abhing.
