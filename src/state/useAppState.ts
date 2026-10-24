import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { INITIAL_APP_STATE, type AppState } from "./appState";
import { loadHistoryState, saveHistoryState } from "./persistence";
import { appReducer, createHistoryState } from "./reducer";

export function useAppState() {
  const [history, dispatch] = useReducer(appReducer, undefined, () =>
    typeof window === "undefined"
      ? createHistoryState(INITIAL_APP_STATE)
      : loadHistoryState(window.localStorage),
  );
  const nextGroupId = useRef(0);
  const activeGroupId = useRef<number | null>(null);
  const state = history.present;

  useEffect(() => {
    try {
      saveHistoryState(window.localStorage, history);
    } catch {
      // Si el almacenamiento falla, el modelo sigue disponible durante esta sesión.
    }
  }, [history]);

  const update = useCallback((updater: (current: AppState) => AppState, recordHistory = true) => {
    let groupId: number | undefined;
    if (recordHistory) {
      if (activeGroupId.current === null) {
        activeGroupId.current = ++nextGroupId.current;
        const currentGroup = activeGroupId.current;
        window.setTimeout(() => {
          if (activeGroupId.current === currentGroup) activeGroupId.current = null;
        }, 0);
      }
      groupId = activeGroupId.current;
    }
    dispatch({ type: "update", update: updater, history: recordHistory, groupId });
  }, []);

  const setter = useCallback(
    <Key extends keyof AppState>(
      key: Key,
      recordHistory = true,
    ): Dispatch<SetStateAction<AppState[Key]>> =>
      (action) => {
        update((current) => {
          const value =
            typeof action === "function"
              ? (action as (previous: AppState[Key]) => AppState[Key])(current[key])
              : action;
          return { ...current, [key]: value };
        }, recordHistory);
      },
    [update],
  );

  return {
    state,
    update,
    set: setter,
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
