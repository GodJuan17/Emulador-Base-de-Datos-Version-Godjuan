import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateDDL } from "../src/generateDDL";
import { toDiagram } from "../src/model";
import { parseDDL } from "../src/parser/ddlParser";

type Fixture = {
  name: string;
  file: string;
  tables: string[];
  relationCount: number;
  logicalRelationCount: number;
  associativeTables?: string[];
  weakTables?: string[];
  weakRelationshipDependencies?: string[];
};

const fixtures: Fixture[] = [
  {
    name: "películas, productora y actor",
    file: "peliculas-productora-actor.sql",
    tables: ["Productora", "Pelicula", "Actor", "PeliculaActor"],
    relationCount: 2,
    logicalRelationCount: 3,
    associativeTables: ["PeliculaActor"],
    weakRelationshipDependencies: ["E"],
  },
  {
    name: "biblioteca",
    file: "biblioteca.sql",
    tables: ["Libro", "Socio", "Prestamo"],
    relationCount: 2,
    logicalRelationCount: 2,
    weakRelationshipDependencies: ["E", "E"],
  },
  {
    name: "universidad",
    file: "universidad.sql",
    tables: ["Estudiante", "Materia", "Matricula"],
    relationCount: 1,
    logicalRelationCount: 2,
    associativeTables: ["Matricula"],
  },
  {
    name: "entidad débil identificada",
    file: "entidad-debil.sql",
    tables: ["Empleado", "Familiar"],
    relationCount: 1,
    logicalRelationCount: 1,
    weakRelationshipDependencies: ["ID"],
  },
  {
    name: "relación recursiva",
    file: "recursiva.sql",
    tables: ["Empleado"],
    relationCount: 1,
    logicalRelationCount: 1,
  },
  {
    name: "relación n-aria",
    file: "n-aria.sql",
    tables: ["Estudiante", "Curso", "Periodo", "Inscripcion"],
    relationCount: 1,
    logicalRelationCount: 3,
    associativeTables: ["Inscripcion"],
  },
];

function readFixture(file: string): string {
  return readFileSync(new URL(`./fixtures/${file}`, import.meta.url), "utf8");
}

describe.each(fixtures)("Caracterización: $name", (fixture) => {
  const parsed = parseDDL(readFixture(fixture.file));
  const diagram = toDiagram(parsed);

  it("interpreta tablas, claves y referencias sin advertencias", () => {
    expect(parsed.tables.map((table) => table.name)).toEqual(fixture.tables);
    expect(parsed.tables.every((table) => table.primaryKey.length > 0)).toBe(true);
    expect(parsed.warnings).toEqual([]);
  });

  it("construye el modelo conceptual y el modelo lógico actuales", () => {
    expect(diagram.entities).toHaveLength(fixture.tables.length);
    expect(diagram.relations).toHaveLength(fixture.relationCount);
    expect(diagram.logicalRelations).toHaveLength(fixture.logicalRelationCount);

    const associativeTables = diagram.entities
      .filter((entity) => entity.associative)
      .map((entity) => entity.table.name);
    const weakTables = diagram.entities
      .filter((entity) => entity.weak)
      .map((entity) => entity.table.name);

    expect(associativeTables).toEqual(fixture.associativeTables ?? []);
    expect(weakTables).toEqual(fixture.weakTables ?? []);
    expect(diagram.relations.map((relation) => relation.dependency).filter(Boolean)).toEqual(
      fixture.weakRelationshipDependencies ?? [],
    );
  });

  it("genera DDL que conserva las tablas y las restricciones principales", () => {
    const ddl = generateDDL(parsed.tables);
    const roundTrip = parseDDL(ddl);

    expect(ddl.match(/CREATE TABLE/g)).toHaveLength(fixture.tables.length);
    expect(roundTrip.tables.map((table) => table.name)).toEqual(fixture.tables);
    expect(roundTrip.tables.map((table) => table.primaryKey)).toEqual(
      parsed.tables.map((table) => table.primaryKey),
    );
    expect(roundTrip.tables.map((table) => table.foreignKeys.length)).toEqual(
      parsed.tables.map((table) => table.foreignKeys.length),
    );
    expect(roundTrip.warnings).toEqual([]);
  });

  it("roundtrip parse(generateDDL(parse(ddl))) conserva la estructura", () => {
    const roundTrip = parseDDL(generateDDL(parsed.tables));
    expect(roundTrip.tables).toEqual(parsed.tables);
  });
});

it("conserva restricciones CHECK añadidas mediante ALTER TABLE", () => {
  const parsed = parseDDL(`
    CREATE TABLE Biblioteca (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL);
    ALTER TABLE Biblioteca ADD CONSTRAINT biblioteca_nombre_ck CHECK (length(nombre) > 0);
  `);

  expect(parsed.warnings).toEqual([]);
  expect(parsed.tables[0].checks).toEqual([{ expression: "length(nombre) > 0" }]);
});
