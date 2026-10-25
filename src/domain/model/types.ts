import type { Column, Table, WeakCardinality } from "../../parser/ddlParser";

export type AttributeClassification =
  "derived" | "multivalued" | "composite" | "multivalued-composite" | "optional";

export type AttributeMark = {
  kind: AttributeClassification;
  parts: string[];
};

export type EntityId = string;
export type AttributeId = string;
export type RelationshipId = string;
export type HierarchyId = string;

export type RelationKind = "1:N" | "1:1" | "N:M";

export type RelationDraft = {
  source: string;
  target: string;
  participants: string[];
  participantMinimums?: (0 | 1)[];
  participantMaximums?: ("1" | "n")[];
  roles?: [string, string];
  name: string;
  associativeTableName?: string;
  kind: RelationKind;
  mandatory: boolean;
  attributes?: string[];
};

export type RelationshipSnapshot = {
  id: RelationshipId;
  name: string;
  left: string;
  right: string;
  participants?: string[];
  participantMinimums?: (0 | 1)[];
  participantMaximums?: ("1" | "n")[];
  roles?: [string, string];
  kind: RelationKind;
  attributes: string[];
  foreignKeyNullable?: boolean;
  identifying?: boolean;
  dependency?: "E" | "ID";
  weakCardinality?: WeakCardinality;
};

export type EntityRecord = {
  id: EntityId;
  name: string;
  attributes: AttributeRecord[];
  associative: boolean;
  weak: boolean;
};

export type AttributeRecord = {
  id: AttributeId;
  entityId: EntityId;
  column: Column;
  mark?: { kind: AttributeClassification; parts: string[] };
  domain?: string;
};

export type RelationshipRecord = {
  id: RelationshipId;
  name: string;
  participants: EntityId[];
  minimums: (0 | 1)[];
  maximums: ("1" | "n")[];
  roles: string[];
  dependency?: "E" | "ID";
  weakCardinality?: WeakCardinality;
};

export type HierarchyRecord = {
  id: HierarchyId;
  supertype: EntityId;
  subtypes: EntityId[];
  exclusive: boolean;
  total: boolean;
};

export type DomainModel = {
  entities: EntityRecord[];
  relationships: RelationshipRecord[];
  hierarchies: HierarchyRecord[];
  tables: Table[];
};
