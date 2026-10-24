import { INITIAL_APP_STATE, INITIAL_VIEW, type AppState } from "./appState";
import { createHistoryState, type HistoryState } from "./reducer";

export const APP_STATE_KEY = "sima.modelador.state.v2";
export const LEGACY_STATE_KEYS = [
  "sima.modelador.exercise-statement.v1",
  "sima.modelador.tables.v1",
  "sima.modelador.tab.v1",
  "sima.modelador.relation-names.v1",
  "sima.modelador.cardinality-minimums.v1",
  "sima.modelador.attribute-marks.v1",
  "sima.modelador.domains.v1",
  "sima.modelador.relation-attributes.v1",
  "sima.modelador.positions.v1",
  "sima.modelador.canvas-view.v1",
  "sima.modelador.collapsed.v1",
  "sima.modelador.hierarchies.v1",
] as const;

export type StorageReader = { getItem(key: string): string | null };
export type StorageWriter = StorageReader & {
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type StoredHistory = { version: 2; value: Omit<HistoryState, "lastGroupId"> };

export function loadHistoryState(storage: StorageReader): HistoryState {
  const stored = readVersioned<StoredHistory>(storage, APP_STATE_KEY);
  if (stored?.version === 2 && isHistoryValue(stored.value)) {
    return { ...stored.value, lastGroupId: null };
  }
  return createHistoryState(migrateLegacyState(storage));
}

export function saveHistoryState(storage: StorageWriter, state: HistoryState): void {
  const value: StoredHistory = {
    version: 2,
    value: { present: state.present, past: state.past, future: state.future },
  };
  storage.setItem(APP_STATE_KEY, JSON.stringify(value));
  LEGACY_STATE_KEYS.forEach((key) => storage.removeItem(key));
}

function migrateLegacyState(storage: StorageReader): AppState {
  return {
    ...INITIAL_APP_STATE,
    exerciseStatement: readLegacy(storage, "sima.modelador.exercise-statement.v1", ""),
    tables: readLegacy(storage, "sima.modelador.tables.v1", []),
    tab: readLegacy(storage, "sima.modelador.tab.v1", "conceptual"),
    names: readLegacy(storage, "sima.modelador.relation-names.v1", {}),
    cardinalityMinimums: readLegacy(storage, "sima.modelador.cardinality-minimums.v1", {}),
    attributeMarks: readLegacy(storage, "sima.modelador.attribute-marks.v1", {}),
    domains: readLegacy(storage, "sima.modelador.domains.v1", {}),
    relationAttributes: readLegacy(storage, "sima.modelador.relation-attributes.v1", {}),
    positions: readLegacy(storage, "sima.modelador.positions.v1", {}),
    view: readLegacy(storage, "sima.modelador.canvas-view.v1", INITIAL_VIEW),
    collapsed: readLegacy(storage, "sima.modelador.collapsed.v1", {}),
    hierarchies: readLegacy(storage, "sima.modelador.hierarchies.v1", []),
  };
}

function readLegacy<Value>(storage: StorageReader, key: string, fallback: Value): Value {
  const stored = readVersioned<{ version: number; value: Value }>(storage, key);
  return stored?.version === 1 ? stored.value : fallback;
}

function readVersioned<Value extends { version?: number }>(
  storage: StorageReader,
  key: string,
): Value | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isObject(parsed) && typeof parsed.version === "number" ? (parsed as Value) : null;
  } catch {
    return null;
  }
}

function isHistoryValue(value: unknown): value is Omit<HistoryState, "lastGroupId"> {
  if (!isObject(value) || !isAppState(value.present)) return false;
  return (
    Array.isArray(value.past) &&
    value.past.every(isAppState) &&
    Array.isArray(value.future) &&
    value.future.every(isAppState)
  );
}

function isAppState(value: unknown): value is AppState {
  if (!isObject(value)) return false;
  return (
    Array.isArray(value.tables) &&
    Array.isArray(value.hierarchies) &&
    isObject(value.names) &&
    isObject(value.cardinalityMinimums) &&
    isObject(value.attributeMarks) &&
    isObject(value.domains) &&
    isObject(value.relationAttributes) &&
    isObject(value.positions) &&
    isObject(value.view) &&
    isObject(value.collapsed) &&
    typeof value.exerciseStatement === "string" &&
    ["conceptual", "logical", "ddl"].includes(String(value.tab))
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
