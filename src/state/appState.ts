import type { HierarchyRecord } from "../domain/model/types";
import type { AttributeMark } from "../model";
import type { Table } from "../parser/ddlParser";

export type CanvasView = { x: number; y: number; width: number; height: number };
export type CanvasPositions = Record<string, { x: number; y: number }>;

export type AppState = {
  exerciseStatement: string;
  tables: Table[];
  tab: "conceptual" | "logical" | "ddl";
  names: Record<string, string>;
  cardinalityMinimums: Record<string, (0 | 1)[]>;
  attributeMarks: Record<string, AttributeMark>;
  domains: Record<string, string>;
  relationAttributes: Record<string, string[]>;
  hierarchies: HierarchyRecord[];
  positions: CanvasPositions;
  logicalPositions: CanvasPositions;
  view: CanvasView;
  collapsed: Record<string, boolean>;
};

export const INITIAL_VIEW: CanvasView = { x: 40, y: 25, width: 720, height: 465 };

export const INITIAL_APP_STATE: AppState = {
  exerciseStatement: "",
  tables: [],
  tab: "conceptual",
  names: {},
  cardinalityMinimums: {},
  attributeMarks: {},
  domains: {},
  relationAttributes: {},
  hierarchies: [],
  positions: {},
  logicalPositions: {},
  view: INITIAL_VIEW,
  collapsed: {},
};
