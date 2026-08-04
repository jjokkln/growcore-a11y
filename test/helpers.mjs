/**
 * Ein DOM-Attrappe, klein genug, um sie zu verstehen, groß genug für die
 * Projektion. Absichtlich kein jsdom: geprüft wird ausschließlich, welche
 * Attribute und CSS-Variablen gesetzt bzw. entfernt werden — dafür ist eine
 * echte Rendering-Engine unnötiger Ballast (und die Prüfung *im* Browser macht
 * später Playwright, wo sie hingehört).
 */
export function fakeElement() {
  const attrs = new Map();
  const props = new Map();
  return {
    attrs,
    props,
    setAttribute(name, value) {
      attrs.set(name, value);
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
    style: {
      setProperty(name, value) {
        props.set(name, value);
      },
      removeProperty(name) {
        props.delete(name);
      },
    },
  };
}

/** Minimaler `localStorage`-Ersatz, inklusive der Möglichkeit zu werfen. */
export function fakeStorage(initial = {}, { throwOnAccess = false } = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(k) {
      if (throwOnAccess) throw new Error("SecurityError");
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      if (throwOnAccess) throw new Error("SecurityError");
      map.set(k, String(v));
    },
    removeItem(k) {
      if (throwOnAccess) throw new Error("SecurityError");
      map.delete(k);
    },
  };
}
