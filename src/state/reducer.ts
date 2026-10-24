import type { AppState } from "./appState";

const HISTORY_LIMIT = 100;

export type HistoryState = {
  present: AppState;
  past: AppState[];
  future: AppState[];
  lastGroupId: number | null;
};

export type StateAction =
  | { type: "update"; update: (state: AppState) => AppState; history: boolean; groupId?: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "replace"; state: AppState };

export function createHistoryState(present: AppState): HistoryState {
  return { present, past: [], future: [], lastGroupId: null };
}

export function appReducer(state: HistoryState, action: StateAction): HistoryState {
  if (action.type === "undo") return undo(state);
  if (action.type === "redo") return redo(state);
  if (action.type === "replace") return createHistoryState(action.state);
  return update(state, action);
}

function update(
  historyState: HistoryState,
  action: Extract<StateAction, { type: "update" }>,
): HistoryState {
  const present = action.update(historyState.present);
  if (!action.history || present === historyState.present) {
    return { ...historyState, present, lastGroupId: null };
  }
  if (action.groupId !== undefined && action.groupId === historyState.lastGroupId) {
    return { ...historyState, present };
  }
  return {
    present,
    past: [...historyState.past, historyState.present].slice(-HISTORY_LIMIT),
    future: [],
    lastGroupId: action.groupId ?? null,
  };
}

function undo(state: HistoryState): HistoryState {
  if (!state.past.length) return state;
  const present = state.past[state.past.length - 1];
  return {
    present,
    past: state.past.slice(0, -1),
    future: [state.present, ...state.future],
    lastGroupId: null,
  };
}

function redo(state: HistoryState): HistoryState {
  if (!state.future.length) return state;
  const [present, ...future] = state.future;
  return {
    present,
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    future,
    lastGroupId: null,
  };
}
