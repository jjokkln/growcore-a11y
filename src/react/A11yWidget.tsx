"use client";

import { useEffect, useId, useRef, useState } from "react";

import { isCvdCorrectionSupported } from "../core/capabilities.js";
import { SCHEMA, TEXT_SCALES } from "../core/schema.js";
import type { A11ySettings } from "../core/settings.js";
import { A11Y_LABELS, type A11yLabels } from "./labels.js";
import { useA11y } from "./use-a11y.js";

/**
 * Das Panel.
 *
 * ── Warum die native Popover-API und keine Dialog-Bibliothek ──────────────────
 *
 * `popover="auto"` plus `popoverTarget` am Knopf erledigt vier Dinge ohne eine
 * Zeile JavaScript: Darstellung im Top Layer (also über allem, ohne dass eine
 * z-index-Zahl erfunden werden muss), Schließen mit Escape, Schließen bei Klick
 * daneben, und Fokus zurück auf den Auslöser beim Schließen. Alles vier sind
 * Dinge, die man in einem selbstgebauten Panel falsch macht — und
 * „Tastaturfalle im Overlay" ist genau der Befund, den Prüfblock H als Erstes
 * findet.
 *
 * Der Preis: keine Abhängigkeit zu Base UI oder Radix, damit dieselbe Datei in
 * jedes Projekt fällt — auch in eines ohne Design-System.
 *
 * ── Warum native Formularelemente ────────────────────────────────────────────
 *
 * Jede Auswahl ist eine echte Radiogruppe in `fieldset`/`legend`, jeder Schalter
 * eine echte Checkbox. Damit kommen Rolle, Zustand, Gruppenansage und
 * Pfeiltasten-Bedienung vom Browser statt aus nachgebautem ARIA. Ein
 * „Toggle-Switch" aus `div`s sieht moderner aus und ist für einen Screenreader
 * Nichts.
 *
 * ── Was hier bewusst NICHT passiert ──────────────────────────────────────────
 *
 * Keine Erkennung, ob eine Hilfstechnologie läuft. Keine ARIA-Injektion in die
 * Seite. Kein „Screenreader-Modus". Kein Konformitäts-Abzeichen. Begründung im
 * README — das sind die Punkte, an denen Overlay-Werkzeuge Nutzern schaden.
 */

