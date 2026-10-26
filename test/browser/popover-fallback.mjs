/**
 * Panel ohne Popover-API (Safari vor 17, iPadOS 16) — gemessen in echten Engines.
 *
 *   npm run build && node test/browser/popover-fallback.mjs
 *   ENGINES=all node test/browser/popover-fallback.mjs     (chromium + webkit)
 *
 * Kein Server, kein Port: die Dateien liefert `page.route` direkt von der Platte.
 *
 * Drei Teile, jeder mit Gegenprobe:
 *
 * A — CSS wie in Safari 16. Kein heutiger Browser verwirft `:popover-open`.
 *     Also wird `panel.css` beim Ausliefern so umgeschrieben, dass der Selektor
 *     unbekannt ist (`:popover-open` → `:gc-unbekannt`): Die Regel mit ihm fällt
 *     dann ganz weg, und `@supports not selector(…)` trifft zu — genau das
 *     Parserverhalten von Safari 16. Dazu fehlt Safari 16 die UA-Regel
 *     `[popover]:not(:popover-open) { display: none }`, die heutige Engines
 *     mitbringen; nachgestellt über eine Autorenregel `[popover] { display: block }`
 *     (schwächer als jede `.gc-a11y-panel`-Regel). Gegenprobe: dieselbe Datei OHNE die
 *     Rückfallregeln muss das Panel sichtbar lassen (der gemeldete Fehler).
 *     Sonst misst der Test nichts.
 *
 * B — Die JS-Rückfallebene. Vor jedem Skript werden `togglePopover`,
 *     `showPopover`, `hidePopover` gelöscht und `CSS.supports` für
 *     `selector(:popover-open)` auf `false` gestellt. Geprüft: Öffnen über den
 *     Knopf, Escape, Klick daneben, Schließen-Knopf, Fokus zurück, und dass das
 *     Panel über einem fixierten Element mit hohem z-index liegt.
 *
 * C — Gegenprobe nativ: ohne Eingriff meldet `isPopoverSupported()` `true`, die
 *     Rückfallebene wird nicht angehängt und das Panel öffnet trotzdem.
 */
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const PLAYWRIGHT =
  process.env.PLAYWRIGHT ??
  "/Users/lennardkuss/.claude/tools/ui-verify/node_modules/playwright/index.js";
const { default: pw } = await import(PLAYWRIGHT);

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const ORIGIN = "http://a11y.test";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

const ENGINES =
  process.env.ENGINES === "all"
    ? [["chromium", pw.chromium], ["webkit", pw.webkit]]
    : [["chromium", pw.chromium]];

const PAGE = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<link rel="stylesheet" href="/src/styles/panel.css">
<style>
  body { margin: 0; height: 1400px; font: 16px system-ui }
  /* Ein Kopf wie in echten Projekten: fixiert, hoher z-index, über der Ecke. */
  #kopf { position: fixed; left: 0; right: 0; bottom: 0; height: 40rem;
          z-index: 2147483000; background: rgb(255 0 0 / 0.2); pointer-events: none }
</style></head>
<body>
  <button id="draussen" type="button" style="margin: 2rem">Etwas anderes</button>
  <div id="kopf"></div>
  <button id="ausloeser" type="button" class="gc-a11y-trigger"
          popovertarget="panel" popovertargetaction="toggle" aria-expanded="false">A</button>
  <div id="panel" popover="auto" class="gc-a11y-panel" role="dialog" aria-label="Barrierefreiheit">
    <div class="gc-a11y-head"><h2 class="gc-a11y-title">Barrierefreiheit</h2>
      <button id="zu" type="button" class="gc-a11y-close"
              popovertarget="panel" popovertargetaction="hide" aria-label="Schließen">x</button></div>
    <div class="gc-a11y-body"><label class="gc-a11y-switch"><input id="schalter" type="checkbox"> Schalter</label></div>
  </div>
  <script type="module">
    import { isPopoverSupported, attachPopoverFallback } from "/dist/core/index.js";
    window.__nativ = isPopoverSupported();
    if (!window.__nativ) window.__fallback = attachPopoverFallback(document.getElementById("panel"));
    window.__bereit = true;
  </script>
