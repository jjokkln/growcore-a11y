# Einbauanleitung — `@growcore/a11y`

**Diese Datei ist als Handout gedacht.** Wer ein neues GrowCore-Projekt baut — Mensch
oder KI — kann sie von vorne bis hinten abarbeiten. Sie setzt kein Wissen über
dieses Paket voraus und verweist auf nichts, was nicht öffentlich erreichbar ist:
<https://github.com/jjokkln/growcore-a11y>

Zielstack: **Next.js (App Router) + React**. Für andere Aufbauten siehe
[Abschnitt 8](#8-andere-aufbauten).

---

## 0. Bevor du anfängst: was dieses Paket ist und was nicht

Es ist ein **Komfort-Panel**, mit dem Besucher die Darstellung für sich anpassen:
Schriftgröße, Zeilen- und Buchstabenabstand, Kontrast, Farbfehlsicht-Ausgleich,
Blaulichtfilter, Bilder ausblenden, Lesehilfen.

**Es ist kein BFSG- oder WCAG-Nachweis, und das darf nirgends behauptet werden.**
Nicht im Marketing, nicht in einem Angebot, nicht in einem Badge auf der Seite.
Sachstand: Die gemeinsame Bewertung der Bund-Länder-Überwachungsstellen für
IT-Barrierefreiheit hält fest, dass eine nicht barrierefreie Website durch ein
Overlay nicht barrierefrei wird; in der WebAIM-Screenreader-Umfrage halten 67 %
der Befragten solche Werkzeuge für unwirksam, unter Menschen mit Behinderung 72 %;
accessiBe hat für Compliance-Versprechen ein FTC-Verfahren kassiert.

Maßstab des BFSG ist EN 301 549, praktisch WCAG 2.1 AA, und der betrifft die
Website selbst: `lang`-Attribut, Kontrastverhältnisse, Tastaturbedienbarkeit,
Alt-Texte, verknüpfte Labels, Überschriftenhierarchie, `prefers-reduced-motion`,
Erklärung zur Barrierefreiheit. **Das Panel erfüllt keinen dieser Punkte.** Es
kommt zu einer Seite dazu, die ihre Hausaufgaben gemacht hat.

Diese Anleitung enthält deshalb in Schritt 5 eine Pflichtseite und in Schritt 7
eine Prüfung. Beide gehören dazu, nicht „später".

---

## 1. Installieren

```bash
npm i "git+https://github.com/jjokkln/growcore-a11y.git#main"
```

Besser: auf einen **festen Commit** festnageln statt auf `main`, damit ein
späterer Stand nicht unbemerkt in einen Build rutscht:

```bash
npm i "git+https://github.com/jjokkln/growcore-a11y.git#<sha>"
```

Zwei Dinge, die dabei überraschen und **kein Fehler** sind:

- **npm schreibt `git+ssh://` in die Lockfile**, auch wenn du `git+https://`
  angibst. Das normalisiert `hosted-git-info` und lässt sich nicht abschalten. Auf
  einem Build-Server ohne SSH-Schlüssel (Vercel) fällt npm bei einem
  **öffentlichen** Repo auf HTTPS zurück — mit `npm ci` und
  `GIT_SSH_COMMAND=/bin/false` gegengemessen. **Würde das Repo privat gestellt,
  bricht der Build.**
- **`dist/` liegt nicht im Repo**, sondern entsteht beim Installieren über das
  `prepare`-Skript des Pakets. Nach dem Install muss
  `node_modules/@growcore/a11y/dist/react/index.js` existieren. Wenn nicht, ist
  der Build fehlgeschlagen — dann nachsehen, nicht weitermachen.

---

## 2. CSS einbinden

In die globale Stylesheet-Datei (bei Tailwind: `app/globals.css` oder
`src/app/globals.css`), **nach** den Tailwind-Importen:

```css
@import "tailwindcss";
/* … weitere Imports des Projekts … */

@import "@growcore/a11y/styles.css";   /* die Effekte */
@import "@growcore/a11y/panel.css";    /* das Panel selbst */
@import "@growcore/a11y/fonts.css";    /* die zwei Leseschriften */
```

**Alle drei, und in dieser Reihenfolge.** Warum jede einzelne:

- `styles.css` **nach** Tailwind, weil die Nutzerpräferenzen die Utilities
  überstimmen müssen — dafür tragen die Regeln dort `!important`.
- `panel.css` bringt eigene, harte Farben mit und benutzt **keine** Projekt-Token.
  Das ist Absicht: Das Panel ist die Bedienoberfläche für die Farbmodi und muss in
  jedem davon lesbar bleiben, sonst kann man sich nicht zurückschalten.
- `fonts.css` **nicht weglassen.** Ohne die `@font-face`-Regeln setzt `styles.css`
  nur den Familiennamen, der Browser fällt lautlos auf die Systemschrift zurück,
  und die zwei Schriftart-Optionen im Panel **tun nichts**. Genau so ist dieses
  Paket zuerst ausgeliefert worden.

---

## 3. Ins Root-Layout einhängen

```tsx
// app/layout.tsx  (bzw. src/app/layout.tsx)
import { A11yBootScript, A11yFilterDefs, A11yWidget } from "@growcore/a11y/react";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* MUSS in den <head>. Siehe unten. */}
        <A11yBootScript />
      </head>
      <body>
        {children}
        <A11yFilterDefs />
        <A11yWidget statementHref="/barrierefreiheit" />
      </body>
    </html>
  );
}
```

**Drei Regeln, die man nicht verletzen darf:**

1. **`<A11yBootScript />` gehört in den `<head>`.** Es setzt die gespeicherten
   Einstellungen auf `<html>`, während der Browser das HTML parst — also vor dem
   ersten Paint. Verschiebt man es in den Body oder ersetzt es durch einen
   `useEffect`, sieht jemand mit Hochkontrast-Einstellung bei **jedem**
   Seitenaufruf einen hellen Blitz. Next dokumentiert für persistierte
   UI-Zustände genau dieses Vorgehen; `useEffect` und `useLayoutEffect` laufen
   beide nach der Hydration und damit zu spät.
2. **`<A11yFilterDefs />` muss serverseitig gerendert werden** (also einfach im
   Layout stehen, nicht per JavaScript nachgeschoben). Das CSS kann beim ersten
   Paint bereits `filter: url(#gc-a11y-…)` setzen; fehlt das Ziel zu diesem
   Zeitpunkt, greift der Filter ins Leere — ohne Fehlermeldung.
3. **`<A11yWidget />` ins Root-Layout, nicht in ein Bereichs-Layout.** Es muss
   auch auf Login-, Fehler- und öffentlichen Seiten erreichbar sein — gerade dort,
   wo ein Fremder ohne Konto landet.

`suppressHydrationWarning` am `<html>`, weil das Bootskript Attribute setzt, die
der Server nicht kennt.

### Wo sitzt der Knopf?

Unten **links**, fest positioniert. Falls dort im Projekt schon etwas liegt: die
Klasse `.gc-a11y-trigger` überschreiben. Rechts unten ist bewusst frei gelassen,
weil dort meist Chat, Cookie-Hinweis oder ein Feedback-Knopf sitzt.

Das Panel liegt im **Top Layer** (native Popover-API) und braucht daher keinen
`z-index` — es liegt automatisch über allem.

---

## 4. Farbmodi ans Design anschließen

Die Kontrast-, Nacht- und Invert-Modi arbeiten, indem sie **Design-Token
überschreiben**. Mitgeliefert sind die Namen des shadcn/Tailwind-Standards:

```
--background --foreground --card --card-foreground --popover --popover-foreground
--primary --primary-foreground --secondary --secondary-foreground
--muted --muted-foreground --accent --accent-foreground
--border --input --ring --destructive --success --warning --info --review
--sidebar --sidebar-foreground --sidebar-border --sidebar-accent …
```

**Fall A — das Projekt benutzt diese Namen** (jedes shadcn-Projekt): nichts zu
tun. Karten, Knöpfe, Ränder folgen automatisch.

**Fall B — das Projekt hat eigene Token-Namen:** einen kleinen Block im
Projekt-CSS ergänzen, der die eigenen Namen aus den mitgelieferten speist:

```css
html[data-a11y-color] {
  --meine-flaeche: var(--background);
  --meine-schrift: var(--foreground);
}
```

**Fall C — das Projekt hat gar keine Token** (Farben stehen hart in den Regeln):
Dann kann kein Stylesheet Hochkontrast vollständig herstellen — jede Regel mit
eigenem `background-color` bleibt stehen. In diesem Fall **den Invert-Modus nicht
anbieten** und stattdessen erst eine Token-Ebene einführen. Halbfertiger
Hochkontrast ist schlechter lesbar als keiner.

---

## 5. Pflichtseite `/barrierefreiheit`

**Nicht optional.** Eine Erklärung zur Barrierefreiheit mit erreichbarem
Feedback-Kontakt ist die einzige der acht BFSG-Anforderungen, die mit diesem
Einbau überhaupt zusammenhängt — und die einzige, die eine Seite und kein
Bedienelement ist.

Sie muss **ohne Login** erreichbar sein: Wer wegen einer Barriere nicht bis zum
Login kommt, muss trotzdem melden können. Bei einer Middleware mit
Pfad-Whitelist also dort aussparen.

Inhalt, in dieser Reihenfolge:

1. **Angestrebter Standard** — WCAG 2.1 AA in der Fassung der EN 301 549.
2. **Stand der Vereinbarkeit**, ehrlich: „vollständig", „teilweise" oder „nicht".
   Ohne Audit ist die Antwort **„teilweise"**, mit dem Satz, dass keine
   vollständige Prüfung durch Dritte stattgefunden hat.
3. **Bekannte Einschränkungen**, benannt und nicht verallgemeinert. Immer dabei:
   der Farbausgleich fehlt in Firefox; hochgeladene Dateien (PDF, Word) sind nicht
   zugesichert.
4. **Was das Panel leistet und was nicht** — mit dem Satz, dass es keine
   barrierefreie Website ersetzt.
5. **Feedback-Kontakt** als `mailto:`, plus Antwortfrist und Hinweis auf die
   Marktüberwachungsstelle der Länder (MLBF).

Ein vorbildlich ausformuliertes Beispiel liegt in
`growcore-kundendashboard/src/app/(public)/barrierefreiheit/page.tsx` — zum
Abschreiben gedacht. Die Kontaktadresse dort ist projektabhängig und steht an
genau einer Stelle im Code.

**Eine Erklärung, die pauschal „vollständig konform" behauptet, ist schlechter als
eine, die Lücken benennt:** Sie ist meistens falsch, und die Bereitschaft zur
Nachbesserung ist genau das, was die Norm sehen will.

---

## 6. Sprunglink und `<main>`

Falls die Seite ein Anwendungsgerüst mit Navigation hat, braucht sie einen
Sprunglink (WCAG 2.4.1). Ohne ihn muss ein Tastaturnutzer auf **jeder** Seite
zuerst die komplette Navigation durchtabben.

```tsx
<a
  href="#hauptinhalt"
  className="fixed -top-24 left-3 z-50 rounded-md bg-background px-4 py-2 shadow-lg ring-2 ring-ring transition-[top] focus:top-3 focus:outline-none motion-reduce:transition-none"
>
  Zum Hauptinhalt springen
</a>
…
<main id="hauptinhalt">…</main>
```

**Nicht `sr-only` + `focus:not-sr-only` verwenden.** Die beiden setzen `position`
gegenläufig (`absolute` bzw. `static`), und welche Regel gewinnt, hängt von der
Reihenfolge im erzeugten Tailwind-CSS ab, nicht von der Reihenfolge im
`className`. Ergebnis: Der Link ist per Tab erreichbar, bleibt beim Fokus aber
unsichtbar — und das sieht in einem Screenshot genauso aus wie kein Sprunglink.

---

## 7. Prüfen — mit Messung, nicht mit Blick

Diese sechs Punkte gehören zur Definition of Done. Das ausführbare Muster liegt in
`growcore-kundendashboard/scripts/a11y-widget.verify.mjs` (27 Prüfungen,
Playwright + axe-core) und ist zum Kopieren gedacht.

1. **Tastatur allein:** Tab bis zum Knopf, Enter öffnet, alle Bedienelemente
   erreichbar, `Escape` schließt, **Fokus liegt danach wieder auf dem Knopf**.
   Keine Falle.
2. **axe-core bei OFFENEM Panel** — keine kritischen oder schweren Befunde.
   `npx @axe-core/cli <url> --exit` oder axe im Browser injizieren. Achtung: ein
   Checker findet höchstens ein Drittel; die Handprüfung ersetzt er nicht.
3. **Kontrast der Modi messen**, nicht ansehen: Hochkontrast muss ≥ 7:1 liefern.
   Pixel aus einem Screenshot, Leuchtdichte rechnen.
4. **Bei 175 % Schrift** kein waagerechtes Scrollen (WCAG 1.4.10). Besonders
   wichtig bei Layouts mit `height: 100dvh; overflow: hidden`.
5. **Kein Flackern:** Einstellung setzen, neu laden. Der Beweis ist nicht
   „sieht gut aus", sondern: einen `MutationObserver` **vor** allen Seitenskripten
   installieren und prüfen, dass das Attribut erscheint, **während `<body>` noch
   leer ist**.
6. **Zurücksetzen** entfernt alle `data-a11y-*`-Attribute restlos.

Zwei Fallstricke beim Prüfen selbst, beide teuer gelernt:

- **Ein Messpunkt außerhalb des Sichtbereichs** liefert aus einem Screenshot
  `rgb(0,0,0)`. Das sieht aus wie „schwarze Fläche" und heißt „nicht abgebildet".
  Vorher in den Sichtbereich scrollen.
- **`font-family` enthält den Namen** ist keine Prüfung, ob die Schrift geladen
  ist — der Name steht auch dann da, wenn der Browser zurückfällt. Stattdessen
  `document.fonts.check()` **und** eine gemessene Inline-Breite.

---

## 8. Andere Aufbauten

**Kein Next, aber React:** identisch, nur ohne `A11yBootScript` im `<head>` —
stattdessen das Skript selbst ausgeben:

```ts
import { bootScript } from "@growcore/a11y";
// bootScript() liefert den Text für ein <script> im <head>.
```

**Kein React:** Es gibt (noch) kein fertiges `<script>`-Bundle. Der Kern ist
framework-frei; ein IIFE-Einstieg um `applySettings`, `bootScript`,
`ensureCvdSvg` und ein selbst gebautes Panel ist überschaubar. Wenn du das baust,
gehört es **ins Paket** und nicht ins Projekt.

**Mit einer Content-Security-Policy:** `<A11yBootScript nonce={nonce} />`.

---

## 9. Bekannte Grenzen (gemessen, nicht vermutet)

| Grenze | Warum |
| --- | --- |
| **Farbfehlsicht-Ausgleich fehlt in Firefox** | Firefox wendet SVG-`url(#…)`-Filter nicht auf `<html>` an. Fünf Schreibweisen geprüft; auf einem `<div>` geht es überall, es ist also die Wurzel und nicht die Syntax. `<body>` würde funktionieren, bricht aber `position: fixed` in allen drei Engines. `backdrop-filter: url()` wirkt nur in Chromium. Das Panel erkennt das über `-moz-orient` und blendet die Option aus statt sie wirkungslos anzubieten. |
| **Kein Invert-Modus ohne Token-System** | siehe Abschnitt 4, Fall C. |
| **Layout „zoomt" bei großer Schrift** | Die Schriftgröße läuft über `html { font-size }`, damit die `rem`-Typoskala und Tailwinds `text-sm` mitwachsen, ohne dass eine Liste gepflegt werden muss. `rem`-Abstände wachsen mit. Auf Fließtextseiten ist das richtig; bei `100dvh`-Layouts gegenprüfen. |
| **Kein Vorlesen (Text-to-Speech)** | Bewusst nicht gebaut. Chrome bricht Äußerungen nach ~15 s ab, die Stimmenqualität ist geräteabhängig, Firefox für Android kann es gar nicht — und Nutzer, die Vorlesen brauchen, haben in der Regel eine bessere Lösung installiert. |

---

## 10. Wenn du etwas änderst

**Fehler und neue Optionen gehören ins Paket-Repo, nicht ins Projekt.** Der
Verlockung, „nur schnell hier" eine Regel zu überschreiben, ist der Grund, warum
es das Paket gibt.

Ablauf: im Paket ändern → `npm test` (22 Unit-Tests) →
`ENGINES=all node test/browser/effects.mjs` (115 Messungen ×3 Engines) →
committen und pushen → im Projekt den SHA hochziehen, `npm i`, Prüfung aus
Abschnitt 7 laufen lassen.

Eine neue Einstellung ist **ein Eintrag in `src/core/schema.ts`** plus die Regel in
`src/styles/a11y.css` plus eine Beschriftung in `src/react/labels.ts`. Alles
andere — Typ, Standardwert, DOM-Projektion, Validierung, Bootskript — leitet sich
daraus ab. Wenn du an mehr als diesen drei Stellen etwas anfassen musst, ist der
Entwurf falsch.
