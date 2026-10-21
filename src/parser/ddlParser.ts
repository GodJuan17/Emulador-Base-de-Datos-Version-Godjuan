export type DependencyMark = "E" | "ID";
export type WeakCardinality = "0:N" | "1:N" | "0:1" | "1:1";
export type DeleteAction = "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION";
export type Column = { name: string; type: string; nullable: boolean; primaryKey: boolean; alternateKey?: boolean; unique: boolean; foreignKey?: { table: string; columns?: string[]; dependency?: DependencyMark; onDelete?: DeleteAction } };
export type ForeignKey = { columns: string[]; table: string; targetColumns?: string[]; dependency?: DependencyMark; onDelete?: DeleteAction; weakCardinality?: WeakCardinality; partialIdentifier?: string };
export type CheckConstraint = { expression: string; columns?: string[] };
export type Table = { name: string; columns: Column[]; primaryKey: string[]; uniqueKeys: string[][]; foreignKeys: ForeignKey[]; checks: CheckConstraint[] };
export type ParseResult = { tables: Table[]; warnings: string[] };

function splitTopLevel(input: string, delimiter = ","): string[] { const out: string[] = []; let start = 0; let depth = 0; let quote = ""; for (let i = 0; i < input.length; i++) { const c = input[i]; if (quote) { if (c === quote && input[i + 1] === quote) { i++; continue; } if (c === quote) quote = ""; continue; } if (c === '"' || c === "'") quote = c; else if (c === "(") depth++; else if (c === ")") depth--; else if (c === delimiter && depth === 0) { out.push(input.slice(start, i).trim()); start = i + 1; } } out.push(input.slice(start).trim()); return out.filter(Boolean); }
function cleanName(value: string): string { const parts = value.trim().split("."); return parts[parts.length - 1].replace(/^"|"$/g, "").replace(/""/g, '"'); }
function stripComments(sql: string): string { let out = ""; let quote = ""; for (let i = 0; i < sql.length; i++) { const c = sql[i]; if (quote) { out += c; if (c === quote && sql[i + 1] === quote) out += sql[++i]; else if (c === quote) quote = ""; continue; } if (c === '"' || c === "'") { quote = c; out += c; continue; } if (c === "-" && sql[i + 1] === "-") { while (i < sql.length && sql[i] !== "\n") i++; out += " "; continue; } if (c === "/" && sql[i + 1] === "*") { i += 2; while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++; i++; out += " "; continue; } out += c; } return out; }
function statements(sql: string): string[] { return splitTopLevel(stripComments(sql).replace(/;/g, "\u0000"), "\u0000"); }
function columnsList(value: string): string[] { return splitTopLevel(value).map(cleanName); }

