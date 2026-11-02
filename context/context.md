# @growcore/a11y — Code-Kontext

> Wegweiser für Agenten: wie der Code gebaut ist und wo man was anfasst.
> Stand, offene Aufgaben und Funktionen stehen im AI-OS
> (`10_Projects/growcore-a11y/`, lädt als Steckbrief beim Start). Höchstens 15 KB.

## Was das ist

Ein npm-Paket (privat, nicht in der npm-Registry): Barrierefreiheits-Panel für
GrowCore-Websites. Besucher stellen Schriftgröße, Abstände, Kontrast, Farbfehlsicht-Ausgleich,
Blaulichtfilter, Bilder-aus und Lesehilfen selbst ein, der Browser merkt sie sich.
Kern ohne Framework (nur DOM), dazu eine React-Hülle. Kein Konformitätswerkzeug
für das BFSG, das steht in `README.md` und darf nirgends anders behauptet werden.
Eingebaut wird es in Next.js-Projekte, die Anleitung dazu ist `INSTALL.md`.

## Ich will … → Datei

| Ich will … | Schau in |
| --- | --- |
| eine neue Einstellung hinzufügen | drei Stellen: `src/core/schema.ts` (Eintrag), `src/styles/a11y.css` (Regel), `src/react/labels.ts` (Beschriftung). Dann Bedienelement in `src/react/A11yWidget.tsx` |
| einen Export ändern oder neu anbieten | `src/core/index.ts` (Kern), `src/react/index.ts` (React). Zugriffspunkte nach außen: `exports` in `package.json` |
| die Wirkung einer Einstellung ändern | `src/styles/a11y.css` (Effekte), `src/core/project.ts` (Einstellung → Attribut und CSS-Variable auf `<html>`) |
| das Flackern beim Laden verstehen oder ändern | `src/core/boot.ts`, `src/react/A11yBootScript.tsx` |
| das Panel (Aussehen, Bedienung) ändern | `src/react/A11yWidget.tsx`, `src/styles/panel.css`, Texte in `src/react/labels.ts` |
| das Panel für Safari vor 17 reparieren | `src/core/popover-fallback.ts`, `src/core/capabilities.ts` |
| die Farbfehlsicht-Matrizen ändern | `tools/generate-cvd-filters.mjs` ausführen. `src/core/cvd-filters.ts` ist erzeugt, nie von Hand ändern |
| Lesemaske oder Leselineal ändern | `src/core/overlays.ts`, Regeln in `src/styles/a11y.css` |
| speichern und lesen der Einstellungen ändern | `src/core/storage.ts`, `src/core/settings.ts` (Defaults, `sanitize`) |
| eine Schrift ändern | `fonts/`, `fonts/fonts.css` |
| die Version heben | `version` in `package.json`, committen, pushen. Projekte nageln den Commit-SHA fest (siehe unten) |
| das Paket in einem Kundenprojekt einbinden oder hochziehen | `INSTALL.md` (Schritte 1 bis 7 und Abschnitt 10) |
| testen | `test/*.test.mjs` (Unit), `test/browser/` (Playwright, Messungen) · Befehle unten |
| die Demo ansehen | `demo/index.html`, `demo/serve.mjs` |

## Aufbau auf einer Seite

- **Stack:** TypeScript, ES-Module, `tsc` baut nach `dist/` (nicht im Repo, `.gitignore`). React ist optionale Peer-Abhängigkeit (`>=18`). Keine Laufzeitabhängigkeit, keine UI-Bibliothek, kein Tailwind im Paket.
- **Ordner:**
  - `src/core/` — Kern, kennt nur das DOM.
  - `src/react/` — `A11yWidget`, `A11yBootScript`, `A11yFilterDefs`, `useA11y`, `A11Y_LABELS`.
  - `src/styles/` — `a11y.css` (Effekte) und `panel.css` (Panel). Reines CSS, Namensraum `gc-a11y-*` im Panel.
  - `fonts/` — Atkinson Hyperlegible und OpenDyslexic (OFL) mit `fonts.css`.
  - `tools/` — Generator für die Farbfehlsicht-Matrizen. `test/`, `demo/`.
