/**
 * Zwei Messungen, die die Architektur des Barrierefreiheits-Widgets entscheiden.
 *
 * A) Erzeugt `filter` auf <html> einen Containing Block fuer position:fixed?
 *    Laut Filter Effects L2 NICHT auf dem Wurzelelement. Chromium haelt sich
 *    daran, Firefox historisch nicht (Bug 1125767). Bricht es, scrollen in der
 *    App Sidebar, FAB, Fortschrittsbalken und alle Base-UI-Portale mit.
 *
 * B) Entkommt ein Element im Top Layer (popover="auto") dem Vorfahren-Filter?
 *    Darauf beruht die Zusage "das Panel wird im Invert-Modus nicht schwarz".
 *
 * Gegenprobe jeweils mit Filter auf einem Wrapper-DIV statt auf <html> --
 * dort MUSS der Containing Block entstehen, sonst misst der Test nichts.
 */
// Absoluter Pfad plus Default-Export: in ESM zieht NODE_PATH nicht, und das
// Skript liegt ausserhalb des Repos (siehe AI-OS, playwright-verifikationstechniken).
import pw from "/Users/lennardkuss/Code_Aktuell/growcore-kundendashboard/node_modules/playwright/index.js";
const { chromium, firefox, webkit } = pw;

const PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html { background: #fff }
  body { margin: 0; height: 3000px }
  #fixed { position: fixed; top: 50px; left: 0; width: 120px; height: 20px; background: #f00 }
  #pop { background: #ffffff; border: 0; width: 200px; height: 200px;
         position: fixed; top: 300px; left: 300px; margin: 0; padding: 0 }
  #pop::backdrop { background: transparent }
  .grayscale { filter: grayscale(1) }
  .invert    { filter: invert(1) }
</style></head>
<body>
  <div id="wrapper"><div id="fixed"></div></div>
  <div id="pop" popover="auto"></div>
</body></html>`;

/** Liest einen Pixel aus einem PNG-Buffer -- ueber die Canvas des Browsers,
 *  damit keine Bildbibliothek gebraucht wird. */
async function samplePixel(page, pngBuffer, x, y) {
  const dataUri = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  return page.evaluate(
    async ({ dataUri, x, y }) => {
      const img = new Image();
      img.src = dataUri;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2]];
    },
    { dataUri, x, y },
  );
}

async function fixedTopAfterScroll(page, apply) {
  await page.evaluate(() => {
    document.documentElement.className = "";
    document.getElementById("wrapper").style.filter = "";
    window.scrollTo(0, 0);
  });
  await page.evaluate(apply);
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(120);
  return page.evaluate(() =>
    Math.round(document.getElementById("fixed").getBoundingClientRect().top),
  );
}

async function run(name, browserType) {
  const browser = await browserType.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent(PAGE);

  const out = { engine: name };

  // --- A) Containing Block ---------------------------------------------------
  out.baseline = await fixedTopAfterScroll(page, () => {});
  out.filterOnHtml = await fixedTopAfterScroll(page, () => {
    document.documentElement.className = "grayscale";
  });
  out.filterOnWrapper = await fixedTopAfterScroll(page, () => {
    document.getElementById("wrapper").style.filter = "grayscale(1)";
  });

  // --- B) Top Layer vs. Vorfahren-Filter ------------------------------------
  await page.evaluate(() => {
    document.documentElement.className = "";
    document.getElementById("wrapper").style.filter = "";
    window.scrollTo(0, 0);
  });
  out.popoverSupported = await page.evaluate(() => {
    const el = document.getElementById("pop");
    if (typeof el.showPopover !== "function") return false;
    try {
      el.showPopover();
      return true;
    } catch {
      return false;
    }
  });

  if (out.popoverSupported) {
    // Panel ist reinweiss. Bleibt es weiss, ist es dem invert(1) entkommen.
    await page.evaluate(() => {
      document.documentElement.className = "invert";
    });
    await page.waitForTimeout(150);
    const shot = await page.screenshot();
    out.popoverPixel = await samplePixel(page, shot, 400, 400);
    // Gegenprobe: ein normales fixes Element MUSS invertiert werden (rot -> cyan)
    out.normalPixel = await samplePixel(page, shot, 60, 55);
  }

  await browser.close();
  return out;
}

const engines = [
  ["chromium", chromium],
  ["firefox", firefox],
  ["webkit", webkit],
];

console.log("Messung: filter auf <html> + Top Layer\n");
for (const [name, type] of engines) {
  try {
    const r = await run(name, type);
    const fixedOk = r.filterOnHtml === r.baseline;
    const wrapperBroke = r.filterOnWrapper !== r.baseline;
    const escaped = r.popoverPixel && r.popoverPixel[0] > 200;

    console.log(`### ${r.engine}`);
    console.log(`  A) fixed-top ohne Filter        : ${r.baseline}`);
    console.log(`     fixed-top, filter auf <html> : ${r.filterOnHtml}  -> ${fixedOk ? "OK (Wurzel-Ausnahme greift)" : "GEBROCHEN"}`);
    console.log(`     fixed-top, filter auf Wrapper: ${r.filterOnWrapper}  -> ${wrapperBroke ? "erwartet gebrochen (Test misst)" : "!! Test misst nichts !!"}`);
    console.log(`  B) popover unterstuetzt         : ${r.popoverSupported}`);
    if (r.popoverSupported) {
      console.log(`     Panel-Pixel (weiss=entkommen): rgb(${r.popoverPixel.join(",")})  -> ${escaped ? "ENTKOMMEN" : "invertiert"}`);
      console.log(`     Kontrollpixel normales fixed : rgb(${r.normalPixel.join(",")})`);
    }
    console.log();
  } catch (err) {
    console.log(`### ${name}\n  FEHLER: ${err.message}\n`);
  }
}