</body></html>`;

/** Entfernt die Popover-API, wie Safari 16 sie nicht hat. */
const OHNE_POPOVER_API = () => {
  for (const name of ["togglePopover", "showPopover", "hidePopover"]) {
    delete HTMLElement.prototype[name];
  }
  const supports = CSS.supports.bind(CSS);
  CSS.supports = (...args) =>
    args.length === 1 && /:popover-open/.test(args[0]) ? false : supports(...args);
};

/** Schreibt panel.css so um, wie Safari 16 sie liest. */
const wieSafari16 = (css) => css.replaceAll(":popover-open", ":gc-unbekannt");
/** Dieselbe Datei ohne die neuen Rückfallregeln — der Stand vor dem Fix. */
const ohneRueckfall = (css) =>
  css
    .replace(/\.gc-a11y-panel:not\(\[popover\]\):not\(\[data-gc-a11y-open\]\) \{[^}]*\}/, "")
    .replace(/@supports not selector\(:gc-unbekannt\) \{[\s\S]*?\n\}\n/, "");

let checks = 0;
let failures = 0;
function check(engine, name, ok, detail = "") {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? "✔" : "✘"} [${engine}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function open(browser, { css = (s) => s, html = PAGE, init } = {}) {
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  if (init) await page.addInitScript(init);
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/") return route.fulfill({ contentType: "text/html", body: html });
    const file = join(ROOT, normalize(path));
    if (!file.startsWith(ROOT)) return route.fulfill({ status: 403 });
    try {
      let body = await readFile(file, "utf8");
      if (path.endsWith("panel.css")) body = css(body);
      return route.fulfill({ contentType: TYPES[extname(file)] ?? "text/plain", body });
    } catch {
      return route.fulfill({ status: 404 });
    }
  });
  await page.goto(`${ORIGIN}/`);
  return page;
}

const sichtbar = (page) =>
  page.evaluate(() => getComputedStyle(document.getElementById("panel")).display !== "none");
const fokus = (page) => page.evaluate(() => document.activeElement?.id ?? null);

async function run(engine, type) {
  const browser = await type.launch();
  try {
    // ---- A: CSS wie in Safari 16, vor der Hydration (kein Skript) -----------
    const ohneSkript = PAGE.replace(/<script type="module">[\s\S]*?<\/script>/, "").replace(
      '<link rel="stylesheet"',
      '<style>[popover] { display: block }</style><link rel="stylesheet"',
    );
    let page = await open(browser, { css: (s) => ohneRueckfall(wieSafari16(s)), html: ohneSkript });
    check(engine, "A Gegenprobe: ohne Rückfallregeln steht das Panel offen (der Fehler)", await sichtbar(page));
    await page.close();

    page = await open(browser, { css: wieSafari16, html: ohneSkript });
    check(engine, "A mit Rückfallregeln: Panel vor der Hydration verborgen", !(await sichtbar(page)));
    await page.close();

    // ---- B: JS-Rückfallebene ohne Popover-API --------------------------------
    page = await open(browser, { css: wieSafari16, init: OHNE_POPOVER_API });
    await page.waitForFunction(() => window.__bereit);
    check(engine, "B isPopoverSupported() meldet false", (await page.evaluate(() => window.__nativ)) === false);
    check(
      engine,
      "B popover-Attribut entfernt",
      !(await page.evaluate(() => document.getElementById("panel").hasAttribute("popover"))),
    );
    check(engine, "B anfangs verborgen", !(await sichtbar(page)));

    await page.click("#ausloeser");
    check(engine, "B Klick auf den Knopf öffnet", await sichtbar(page));
    check(
      engine,
      "B aria-expanded=true",
      (await page.getAttribute("#ausloeser", "aria-expanded")) === "true",
    );
    const lage = await page.evaluate(() => {
      const p = document.getElementById("panel").getBoundingClientRect();
      const t = document.getElementById("ausloeser").getBoundingClientRect();
      const hit = document.elementFromPoint(p.left + p.width / 2, p.top + 20);
      return { ueber: p.bottom <= t.top, oben: document.getElementById("panel").contains(hit) };
    });
    check(engine, "B Panel sitzt über dem Knopf", lage.ueber);
    check(engine, "B Panel liegt über fixiertem Element mit z-index 2147483000", lage.oben);

    await page.focus("#schalter");
    await page.keyboard.press("Escape");
    check(engine, "B Escape schließt", !(await sichtbar(page)));
    check(engine, "B Fokus nach Escape zurück auf dem Knopf", (await fokus(page)) === "ausloeser");

    await page.click("#ausloeser");
    await page.click("#schalter");
    check(engine, "B Klick im Panel lässt es offen", await sichtbar(page));
    await page.mouse.click(600, 60);
    check(engine, "B Klick daneben schließt", !(await sichtbar(page)));

    await page.click("#ausloeser");
    await page.click("#zu");
    check(engine, "B Schließen-Knopf schließt", !(await sichtbar(page)));
    check(engine, "B Fokus nach Schließen-Knopf auf dem Knopf", (await fokus(page)) === "ausloeser");
    check(
      engine,
      "B aria-expanded=false",
      (await page.getAttribute("#ausloeser", "aria-expanded")) === "false",
    );

    await page.click("#ausloeser");
    await page.click("#ausloeser");
    check(engine, "B zweiter Klick auf den Knopf schließt", !(await sichtbar(page)));

    await page.focus("#draussen");
    await page.evaluate(() => window.__fallback.toggle());
    check(engine, "B toggle() (Tastenkürzel) öffnet", await sichtbar(page));
    await page.focus("#schalter");
    await page.keyboard.press("Escape");
    check(engine, "B Fokus nach Kürzel+Escape zurück, wo er war", (await fokus(page)) === "draussen");
    await page.close();

    // ---- C: Gegenprobe nativ ---------------------------------------------------
    page = await open(browser);
    await page.waitForFunction(() => window.__bereit);
    check(engine, "C nativ: isPopoverSupported() meldet true", (await page.evaluate(() => window.__nativ)) === true);
    check(engine, "C nativ: anfangs verborgen", !(await sichtbar(page)));
    await page.click("#ausloeser");
    check(
      engine,
      "C nativ: öffnet als :popover-open",
      await page.evaluate(() => document.getElementById("panel").matches(":popover-open")),
    );
    await page.keyboard.press("Escape");
    check(engine, "C nativ: Escape schließt", !(await sichtbar(page)));
    await page.close();
  } finally {
    await browser.close();
  }
}

for (const [name, type] of ENGINES) await run(name, type);
console.log(`\n${checks - failures}/${checks} Prüfungen grün`);
process.exit(failures ? 1 : 0);
