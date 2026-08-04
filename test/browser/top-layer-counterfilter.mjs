/**
 * Nachtrag zur Filter-Messung: Firefox laesst Top-Layer-Elemente NICHT dem
 * Vorfahren-Filter entkommen. Also braucht das Panel eine Rueckfallebene.
 *
 * Geprueft wird der Gegenfilter: invert(1) auf <html> UND invert(1) auf dem
 * Panel muessen sich aufheben (invert ist involutorisch). Wenn das traegt,
 * funktioniert ein filter-basierter Invert-Modus auch auf Landingpages ohne
 * unser Token-System (steffen-vorholt: plain CSS, keine oklch-Token).
 *
 * Zweite Frage: bleibt Text im gegenfilterten Panel scharf, oder erzeugt die
 * doppelte Filterstufe sichtbares Rendering-Rauschen? Gemessen als Abweichung
 * gegen dieselbe Flaeche ohne jeden Filter.
 */
import pw from "/Users/lennardkuss/Code_Aktuell/growcore-kundendashboard/node_modules/playwright/index.js";
const { chromium, firefox, webkit } = pw;

const PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html { background: #fff }
  body { margin: 0; height: 1200px }
  #pop { background: #ffffff; color: #111111; border: 2px solid #0a5c3e;
         width: 240px; height: 240px; position: fixed; top: 200px; left: 200px;
         margin: 0; padding: 16px; font: 16px/1.4 system-ui }
  #pop::backdrop { background: transparent }
  /* Der eigentliche Invert-Modus auf der Wurzel ... */
  html.invert { filter: invert(1) }
  /* ... und der Gegenfilter auf dem Panel, der ihn wieder aufhebt. */
  html.invert #pop { filter: invert(1); isolation: isolate }
</style></head>
<body>
  <div id="pop" popover="auto">Barrierefreiheit<br>Schriftgroesse</div>
</body></html>`;

async function pixel(page, buf, x, y) {
  const dataUri = `data:image/png;base64,${buf.toString("base64")}`;
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

async function run(name, type) {
  const browser = await type.launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 600 } });
  await page.setContent(PAGE);
  await page.evaluate(() => document.getElementById("pop").showPopover());
  await page.waitForTimeout(120);

  // Referenz ohne jeden Filter
  const plain = await page.screenshot();
  const refBg = await pixel(page, plain, 380, 380);   // Panel-Flaeche
  const refBorder = await pixel(page, plain, 201, 320); // gruener Rahmen

  // invert(1) auf <html>, Gegenfilter auf dem Panel
  await page.evaluate(() => (document.documentElement.className = "invert"));
  await page.waitForTimeout(150);
  const inv = await page.screenshot();
  const cfBg = await pixel(page, inv, 380, 380);
  const cfBorder = await pixel(page, inv, 201, 320);
  const outsideBg = await pixel(page, inv, 50, 50); // Seite selbst: muss schwarz sein

  await browser.close();
  const diff = Math.max(...cfBg.map((v, i) => Math.abs(v - refBg[i])));
  const borderDiff = Math.max(...cfBorder.map((v, i) => Math.abs(v - refBorder[i])));
  return { name, refBg, cfBg, refBorder, cfBorder, outsideBg, diff, borderDiff };
}

console.log("Gegenfilter-Probe: invert auf <html> + invert auf dem Panel\n");
for (const [name, type] of [["chromium", chromium], ["firefox", firefox], ["webkit", webkit]]) {
  try {
    const r = await run(name, type);
    const pageInverted = r.outsideBg[0] < 60;
    console.log(`### ${r.name}`);
    console.log(`  Seite ausserhalb   : rgb(${r.outsideBg.join(",")})  -> ${pageInverted ? "invertiert (gewollt)" : "NICHT invertiert !!"}`);
    console.log(`  Panel-Flaeche  ref : rgb(${r.refBg.join(",")})   mit Gegenfilter: rgb(${r.cfBg.join(",")})   Abweichung ${r.diff}`);
    console.log(`  Panel-Rahmen   ref : rgb(${r.refBorder.join(",")})   mit Gegenfilter: rgb(${r.cfBorder.join(",")})   Abweichung ${r.borderDiff}`);
    console.log(`  -> Gegenfilter ${r.diff <= 4 && r.borderDiff <= 8 ? "TRAEGT" : "traegt NICHT"}\n`);
  } catch (e) {
    console.log(`### ${name}\n  FEHLER: ${e.message}\n`);
  }
}
