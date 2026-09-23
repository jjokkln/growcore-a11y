/**
 * Prüft jede Regel aus `src/styles/a11y.css` gegen die Demo-Seite — gemessen,
 * nicht angesehen.
 *
 *   node test/browser/effects.mjs            (nur chromium, schnell)
 *   ENGINES=all node test/browser/effects.mjs
 *
 * Der Server wird selbst gestartet und am Ende beendet.
 *
 * Grundsatz für jede Prüfung hier: Es genügt nicht, dass sich IRGENDETWAS
 * ändert. Gemessen wird die Größe, um die es geht — Schriftgröße in Pixeln,
 * Kontrastverhältnis, Pixelfarbe, Abstand zweier Verwechslungsfarben. Und wo es
 * möglich ist, steht eine Kontrollmessung daneben, die belegt, dass die Messung
 * überhaupt unterscheidet. Ein Test, der auch bei kaputtem CSS grün wäre, ist
 * schlimmer als keiner.
 */
import { spawn } from "node:child_process";
import pw from "/Users/lennardkuss/Code_Aktuell/growcore-kundendashboard/node_modules/playwright/index.js";

const { chromium, firefox, webkit } = pw;
const PORT = 4179;
const URL_ = `http://127.0.0.1:${PORT}/demo/`;

const ENGINES =
  process.env.ENGINES === "all"
    ? [["chromium", chromium], ["firefox", firefox], ["webkit", webkit]]
    : [["chromium", chromium]];

let failures = 0;
let checks = 0;

function ok(name, condition, detail) {
  checks++;
  if (condition) {
    console.log(`  ok    ${name}${detail ? `  (${detail})` : ""}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ""}`);
  }
}

// ── Helfer im Seitenkontext ────────────────────────────────────────────────
const setSetting = (page, name, value) =>
  page.evaluate(([n, v]) => window.__a11yDemo.set(n, v), [name, value]);

const reset = (page) =>
  page.evaluate(() => {
    window.__a11yDemo.set("textScale", 0);
    document.getElementById("reset").click();
  });

const computed = (page, selector, prop) =>
  page.evaluate(
    ([s, p]) => getComputedStyle(document.querySelector(s)).getPropertyValue(p),
    [selector, prop],
  );

async function pixels(page, points) {
  const shot = await page.screenshot();
  const dataUri = `data:image/png;base64,${shot.toString("base64")}`;
  return page.evaluate(
    async ({ dataUri, points }) => {
      const img = new Image();
      img.src = dataUri;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return points.map(([x, y]) => {
        const d = ctx.getImageData(x, y, 1, 1).data;
        return [d[0], d[1], d[2]];
      });
    },
    { dataUri, points },
  );
}

/**
 * Mittelpunkt eines Elements in Viewport-Koordinaten — nach dem Scrollen in den
 * Sichtbereich.
 *
 * Das Scrollen ist nicht Bequemlichkeit, sondern der Unterschied zwischen Messen
 * und Nichtmessen: Ein Screenshot enthält nur den Sichtbereich, und ein Pixel
 * außerhalb liefert aus der Canvas rgb(0,0,0) — also ein Ergebnis, das nach
 * "schwarze Fläche" aussieht und in Wahrheit "nicht abgebildet" heißt. Genau
 * daran sind im ersten Lauf fünf Prüfungen falsch umgefallen.
 */
async function centerOf(page, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(60);
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`kein Kasten für ${selector}`);
  const point = [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)];
  const size = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
  if (point[0] < 0 || point[1] < 0 || point[0] >= size[0] || point[1] >= size[1]) {
    throw new Error(`${selector} liegt trotz Scrollen außerhalb des Sichtbereichs`);
  }
  return point;
}

const srgbToLin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) =>
  0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
const contrast = (a, b) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const px = (s) => parseFloat(s);

