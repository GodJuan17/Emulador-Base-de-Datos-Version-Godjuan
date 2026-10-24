import type { AttributeMark } from "../model/types";
import type { Table } from "../../parser/ddlParser";

export type DomainState = {
  tables: Table[];
  attributeMarks: Record<string, AttributeMark>;
  domains: Record<string, string>;
  names: Record<string, string>;
  cardinalityMinimums: Record<string, (0 | 1)[]>;
  relationAttributes: Record<string, string[]>;
};

export type OperationChanges = Partial<DomainState>;

export type AttributeEdit = {
  name: string;
  changes: Partial<import("../../parser/ddlParser").Column>;
};
