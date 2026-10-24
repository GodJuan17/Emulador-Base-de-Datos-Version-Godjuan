import type { DependencyMark, ParseResult, Table, WeakCardinality } from "./parser/ddlParser";
export type Entity = { table: Table; x: number; y: number; associative: boolean; weak: boolean };
export type AttributeMark = {
  kind: "derived" | "multivalued" | "composite" | "multivalued-composite" | "optional";
  parts: string[];
};
export type Relation = {
  id: string;
  name: string;
  left: string;
  right: string;
  participants?: string[];
  participantMinimums?: (0 | 1)[];
  participantMaximums?: ("1" | "n")[];
  roles?: [string, string];
  kind: "1:N" | "1:1" | "N:M";
  attributes: string[];
  foreignKeyNullable?: boolean;
  identifying?: boolean;
  dependency?: DependencyMark;
  weakCardinality?: WeakCardinality;
};
export type RelationDraft = {
  source: string;
  target: string;
  participants: string[];
  participantMinimums?: (0 | 1)[];
  participantMaximums?: ("1" | "n")[];
  roles?: [string, string];
  name: string;
  kind: Relation["kind"];
  mandatory: boolean;
  attributes?: string[];
};
export type DiagramModel = {
  entities: Entity[];
  relations: Relation[];
  logicalRelations: Relation[];
  warnings: string[];
};
const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.some((y) => x.toLowerCase() === y.toLowerCase()));
function fkUnique(table: Table, cols: string[]): boolean {
  return (
    table.uniqueKeys.some((k) => same(k, cols)) ||
    (table.primaryKey.length === cols.length && same(table.primaryKey, cols))
  );
}
function fkNullable(table: Table, cols: string[]): boolean {
  return cols.some(
    (name) =>
      table.columns.find((c) => c.name.toLowerCase() === name.toLowerCase())?.nullable ?? true,
  );
}
export function toDiagram(parsed: ParseResult): DiagramModel {
  const refs = new Map<string, number>();
  const warnings = [...parsed.warnings];
  parsed.tables.forEach((table) => {
    if (!table.primaryKey.length) warnings.push(`La tabla ${table.name} no tiene clave primaria.`);
    table.foreignKeys.forEach((fk) =>
      refs.set(fk.table.toLowerCase(), (refs.get(fk.table.toLowerCase()) ?? 0) + 1),
    );
  });
  const associative = new Set(
    parsed.tables
      .filter(
        (t) =>
          t.foreignKeys.length >= 2 &&
          t.primaryKey.length > 0 &&
          t.primaryKey.every((pk) =>
            t.foreignKeys.some((f) => f.columns.some((c) => c.toLowerCase() === pk.toLowerCase())),
          ) &&
          (refs.get(t.name.toLowerCase()) ?? 0) === 0,
      )
      .map((t) => t.name.toLowerCase()),
  );
  const entities = parsed.tables.map((table, i) => ({
    table,
    x: 200 + (i % 3) * 380,
    y: 180 + Math.floor(i / 3) * 360,
    associative: associative.has(table.name.toLowerCase()),
    weak:
      !associative.has(table.name.toLowerCase()) &&
      table.foreignKeys.some((fk) => fk.dependency === "E" || fk.dependency === "ID"),
  }));
  const relations: Relation[] = [];
  const logicalRelations: Relation[] = [];
  for (const table of parsed.tables)
    for (const fk of table.foreignKeys) {
      const target = parsed.tables.find((t) => t.name.toLowerCase() === fk.table.toLowerCase());
      if (!target) continue;
      const logicalId = `logical:${table.name.toLowerCase()}:${fk.columns.join(",").toLowerCase()}`;
      const logicalNullable = fkNullable(table, fk.columns);
      const identifying = fk.columns.every((c) =>
        table.primaryKey.some((pk) => pk.toLowerCase() === c.toLowerCase()),
      );
      logicalRelations.push({
        id: logicalId,
        name: `${target.name}_${table.name}`,
        left: target.name,
        right: table.name,
        kind: fkUnique(table, fk.columns) ? "1:1" : "1:N",
        attributes: [],
        foreignKeyNullable: logicalNullable,
        identifying,
        dependency: fk.dependency ?? (identifying ? "ID" : !logicalNullable ? "E" : undefined),
      });
      if (associative.has(table.name.toLowerCase())) {
        const id = `assoc:${table.name.toLowerCase()}`;
        if (relations.some((r) => r.id === id)) continue;
        const participants = table.foreignKeys.map((item) => item.table);
        if (participants.length < 2) continue;
        relations.push({
          id,
          name: table.name,
          left: participants[0],
          right: participants[1],
          participants,
          roles: table.foreignKeys[0].roles,
          participantMaximums: table.foreignKeys[0].participantMaximums,
          kind: "N:M",
          attributes: table.columns
            .filter(
              (c) =>
                !table.foreignKeys.some((f) =>
                  f.columns.some((n) => n.toLowerCase() === c.name.toLowerCase()),
                ),
            )
            .map((c) => c.name),
        });
      } else {
        const id = `fk:${table.name.toLowerCase()}:${fk.columns.join(",").toLowerCase()}`;
        const foreignKeyInPK = fk.columns.every((c) =>
          table.primaryKey.some((pk) => pk.toLowerCase() === c.toLowerCase()),
        );
        const ownsPKPart = table.primaryKey.some(
          (pk) => !fk.columns.some((c) => c.toLowerCase() === pk.toLowerCase()),
        );
        const nullable = fkNullable(table, fk.columns);
        if (foreignKeyInPK && ownsPKPart)
          warnings.push(
            `${table.name} tiene una PK mixta de FK y columnas propias; podría ser una entidad débil identificada.`,
          );
        const dependency = fk.dependency ?? (foreignKeyInPK ? "ID" : !nullable ? "E" : undefined);
        const weakCardinality = fk.weakCardinality;
        relations.push({
          id,
          name: fk.relationName ?? `${target.name}_${table.name}`,
          left: target.name,
          right: table.name,
          kind: weakCardinality
            ? weakCardinality.endsWith(":1")
              ? "1:1"
              : "1:N"
            : fkUnique(table, fk.columns)
              ? "1:1"
              : "1:N",
          attributes: [],
          foreignKeyNullable: nullable,
          identifying: foreignKeyInPK,
          dependency,
          weakCardinality,
          roles: fk.roles,
          participantMaximums: fk.participantMaximums,
        });
      }
    }
  return { entities, relations, logicalRelations, warnings: [...new Set(warnings)] };
}