// ── Die Prüfungen ─────────────────────────────────────────────────────────
async function run(engineName, type) {
  console.log(`\n### ${engineName}`);
  const browser = await type.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await page.goto(URL_, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__a11yDemo);

  // --- 1. Schriftgröße ----------------------------------------------------
  const baseRoot = px(await computed(page, "html", "font-size"));
  const baseP = px(await computed(page, "#content p", "font-size"));
  await setSetting(page, "textScale", 3); // 150 %
  const bigRoot = px(await computed(page, "html", "font-size"));
  const bigP = px(await computed(page, "#content p", "font-size"));
  ok(
    "Schriftgröße Stufe 3 skaliert die Wurzel um 1,5×",
    Math.abs(bigRoot / baseRoot - 1.5) < 0.02,
    `${baseRoot}px → ${bigRoot}px`,
  );
  ok(
    "… und der Fließtext wächst mit",
    bigP > baseP * 1.4,
    `${baseP}px → ${bigP}px`,
  );
  await reset(page);
  ok(
    "Zurücksetzen stellt die Schriftgröße wieder her",
    Math.abs(px(await computed(page, "html", "font-size")) - baseRoot) < 0.5,
  );

  // --- 2. Zeilenhöhe und Laufweite ---------------------------------------
  const lh0 = px(await computed(page, "#content p", "line-height"));
  await setSetting(page, "leading", "loose");
  const lh1 = px(await computed(page, "#content p", "line-height"));
  ok("Zeilenhöhe „loose“ erhöht die Zeilenhöhe", lh1 > lh0 * 1.15, `${lh0} → ${lh1}`);
  // Kontrolle: eine Überschrift ist absichtlich NICHT betroffen.
  const h2Before = px(await computed(page, "#content h2", "line-height"));
  await reset(page);
  await setSetting(page, "leading", "loose");
  ok(
    "Überschriften bleiben absichtlich unberührt",
    Math.abs(px(await computed(page, "#content h2", "line-height")) - h2Before) < 0.5,
  );
  await reset(page);

  await setSetting(page, "tracking", "wider");
  const ls = await computed(page, "#content p", "letter-spacing");
  ok(
    "Laufweite „wider“ trifft den WCAG-Wert 0,12em",
    px(ls) > 0 && Math.abs(px(ls) / baseP - 0.12) < 0.02,
    `${ls} bei ${baseP}px Schrift`,
  );
  await reset(page);

  // --- 3. Ausrichtung ----------------------------------------------------
  ok(
    "Blocksatz liegt vorher wirklich vor (Kontrolle)",
    (await computed(page, ".justified", "text-align")) === "justify",
  );
  await setSetting(page, "align", "left");
  const align = await computed(page, ".justified", "text-align");
  ok("Blocksatz wird aufgehoben", align === "start" || align === "left", align);
  await reset(page);

  // --- 4. Schriftart -----------------------------------------------------
  //
  // Die naheliegende Prüfung — `font-family` enthält "OpenDyslexic" — ist
  // wertlos: Sie ist auch dann grün, wenn die Schrift gar nicht geladen wurde,
  // weil `a11y.css` den Namen ja setzt und der Browser dann lautlos auf die
  // Systemschrift zurückfällt. Genau so ist das Paket zuerst ausgeliefert worden:
  // fonts/ war leer, es gab keine @font-face-Regeln, und beide Schriftoptionen
  // taten nichts. Also zwei echte Prüfungen:
  //   (a) document.fonts.check() sagt, ob die Familie tatsächlich verfügbar ist
  //   (b) die gemessene Textbreite ändert sich — der Beweis, dass auch gerendert
  //       wird, was verfügbar gemeldet wurde
  // Inline-Breite, nicht Absatzhöhe: ein Absatz ist breitenbeschränkt, seine
  // Höhe ändert sich nur, wenn die Zeilenzahl umschlägt. Bei Atkinson
  // Hyperlegible, dessen Metriken system-ui nahe sind, tut sie das nicht — die
  // erste Fassung dieser Prüfung meldete deshalb „keine Änderung", obwohl die
  // Schrift korrekt geladen und gerendert war.
  const widthOf = () =>
    page.evaluate(() => document.getElementById("type-probe").getBoundingClientRect().width);

  for (const [value, family] of [
    ["readable", "Atkinson Hyperlegible"],
    ["dyslexic", "OpenDyslexic"],
  ]) {
    await reset(page);
    const heightBefore = await widthOf();
    await setSetting(page, "font", value);
    const loaded = await page.evaluate(async (f) => {
      await document.fonts.ready;
      return document.fonts.check(`16px "${f}"`);
    }, family);
    ok(`Schrift „${family}“ ist wirklich geladen`, loaded);
    ok(
      `… und ${family} wird wirklich gerendert`,
      Math.abs((await widthOf()) - heightBefore) > 0.5,
      `Messstrecke ${heightBefore.toFixed(1)}px → ${(await widthOf()).toFixed(1)}px`,
    );
  }
  await reset(page);

  // --- 5. Farbmodi: gemessenes Kontrastverhältnis ------------------------
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);
  const cardPoint = await centerOf(page, ".card");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);
  for (const [mode, min] of [
    ["contrast-light", 15],
    ["contrast-dark", 15],
  ]) {
    await setSetting(page, "color", mode);
    // Text- und Flächenpixel am Ort der Überschrift: das dunkelste und das
    // hellste Pixel im Umfeld sind Vordergrund und Hintergrund.
    const region = await page.evaluate(async () => {
      const r = document.querySelector("#content h1").getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    });
    // Nur Punkte INNERHALB des Sichtbereichs: außerhalb liefert die Canvas
    // rgb(0,0,0), und ein Feld aus lauter Schwarz ergibt ein Verhältnis von
    // 1,0:1 — was wie „kein Kontrast" aussieht und „nicht abgebildet" heißt.
    // Genau daran ist der Firefox-Lauf zuerst falsch umgefallen.
    const view = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
    const samples = [];
    for (let x = region[0]; x < region[0] + Math.min(region[2], 220); x += 2) {
      for (let y = region[1]; y < region[1] + region[3]; y += 2) {
        if (x >= 0 && y >= 0 && x < view[0] && y < view[1]) samples.push([x, y]);
      }
    }
    ok(
      `Überschrift liegt für „${mode}“ messbar im Sichtbereich`,
      samples.length > 200,
      `${samples.length} Messpunkte`,
    );
    const cols = await pixels(page, samples);
    const lums = cols.map(luminance);
    const darkest = cols[lums.indexOf(Math.min(...lums))];
    const lightest = cols[lums.indexOf(Math.max(...lums))];
    const ratio = contrast(darkest, lightest);
    ok(
      `Farbmodus „${mode}“ erreicht ≥ ${min}:1 an der Überschrift`,
      ratio >= min,
      `gemessen ${ratio.toFixed(1)}:1`,
    );
    // Und die Kartenfläche muss mitgezogen worden sein — das ist der Test
    // dafür, dass die Token-Overrides greifen und nicht nur body umgefärbt ist.
    const [card] = await pixels(page, [cardPoint]);
    const wantDark = mode === "contrast-dark";
    ok(
      `… und die Kartenfläche folgt (${wantDark ? "schwarz" : "weiß"})`,
      wantDark ? luminance(card) < 0.05 : luminance(card) > 0.9,
      `rgb(${card.join(",")})`,
    );
    await reset(page);
  }

  // --- 5b. Linkfarbe: nur Textlinks, nur in den Hochkontrast-Stufen ------
  // Gemessen wird die berechnete Farbe, nicht ein Pixel: Es geht darum, WELCHE
  // Regel greift. Kontrolle: der Fließtext-Link muss sich im Hochkontrast
  // tatsächlich umfärben — sonst beweist das Stehenbleiben des Knopfs nichts.
  const linkColor = () => computed(page, 'a[href="#eins"]', "color");
  const buttonColor = () => computed(page, "#button-link", "color");
  const linkBefore = await linkColor();
  for (const [mode, want] of [
    ["contrast-light", "rgb(0, 0, 238)"],
    ["contrast-dark", "rgb(255, 255, 0)"],
  ]) {
    await setSetting(page, "color", mode);
    ok(`Textlink bekommt in „${mode}“ die Linkfarbe`, (await linkColor()) === want, await linkColor());
    ok(
      `… Knopf-Link (data-slot="button") behält seine Schrift`,
      (await buttonColor()) === "rgb(255, 255, 255)",
      await buttonColor(),
    );
    await reset(page);
  }
  await setSetting(page, "color", "night");
  ok(
    "Nachtmodus (ohne Linkfarbe) lässt den Knopf-Link unberührt",
    (await buttonColor()) === "rgb(255, 255, 255)",
    await buttonColor(),
  );
  // Die Demo gibt Links keine eigene Farbe, sie tragen also die des Browsers
  // (die sich mit `color-scheme: dark` selbst aufhellt — das ist nicht unsere
  // Regel). Die alte Regel machte daraus die Absatzfarbe (`inherit`), und
  // genau das darf nicht mehr passieren.
  const paragraphColor = await computed(page, "#content p", "color");
  ok(
    "… und macht den Textlink nicht zur Absatzfarbe",
    (await linkColor()) !== paragraphColor,
    `Link ${await linkColor()} · Absatz ${paragraphColor} · vorher ${linkBefore}`,
  );
  await reset(page);

  // --- 6. Sättigung / Graustufen ----------------------------------------
  const greenPoint = await centerOf(page, "#sw-green");
  const [greenBefore] = await pixels(page, [greenPoint]);
  ok(
    "Grünfeld ist vorher farbig (Kontrolle)",
    Math.max(...greenBefore) - Math.min(...greenBefore) > 30,
    `rgb(${greenBefore.join(",")})`,
  );
  await setSetting(page, "saturation", "grayscale");
  const [greenGray] = await pixels(page, [greenPoint]);
  ok(
    "Graustufen entfärben wirklich",
    Math.max(...greenGray) - Math.min(...greenGray) < 6,
    `rgb(${greenGray.join(",")})`,
  );

  // --- 7. Fixierte Leiste bei aktivem Filter ----------------------------
  // Die Integrationsfassung der Messung aus filter-containing-block.mjs: hier
  // mit echtem Seiteninhalt und der Filterkette aus a11y.css.
  const topBefore = await page.evaluate(
    () => Math.round(document.getElementById("panel").getBoundingClientRect().top),
  );
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(80);
  const topAfter = await page.evaluate(
    () => Math.round(document.getElementById("panel").getBoundingClientRect().top),
  );
  ok(
    "position: fixed bleibt bei aktivem filter auf <html> fixiert",
    topBefore === topAfter,
    `${topBefore} → ${topAfter} nach 400px Scrollen`,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await reset(page);

  // --- 8. Farbfehlsicht-Korrektur ---------------------------------------
  // Firefox wendet SVG-Filter nicht auf <html> an; a11y.css schaltet die
  // Korrektur dort deshalb ab (Herleitung im CSS-Kommentar). Hier wird beides
  // geprüft: dass die Fähigkeitsabfrage das erkennt, UND dass dann wirklich
  // nichts passiert — eine halb wirkende Korrektur wäre schlimmer als keine.
  const cvdSupported = await page.evaluate(() => window.__a11yDemo.cvdSupported);
  ok(
    `Fähigkeitsabfrage passt zur Engine (${engineName})`,
    cvdSupported === (engineName !== "firefox"),
    `isCvdCorrectionSupported() = ${cvdSupported}`,
  );

  const aPoint = await centerOf(page, "#confuse-a");
  const bPoint = await centerOf(page, "#confuse-b");
  const [a0, b0] = await pixels(page, [aPoint, bPoint]);
  const before = dist(a0, b0);
  await setSetting(page, "cvd", "deutan");
  const [a1, b1] = await pixels(page, [aPoint, bPoint]);
  const after = dist(a1, b1);
  if (cvdSupported) {
    ok(
      "Deuteranopie-Korrektur verändert die Darstellung überhaupt",
      dist(a0, a1) > 8,
      `Feld A rgb(${a0.join(",")}) → rgb(${a1.join(",")})`,
    );
    ok(
      "… und zieht das Verwechslungspaar auseinander",
      after > before,
      `Abstand ${before.toFixed(1)} → ${after.toFixed(1)}`,
    );
  } else {
    ok(
      "Gesperrte Korrektur verändert nachweislich NICHTS",
      dist(a0, a1) < 2,
      `Feld A rgb(${a0.join(",")}) → rgb(${a1.join(",")})`,
    );
  }
  // Kontrolle: Grau darf sich NICHT verfärben (Neutralität der Matrix).
  const grayPoint = await centerOf(page, "#sw-gray");
  const [gray] = await pixels(page, [grayPoint]);
  ok(
    "… ohne Graustufen zu verfärben",
    Math.max(...gray) - Math.min(...gray) < 8,
    `rgb(${gray.join(",")})`,
  );
  // Schwächere Stufe muss messbar weniger verschieben als die volle.
  await setSetting(page, "cvdStrength", 3);
  const [a3] = await pixels(page, [aPoint]);
  if (cvdSupported) {
    ok(
      "Stufe „leicht“ verschiebt weniger als „voll“",
      dist(a0, a3) < dist(a0, a1),
      `voll ${dist(a0, a1).toFixed(1)}, leicht ${dist(a0, a3).toFixed(1)}`,
    );
  }
  await reset(page);

  // --- 9. Blaulichtfilter ------------------------------------------------
  const bgPoint = [700, 650];
  const [bg0] = await pixels(page, [bgPoint]);
  await setSetting(page, "blueLight", 3);
  const [bg1] = await pixels(page, [bgPoint]);
  ok(
    "Blaulichtfilter wärmt das Bild (Blau sinkt stärker als Rot)",
    bg0[2] - bg1[2] > bg0[0] - bg1[0] && bg0[2] - bg1[2] > 8,
    `rgb(${bg0.join(",")}) → rgb(${bg1.join(",")})`,
  );
  await reset(page);

  // --- 10. Bilder ausblenden --------------------------------------------
  const imgPoint = await centerOf(page, "#demo-image");
  const [img0] = await pixels(page, [imgPoint]);
  ok("Bild ist vorher sichtbar (Kontrolle)", img0[1] > img0[0] + 20, `rgb(${img0.join(",")})`);
  await setSetting(page, "hideImages", true);
  const [img1] = await pixels(page, [imgPoint]);
  ok(
    "Bildinhalt verschwindet",
    dist(img0, img1) > 40,
    `rgb(${img0.join(",")}) → rgb(${img1.join(",")})`,
  );
  const boxStillThere = await page.evaluate(() => {
    const r = document.getElementById("demo-image").getBoundingClientRect();
    return r.width > 20 && r.height > 20;
  });
  ok("… aber der Platz bleibt erhalten", boxStillThere);
  await reset(page);

  // --- 11. Animationen stoppen ------------------------------------------
  const sizeAt = () =>
    page.evaluate(() => document.getElementById("animated").getBoundingClientRect().width);

  /**
   * Spannweite über mehrere Stichproben statt zwei Momentaufnahmen.
   *
   * Zwei Messungen im Abstand von 320 ms sind bei einer symmetrischen
   * Pulsation (1,2 s Periode) manchmal fast gleich groß — die Kontrollmessung
   * fiel dadurch sporadisch um, obwohl die Animation lief. Ein Test, der von
   * der Phase einer Animation abhängt, prüft nichts Verlässliches.
   */
  const spread = async (samples = 8, gap = 90) => {
    const values = [];
    for (let i = 0; i < samples; i++) {
      values.push(await sizeAt());
      await page.waitForTimeout(gap);
    }
    return Math.max(...values) - Math.min(...values);
  };

  const movingBefore = await spread();
  ok(
    "Animation läuft vorher (Kontrolle)",
    movingBefore > 2,
    `Spannweite ${movingBefore.toFixed(2)}px über 8 Messungen`,
  );
  await setSetting(page, "stopAnimations", true);
  await page.waitForTimeout(150);
  const movingAfter = await spread();
  ok(
    "Animation steht danach still",
    movingAfter < 0.5,
    `Spannweite ${movingAfter.toFixed(2)}px`,
  );
  await reset(page);

  // --- 12. Links, Fokus, Cursor -----------------------------------------
  await setSetting(page, "highlightLinks", true);
  ok(
    "Links werden unterstrichen",
    (await computed(page, "#content p a", "text-decoration-line")).includes("underline"),
  );
  await reset(page);

  await setSetting(page, "focusBoost", true);
  await page.locator("#content p a").first().focus();
  const outline = await computed(page, "#content p a", "outline-width");
  ok("Fokusring wird mindestens 3px dick", px(outline) >= 3, outline);
  await reset(page);

  await setSetting(page, "bigCursor", true);
  ok(
    "Großer Cursor wird gesetzt",
    (await computed(page, "#content p", "cursor")).includes("url("),
  );
  ok(
    "… Textfelder behalten den Text-Cursor",
    (await computed(page, ".card input", "cursor")) === "text",
  );
  await reset(page);

  // --- 13. Lesemaske -----------------------------------------------------
  // Ohne definierte Scrollposition messen die beiden Punkte je nach vorherigem
  // Test verschiedene Seiteninhalte.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);
  const [maskOff] = await pixels(page, [[700, 60]]);
  await setSetting(page, "readingMask", true);
  // overlays.ts folgt dem Zeiger — die Bandmitte liegt danach auf y = 500.
  await page.mouse.move(700, 500);
  await page.waitForTimeout(150);
  const maskY = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--a11y-mask-y"),
  );
  ok("overlays.ts schreibt die Bandposition", maskY.trim() === "500px", maskY.trim() || "(leer)");
  const [maskOn] = await pixels(page, [[700, 60]]);
  ok(
    "Lesemaske dunkelt außerhalb des Bandes ab",
    luminance(maskOn) < luminance(maskOff) * 0.6,
    `Leuchtdichte ${luminance(maskOff).toFixed(3)} → ${luminance(maskOn).toFixed(3)}`,
  );
  const [inBand] = await pixels(page, [[700, 500]]);
  ok(
    "… und lässt das Band unangetastet",
    luminance(inBand) > luminance(maskOn) * 1.8,
    `im Band ${luminance(inBand).toFixed(3)}`,
  );
  await reset(page);

  await browser.close();
}

// ── Ablauf ────────────────────────────────────────────────────────────────
const server = spawn(process.execPath, ["demo/serve.mjs"], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error("Server startet nicht")), 8000);
  server.stdout.on("data", (d) => {
    if (String(d).includes("Demo läuft")) {
      clearTimeout(t);
      res();
    }
  });
});

try {
  for (const [name, type] of ENGINES) {
    try {
      await run(name, type);
    } catch (err) {
      failures++;
      console.log(`  FEHLER in ${name}: ${err.message}`);
    }
  }
} finally {
  server.kill();
}

console.log(`\n${checks - failures}/${checks} Prüfungen bestanden`);
process.exit(failures ? 1 : 0);