export function parseDDL(source: string): ParseResult {
  const tables = new Map<string, Table>(); const warnings: string[] = []; const alters: { table: string; clause: string }[] = [];
  for (const statement of statements(source)) {
    if (!statement) continue;
    try {
      const create = statement.match(/^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."-]+)\s*\(([\s\S]*)\)\s*$/i);
      if (create) {
        const name = cleanName(create[1]); const table: Table = { name, columns: [], primaryKey: [], uniqueKeys: [], foreignKeys: [], checks: [] };
        for (const part of splitTopLevel(create[2])) {
          const body = part.replace(/^CONSTRAINT\s+(?:"[^"]+"|\w+)\s+/i, ""); let m: RegExpMatchArray | null;
          if ((m = body.match(/^PRIMARY\s+KEY\s*\(([\s\S]*?)\)/i))) { table.primaryKey = columnsList(m[1]); continue; }
          if ((m = body.match(/^UNIQUE\s*\(([\s\S]*?)\)/i))) { table.uniqueKeys.push(columnsList(m[1])); continue; }
          if ((m = body.match(/^FOREIGN\s+KEY\s*\(([\s\S]*?)\)\s+REFERENCES\s+([\w."-]+)(?:\s*\(([\s\S]*?)\))?/i))) { table.foreignKeys.push({ columns: columnsList(m[1]), table: cleanName(m[2]), targetColumns: m[3] ? columnsList(m[3]) : undefined, onDelete: (body.match(/\bON DELETE\s+(CASCADE|RESTRICT|SET NULL|NO ACTION)\b/i)?.[1].toUpperCase() as DeleteAction | undefined) }); continue; } if ((m = body.match(/^CHECK\s*\(([\s\S]*)\)\s*$/i))) { table.checks.push({ expression: m[1].trim() }); continue; }
          const col = body.match(/^("(?:[^"]|"")+"|[\w-]+)\s+([\w.]+(?:\s*\([^)]*\))?(?:\s*\[\])*)\s*([\s\S]*)$/);
          if (!col) { warnings.push(`No se reconoció la definición «${part.slice(0, 80)}» en ${name}.`); continue; }
          const rest = col[3]; const column: Column = { name: cleanName(col[1]), type: col[2].trim(), nullable: !/\bNOT\s+NULL\b/i.test(rest), primaryKey: /\bPRIMARY\s+KEY\b/i.test(rest), unique: /\bUNIQUE\b/i.test(rest) };
          const ref = rest.match(/\bREFERENCES\s+([\w."-]+)(?:\s*\(([^)]*)\))?/i); if (ref) { column.foreignKey = { table: cleanName(ref[1]), columns: ref[2] ? columnsList(ref[2]) : undefined, onDelete: (rest.match(/\bON DELETE\s+(CASCADE|RESTRICT|SET NULL|NO ACTION)\b/i)?.[1].toUpperCase() as DeleteAction | undefined) }; table.foreignKeys.push({ columns: [column.name], table: column.foreignKey.table, targetColumns: column.foreignKey.columns, onDelete: column.foreignKey.onDelete }); }
          if (column.primaryKey) table.primaryKey.push(column.name); if (column.unique) table.uniqueKeys.push([column.name]); table.columns.push(column);
        }
        tables.set(name.toLowerCase(), table); continue;
      }
      const alter = statement.match(/^\s*ALTER\s+TABLE\s+(?:ONLY\s+)?([\w."-]+)\s+ADD\s+([\s\S]+)$/i);
      if (alter) { alters.push({ table: cleanName(alter[1]), clause: alter[2] }); continue; }
      if (/^\s*(CREATE|ALTER)\s+TABLE\b/i.test(statement)) warnings.push(`No se pudo interpretar la sentencia: ${statement.slice(0, 90)}.`);
    } catch { warnings.push(`Error al interpretar una sentencia: ${statement.slice(0, 90)}.`); }
  }
  for (const { table: name, clause: raw } of alters) {
    const table = tables.get(name.toLowerCase()); if (!table) { warnings.push(`ALTER TABLE referencia la tabla inexistente ${name}.`); continue; }
    const body = raw.replace(/^CONSTRAINT\s+(?:"[^"]+"|\w+)\s+/i, ""); let m: RegExpMatchArray | null;
    if ((m = body.match(/^PRIMARY\s+KEY\s*\(([^)]*)\)/i))) table.primaryKey = columnsList(m[1]);
    else if ((m = body.match(/^UNIQUE\s*\(([^)]*)\)/i))) table.uniqueKeys.push(columnsList(m[1]));
    else if ((m = body.match(/^FOREIGN\s+KEY\s*\(([^)]*)\)\s+REFERENCES\s+([\w."-]+)(?:\s*\(([^)]*)\))?/i))) table.foreignKeys.push({ columns: columnsList(m[1]), table: cleanName(m[2]), targetColumns: m[3] ? columnsList(m[3]) : undefined, onDelete: (body.match(/\bON DELETE\s+(CASCADE|RESTRICT|SET NULL|NO ACTION)\b/i)?.[1].toUpperCase() as DeleteAction | undefined) }); else if ((m = body.match(/^CHECK\s*\(([\s\S]*)\)\s*$/i))) table.checks.push({ expression: m[1].trim() });
    else warnings.push(`Restricción ALTER TABLE no soportada en ${name}: ${raw}.`);
  }
  for (const table of tables.values()) {
    for (const key of table.primaryKey) { const col = table.columns.find(c => c.name.toLowerCase() === key.toLowerCase()); if (col) { col.primaryKey = true; col.nullable = false; } }
    for (const key of table.uniqueKeys) { if (key.length === 1) { const col = table.columns.find(c => c.name.toLowerCase() === key[0].toLowerCase()); if (col) col.unique = true; } }
    table.foreignKeys = table.foreignKeys.map(fk => { const target = tables.get(fk.table.toLowerCase()); if (!fk.targetColumns && target) fk.targetColumns = target.primaryKey; if (!target) warnings.push(`La FK de ${table.name} referencia la tabla inexistente ${fk.table}.`); return fk; });
    table.foreignKeys.forEach(fk => fk.columns.forEach(name => { const col = table.columns.find(c => c.name.toLowerCase() === name.toLowerCase()); if (col) col.foreignKey = { table: fk.table, columns: fk.targetColumns, dependency: fk.dependency, onDelete: fk.onDelete }; }));
    if (!table.primaryKey.length) warnings.push(`La tabla ${table.name} no tiene clave primaria.`);
  }
  return { tables: [...tables.values()], warnings: [...new Set(warnings)] };
}