const ICON = (
  // Das übliche Sinnbild für Barrierefreiheit. `aria-hidden`, weil der Knopf
  // seine Bedeutung über sein Label trägt und nicht über das Bild.
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="6.4" r="1.45" fill="currentColor" />
    <path
      d="M5.6 9.4c2 .7 4.1 1.05 6.4 1.05s4.4-.35 6.4-1.05"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 10.45v3.2m0 0-2.2 4.9m2.2-4.9 2.2 4.9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export type A11yWidgetProps = {
  /** Ziel für „Erklärung zur Barrierefreiheit“. Ohne Angabe fehlt der Link. */
  statementHref?: string;
  /** Texte überschreiben, z. B. für eine andere Anrede. */
  labels?: Partial<A11yLabels>;
  /** Tastenkürzel zum Öffnen. `null` schaltet es ab. Standard: Alt+0. */
  shortcut?: string | null;
};

export function A11yWidget({
  statementHref,
  labels: override,
  shortcut = "0",
}: A11yWidgetProps) {
  const t = { ...A11Y_LABELS, ...override } as A11yLabels;
  const { settings, set, reset, pristine } = useA11y();
  const panelId = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // `isCvdCorrectionSupported()` fragt CSS ab und darf deshalb erst nach dem
  // Mounten laufen — auf dem Server gibt es kein `CSS`. Startwert `true`, damit
  // das serverseitige HTML dem entspricht, was die Mehrheit der Browser kann;
  // wo es nicht stimmt, erscheint der Hinweis eine Lidschlagszeit später.
  const [cvdSupported, setCvdSupported] = useState(true);
  useEffect(() => setCvdSupported(isCvdCorrectionSupported()), []);

  // Der Popover-Zustand ist die Wahrheit des Browsers, nicht unsere: `toggle`
  // meldet auch das Schließen per Escape und per Klick daneben, das wir gar
  // nicht selbst auslösen.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const onToggle = (event: Event) => {
      setOpen((event as ToggleEvent).newState === "open");
    };
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, []);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      // Alt als einziger Zusatz: Strg/Cmd-Kombinationen sind vom Browser oder
      // vom Betriebssystem belegt, und ein Kürzel ohne Zusatztaste würde jedem
      // Tippen in ein Textfeld dazwischenfunken.
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== shortcut) return;
      const el = panelRef.current;
      if (!el) return;
      event.preventDefault();
      el.togglePopover();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  /** Ändern plus Ansage — eine Zustandsänderung, die niemand vorliest, ist keine. */
  function change<K extends keyof A11ySettings>(name: K, value: A11ySettings[K], spoken: string) {
    set(name, value);
    setAnnouncement(spoken);
  }

  const enumGroup = <K extends keyof A11ySettings>(
    name: K,
    legend: string,
    values: readonly string[],
    labelFor: Record<string, string>,
  ) => (
    <fieldset className="gc-a11y-group">
      <legend>{legend}</legend>
      <div className="gc-a11y-seg">
        {values.map((value) => (
          <label key={value}>
            <input
              type="radio"
              name={`${panelId}-${String(name)}`}
              checked={settings[name] === value}
              onChange={() =>
                change(name, value as A11ySettings[K], `${legend}: ${labelFor[value]}`)
              }
            />
            <span>{labelFor[value]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const stepGroup = <K extends keyof A11ySettings>(
    name: K,
    legend: string,
    steps: readonly string[],
  ) => (
    <fieldset className="gc-a11y-group">
      <legend>{legend}</legend>
      <div className="gc-a11y-seg">
        {steps.map((label, index) => (
          <label key={label}>
            <input
              type="radio"
              name={`${panelId}-${String(name)}`}
              checked={settings[name] === index}
              onChange={() => change(name, index as A11ySettings[K], `${legend}: ${label}`)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const flag = (name: keyof A11ySettings, label: string, extra?: () => void) => (
    <label className="gc-a11y-switch">
      <input
        type="checkbox"
        checked={settings[name] === true}
        onChange={(event) => {
          change(name, event.target.checked as A11ySettings[typeof name], `${label}: ${event.target.checked ? "ein" : "aus"}`);
          if (event.target.checked) extra?.();
        }}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <>
      <button
        type="button"
        className="gc-a11y-trigger"
        popoverTarget={panelId}
        popoverTargetAction="toggle"
        aria-label={pristine ? t.triggerOpen : t.triggerActive}
        aria-expanded={open}
        data-active={pristine ? undefined : ""}
      >
        {ICON}
      </button>

      <div
        ref={panelRef}
        id={panelId}
        // eslint-disable-next-line react/no-unknown-property
        popover="auto"
        className="gc-a11y-panel"
        role="dialog"
        aria-label={t.title}
      >
        <div className="gc-a11y-head">
          <div>
            <h2 className="gc-a11y-title">{t.title}</h2>
            <p className="gc-a11y-sub">{t.subtitle}</p>
          </div>
          <button
            type="button"
            className="gc-a11y-close"
            popoverTarget={panelId}
            popoverTargetAction="hide"
            aria-label={t.close}
          >
            ✕
          </button>
        </div>

        <div className="gc-a11y-body">
          {/* Die Ansage steht IM Panel, damit sie im selben Kontext gelesen wird
              wie die Bedienelemente. `polite`, weil eine Einstellung keine
              Unterbrechung rechtfertigt. */}
          <p className="gc-a11y-sr" aria-live="polite" role="status">
            {announcement}
          </p>

          <h3 className="gc-a11y-sr">{t.groups.text}</h3>
          {stepGroup("textScale", t.textScale, t.textScaleSteps.slice(0, TEXT_SCALES.length))}
          {enumGroup("leading", t.leading, SCHEMA.leading.values, t.leadingValues)}
          {enumGroup("tracking", t.tracking, SCHEMA.tracking.values, t.trackingValues)}
          {enumGroup("align", t.align, SCHEMA.align.values, t.alignValues)}
          {enumGroup("font", t.font, SCHEMA.font.values, t.fontValues)}

          <h3 className="gc-a11y-sr">{t.groups.color}</h3>
          {enumGroup("color", t.color, SCHEMA.color.values, t.colorValues)}
          {enumGroup("saturation", t.saturation, SCHEMA.saturation.values, t.saturationValues)}

          {cvdSupported ? (
            <>
              {enumGroup("cvd", t.cvd, SCHEMA.cvd.values, t.cvdValues)}
              {settings.cvd !== "none" &&
                stepGroup("cvdStrength", t.cvdStrength, t.cvdStrengthSteps)}
            </>
          ) : (
            <fieldset className="gc-a11y-group">
              <legend>{t.cvd}</legend>
              <p className="gc-a11y-note">{t.cvdUnsupported}</p>
            </fieldset>
          )}

          {stepGroup("blueLight", t.blueLight, t.blueLightSteps)}

          <h3 className="gc-a11y-sr">{t.groups.media}</h3>
          <fieldset className="gc-a11y-group">
            <legend>{t.groups.media}</legend>
            {flag("hideImages", t.hideImages)}
            {flag("stopAnimations", t.stopAnimations)}
          </fieldset>

          <h3 className="gc-a11y-sr">{t.groups.reading}</h3>
          <fieldset className="gc-a11y-group">
            <legend>{t.groups.reading}</legend>
            {/* Maske und Lineal teilen sich dasselbe Pseudoelement in a11y.css,
                können also nicht gleichzeitig wirken. Statt den Nutzer eine
                wirkungslose Kombination einstellen zu lassen, schaltet das eine
                das andere aus — und die Ansage sagt, dass es passiert ist. */}
            {flag("readingMask", t.readingMask, () => {
              if (settings.readingRuler) set("readingRuler", false);
            })}
            {flag("readingRuler", t.readingRuler, () => {
              if (settings.readingMask) set("readingMask", false);
            })}
            {settings.readingMask && settings.readingRuler && (
              <p className="gc-a11y-note">{t.readingExclusive}</p>
            )}
            {flag("bigCursor", t.bigCursor)}
            {flag("highlightLinks", t.highlightLinks)}
            {flag("focusBoost", t.focusBoost)}
          </fieldset>

          <div className="gc-a11y-foot">
            <button
              type="button"
              className="gc-a11y-reset"
              disabled={pristine}
              onClick={() => {
                reset();
                setAnnouncement(t.resetDone);
              }}
            >
              {t.reset}
            </button>
            {statementHref && (
              <a className="gc-a11y-link" href={statementHref}>
                {t.statement}
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