- **Zugriffspunkte (`exports`):** 6 Stück: `.` (Kern), `./react`, `./styles.css`, `./panel.css`, `./fonts.css`, `./fonts/*`. Kern und React kommen aus `dist/`. Das Stylesheet kommt direkt aus `src/styles/`.
- **Datenfluss:** Das Schema in `src/core/schema.ts` beschreibt 17 Einstellungen als Datentabelle (Arten `enum`, `step`, `flag`). Aus ihm leiten sich Typen, Standardwerte, die Projektion ins DOM, die Prüfung gelesener Werte und das Bootskript ab. Das Panel schreibt in `localStorage` (Schlüssel `growcore.a11y`) → `applySettings` setzt `data-a11y-*`-Attribute und CSS-Variablen auf `<html>` → `a11y.css` macht daraus die Wirkung.
- **Bootskript:** Es läuft als Text im `<head>` vor dem ersten Paint. Dieselbe Funktion `projectToDom` wird einmal normal aufgerufen und einmal per `toString()` in den Skripttext übernommen. Sie darf deshalb nichts außerhalb ihrer Parameter benutzen. Der Test `test/boot.test.mjs` führt den Text aus und fängt das ab.
- **Farbmodi:** Kontrast-, Nacht- und Invert-Modus überschreiben Design-Token des Projekts (shadcn-Namen). Echte `filter` nutzen nur Graustufen, Sättigung und Farbfehlsicht-Ausgleich. Der Ausgleich ist in Firefox abgeschaltet, erkannt über `-moz-orient`.
- **Rollen:** keine. Das Paket hat weder Konten noch Daten auf einem Server.

## Regeln, die nie gebrochen werden

- Nie behaupten, das Panel mache eine Seite BFSG- oder WCAG-konform. Kein Badge, keine Formulierung dazu.
- Keine automatische ARIA- oder Alt-Text-Injektion, keine Erkennung von Hilfstechnologie, kein „Screenreader-Modus“ (Gründe in `README.md`).
- Fehler und neue Optionen gehören ins Paket, nie als Überschreibung ins Kundenprojekt.
- `src/core/cvd-filters.ts` ist erzeugt. Änderungen nur über `tools/generate-cvd-filters.mjs`.
- Eine neue Einstellung braucht nur die drei Stellen oben. Muss mehr angefasst werden, ist der Entwurf falsch.
- Das Repo (`github.com/jjokkln/growcore-a11y`) muss öffentlich bleiben. Ein Build ohne SSH-Schlüssel (Vercel) holt es per HTTPS.

## Befehle

```bash
npm run typecheck                           # tsc --noEmit
npm test                                    # baut und führt test/*.test.mjs aus
npm run demo                                # http://localhost:4173/demo/
node tools/generate-cvd-filters.mjs         # Matrizen neu rechnen, mit Prüfungen
node test/browser/effects.mjs               # CSS-Wirkung messen, chromium
ENGINES=all node test/browser/effects.mjs   # dieselben Messungen in drei Engines
ENGINES=all node test/browser/popover-fallback.mjs
```

Die Browser-Skripte brauchen Playwright. Es ist keine Abhängigkeit des Pakets, sie laden es über einen absoluten Pfad aus `growcore-kundendashboard` (siehe `test/browser/README.md`).

Einbinden in ein Projekt: `npm i "git+https://github.com/jjokkln/growcore-a11y.git#<sha>"`, SHA festnageln, nicht `main`. `dist/` entsteht beim Installieren über das `prepare`-Skript.

## Themen-Dateien

| Datei | Inhalt |
| --- | --- |
| `README.md` | Was das Paket nicht ist, Aufbau, warum das Schema eine Datentabelle ist, gemessene Browser-Eigenschaften, Befehle |
| `INSTALL.md` | Einbauanleitung für Projekte (Next.js), Farbmodi anschließen, Pflichtseite `/barrierefreiheit`, Prüfung, Grenzen, Änderungsablauf |
| `test/browser/README.md` | Die zwei Browser-Messungen, die die Architektur bestimmt haben |

## Unklar

- Die Zahlen der Prüfungen weichen zwischen Dateien ab (`README.md`: 22 Unit-Tests und 106 Messungen, `INSTALL.md`: 22 und 115). Nicht nachgemessen.
- Ob `tools/generate-cvd-filters.mjs` und die Browser-Skripte in dieser Umgebung laufen, nicht geprüft. Playwright liegt nicht im Repo.
- Es gibt keine Git-Tags. Welche Version ein Projekt nutzt, steht nur im festgenagelten SHA, nicht in einer Versionsnummer.
