export {
  ACTIVE_ATTR,
  SCHEMA,
  SETTINGS_VERSION,
  STORAGE_KEY,
  TEXT_SCALES,
  type SchemaEntry,
  type SettingName,
} from "./schema.js";

export {
  DEFAULTS,
  isPristine,
  sanitize,
  textScaleFactor,
  type A11ySettings,
} from "./settings.js";

export { projectToDom, type ProjectionTarget } from "./project.js";
export { applySettings, resetDom } from "./apply.js";
export { bootScript } from "./boot.js";
export {
  CHANGE_EVENT,
  clear,
  notifyChanged,
  parse,
  read,
  readRaw,
  subscribe,
  write,
} from "./storage.js";
