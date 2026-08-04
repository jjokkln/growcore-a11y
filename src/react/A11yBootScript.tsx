import { CVD_FILTERS } from "../core/cvd-filters.js";
import { bootScript } from "../core/boot.js";
import { STORAGE_KEY } from "../core/schema.js";

/**
 * Gehört in den `<head>` des Wurzel-Layouts, so früh wie möglich.
 *
 * Das Skript läuft synchron beim Parsen des HTML und setzt die gespeicherten
 * Einstellungen auf `<html>`, bevor der erste Pixel gemalt wird. Ohne das sieht
 * ein Hochkontrast-Nutzer bei jedem Seitenaufruf für ein paar Hundert
 * Millisekunden die helle Standardansicht.
 *
 * `nonce` durchreichen, wenn das Projekt eine CSP mit `script-src 'nonce-…'`
 * hat. Ohne CSP einfach weglassen.
 */
export function A11yBootScript({
  storageKey = STORAGE_KEY,
  nonce,
}: {
  storageKey?: string;
  nonce?: string;
}) {
  return (
    <script
      nonce={nonce}
      // Der Inhalt ist vollständig selbst erzeugt (siehe core/boot.ts) und
      // enthält keine Nutzereingabe: der einzige variable Teil ist der
      // Speicherschlüssel, und der geht durch JSON.stringify.
      dangerouslySetInnerHTML={{ __html: bootScript(storageKey) }}
    />
  );
}

/**
 * Die SVG-Filter für die Farbfehlsicht-Korrektur. Gehört in den `<body>` des
 * Wurzel-Layouts.
 *
 * **Serverseitig gerendert und nicht per JavaScript nachgeschoben**, weil
 * `a11y.css` beim ersten Paint schon `filter: url(#gc-a11y-…)` setzen kann. Fehlt
 * das Ziel zu diesem Zeitpunkt, greift der Filter ins Leere — ohne Fehlermeldung.
 *
 * Nicht `display: none`: ein so verstecktes SVG liefert in mehreren Engines keine
 * auflösbaren Filterreferenzen. Deshalb aus dem Fluss genommen und auf Größe 0.
 */
export function A11yFilterDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={0}
      height={0}
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <defs>
        {CVD_FILTERS.map((f) => (
          // linearRGB ist Pflicht: die Matrizen sind in linearem RGB gerechnet.
          // Mit sRGB rechnet der Filter im gammakorrigierten Raum und die
          // Korrektur ist still falsch.
          <filter key={f.id} id={f.id} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={f.values.join(" ")} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
