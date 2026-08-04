/**
 * Winziger statischer Server für die Demo-Seite.
 *
 * Warum überhaupt einer: `demo/index.html` lädt `dist/core/index.js` als ES-Modul.
 * Über `file://` verweigern Browser das (CORS für Module), die Seite wäre also
 * per Doppelklick tot. Ein Server von 40 Zeilen ist billiger als ein Bundler.
 *
 *   node demo/serve.mjs          -> http://localhost:4173/demo/
 *   PORT=5000 node demo/serve.mjs
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".json": "application/json",
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path === "/" || path === "/demo" || path === "/demo/") path = "/demo/index.html";

    // Kein Ausbruch aus dem Repo-Verzeichnis: `normalize` löst `..` auf, danach
    // muss der Pfad noch unter ROOT liegen.
    const file = join(ROOT, normalize(path));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end("Verboten");
      return;
    }

    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch (err) {
    const code = err.code === "ENOENT" ? 404 : 500;
    res.writeHead(code, { "content-type": "text/plain; charset=utf-8" });
    res.end(code === 404 ? "Nicht gefunden" : String(err));
  }
}).listen(PORT, () => {
  console.log(`Demo läuft auf http://localhost:${PORT}/demo/`);
});
