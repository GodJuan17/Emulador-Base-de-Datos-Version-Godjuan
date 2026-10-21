import type { CheckConstraint, Table } from "./parser/ddlParser";

const reservedWords = new Set("all analyse analyze and any array as asc asymmetric authorization binary both case cast check collate column constraint create current_user default deferrable desc distinct do else end except false fetch for foreign from grant group having in initially intersect into lateral leading limit localtime localtimestamp new not null offset old on only or order placing primary references returning select session_user some symmetric table then to trailing true union unique user using variadic when where window with".split(" "));
function quote(identifier: string): string { return /^[a-z_][a-z0-9_$]*$/.test(identifier) && !reservedWords.has(identifier.toLowerCase()) ? identifier : `"${identifier.replace(/"/g, '""')}"`; }
function uniqueName(base: string, used: Set<string>): string { let name = base; let suffix = 2; while (used.has(name.toLowerCase())) name = `${base}_${suffix++}`; used.add(name.toLowerCase()); return name; }
function checkColumns(table: Table, check: CheckConstraint): string[] {
  if (check.columns?.length) return check.columns;
  return table.columns.filter(column => {
    const escaped = column.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\w])${escaped}([^\\w]|$)`, "i").test(check.expression);
  }).map(column => column.name);
}

export function generateDDL(tables: Table[]): string {
  return tables.map(table => {
    const usedNames = new Set<string>();
    const parts = table.columns.map(column => `  ${quote(column.name)} ${column.type}${column.nullable && !column.primaryKey ? "" : " NOT NULL"}`);
    if (table.primaryKey.length) parts.push(`  CONSTRAINT ${quote(uniqueName(`${table.name}_pk`, usedNames))} PRIMARY KEY (${table.primaryKey.map(quote).join(", ")})`);
    table.uniqueKeys.forEach(key => {
      const columns = key.join("_") || "key";
      parts.push(`  CONSTRAINT ${quote(uniqueName(`${table.name}_${columns}_uk`, usedNames))} UNIQUE (${key.map(quote).join(", ")})`);
    });
    table.foreignKeys.forEach(foreignKey => {
      const references = foreignKey.targetColumns?.length ? ` (${foreignKey.targetColumns.map(quote).join(", ")})` : "";
      const columns = foreignKey.columns.join("_") || "column";
      const deleteAction = foreignKey.dependency === "E" || foreignKey.dependency === "ID" ? "CASCADE" : foreignKey.onDelete;
      const onDelete = deleteAction ? ` ON DELETE ${deleteAction}` : "";
      parts.push(`  CONSTRAINT ${quote(uniqueName(`${table.name}_${columns}_fk`, usedNames))} FOREIGN KEY (${foreignKey.columns.map(quote).join(", ")}) REFERENCES ${quote(foreignKey.table)}${references}${onDelete}`);
    });
    (table.checks ?? []).filter(check => check.expression.trim()).forEach((check, index) => {
      const columns = checkColumns(table, check);
      const base = columns.length ? `${table.name}_${columns.join("_")}_check` : `${table.name}_check${index ? `_${index + 1}` : ""}`;
      parts.push(`  CONSTRAINT ${quote(uniqueName(base, usedNames))} CHECK (${check.expression})`);
    });
    return `CREATE TABLE ${quote(table.name)} (\n${parts.join(",\n")}\n);`;
  }).join("\n\n");
}
