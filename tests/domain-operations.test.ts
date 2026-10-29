import { describe, expect, it } from "vitest";
import { sameName, hasDuplicateNames } from "../src/domain/names";
import {
  checkForeignKeyCompatibility,
  checkForeignKeyTargets,
  checkTableHasPrimaryKey,
  checkUniqueColumnNames,
} from "../src/domain/rules/integrity";
import { checkFirstNormalForm, checkNormalForm } from "../src/domain/rules/normalization";
import { addAttribute, deleteAttribute, editAttribute } from "../src/domain/operations/attributes";
import { deleteEntity, renameEntity } from "../src/domain/operations/entities";
import { createRelation } from "../src/domain/operations/relations";
import { editRelation } from "../src/domain/operations/relationshipEditing";
import { toDiagram } from "../src/model";
import type { DomainState } from "../src/domain/operations/types";
import type { Table } from "../src/parser/ddlParser";

const person: Table = {
  name: "Persona",
  columns: [{ name: "id", type: "INTEGER", nullable: false, primaryKey: true, unique: false }],
  primaryKey: ["id"],
  uniqueKeys: [],
  foreignKeys: [],
  checks: [],
};

const emptyState = (tables: Table[] = [person]): DomainState => ({
  tables,
  attributeMarks: {},
  domains: {},
  names: {},
  cardinalityMinimums: {},
  relationAttributes: {},
});

describe("normalización de nombres", () => {
  it("compara nombres sin distinguir mayúsculas", () => {
    expect(sameName("Persona", "PERSONA")).toBe(true);
  });

  it("detecta nombres duplicados sin distinguir mayúsculas", () => {
    expect(hasDuplicateNames(["id", "ID"])).toBe(true);
  });
});

describe("integridad del modelo", () => {
  it("rechaza tablas sin clave primaria", () => {
    expect(checkTableHasPrimaryKey({ ...person, primaryKey: [] })).toHaveLength(1);
  });

  it("detecta columnas con nombres duplicados sin distinguir mayúsculas", () => {
    const table = { ...person, columns: [...person.columns, { ...person.columns[0], name: "ID" }] };
    expect(checkUniqueColumnNames(table)).toHaveLength(1);
  });

  it("detecta claves foráneas sin tabla destino", () => {
    const table = { ...person, foreignKeys: [{ columns: ["jefe_id"], table: "Ausente" }] };
    expect(checkForeignKeyTargets([table])).toHaveLength(1);
  });

  it("comprueba que las FK referencien claves únicas con tipos compatibles", () => {
    const invalidForeignKey: Table = {
      ...person,
      name: "Detalle",
      columns: [
        { name: "persona_id", type: "TEXT", nullable: false, primaryKey: true, unique: false },
      ],
      foreignKeys: [{ columns: ["persona_id"], table: "Persona", targetColumns: ["id"] }],
    };
    expect(checkForeignKeyCompatibility([person, invalidForeignKey])).toHaveLength(1);
  });
});

describe("normalización", () => {
  it("1FN detecta atributos compuestos y multivaluados", () => {
    expect(
      checkFirstNormalForm([
        { name: "teléfono", classification: "multivalued" },
        { name: "dirección", classification: "composite" },
      ]),
    ).toHaveLength(2);
  });

  it("2FN y 3FN solo usan dependencias funcionales declaradas", () => {
    const table: Table = {
      ...person,
      columns: [
        ...person.columns,
        { name: "detalle_id", type: "INTEGER", nullable: false, primaryKey: true, unique: false },
        { name: "descripcion", type: "TEXT", nullable: true, primaryKey: false, unique: false },
      ],
      primaryKey: ["id", "detalle_id"],
    };
    expect(checkNormalForm(table, [])).toEqual([]);
    expect(
      checkNormalForm(table, [{ determinant: ["id"], dependent: ["descripcion"] }]).map(
        (issue) => issue.form,
      ),
    ).toEqual(["2NF", "3NF"]);
    expect(
      checkNormalForm(table, [{ determinant: ["id", "detalle_id"], dependent: ["descripcion"] }]),
    ).toEqual([]);
  });
});

describe("operaciones de entidad y atributo", () => {
  it("renombra una entidad y actualiza su clave foránea referenciada", () => {
    const dependent: Table = {
      ...person,
      name: "Detalle",
      columns: [
        { name: "persona_id", type: "INTEGER", nullable: false, primaryKey: true, unique: false },
      ],
      foreignKeys: [{ columns: ["persona_id"], table: "Persona", targetColumns: ["id"] }],
    };
    const result = renameEntity(emptyState([person, dependent]), "Persona", "Humano");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.tables[1].foreignKeys[0].table).toBe("Humano");
  });

  it("rechaza renombrar a un nombre ya usado sin distinguir mayúsculas", () => {
    const result = renameEntity(
      emptyState([person, { ...person, name: "Detalle" }]),
      "Persona",
      "DETALLE",
    );
    expect(result.ok).toBe(false);
  });

  it("agrega atributos con nombre disponible y tipo inicial TEXT", () => {
    const result = addAttribute(emptyState(), "Persona");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.attributeName).toBe("atributo_2");
      expect(result.value.tables[0].columns.at(-1)?.type).toBe("TEXT");
    }
  });

  it("edita un atributo sin permitir una segunda clave primaria ausente", () => {
    const result = editAttribute(emptyState(), "Persona", "id", { name: "identificador" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.tables[0].primaryKey).toEqual(["identificador"]);
  });

  it("no permite borrar la única clave primaria", () => {
    const result = deleteAttribute(emptyState(), "Persona", "id");
    expect(result.ok).toBe(false);
  });

  it("elimina una entidad y sus referencias entrantes", () => {
    const dependent: Table = {
      ...person,
      name: "Detalle",
      columns: [
        { name: "persona_id", type: "INTEGER", nullable: false, primaryKey: true, unique: false },
      ],
      foreignKeys: [{ columns: ["persona_id"], table: "Persona", targetColumns: ["id"] }],
    };
    const result = deleteEntity(emptyState([person, dependent]), "Persona");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.tables[0].foreignKeys).toEqual([]);
  });
});

describe("reglas de creación de relación", () => {
  it("1:N agrega una FK nullable cuando la participación del destino es opcional", () => {
    const draft = {
      source: "Persona",
      target: "PersonaDestino",
      participants: ["Persona", "PersonaDestino"],
      name: "conoce",
      kind: "1:N" as const,
      mandatory: false,
    };
    const result = createRelation(
      emptyState([person, { ...person, name: "PersonaDestino" }]),
      draft,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.tables[1].foreignKeys).toHaveLength(1);
  });

  it("N:M crea una tabla asociativa con claves compuestas", () => {
    const draft = {
      source: "Persona",
      target: "Destino",
      participants: ["Persona", "Destino"],
      name: "Vinculo",
      kind: "N:M" as const,
      mandatory: true,
    };
    const result = createRelation(emptyState([person, { ...person, name: "Destino" }]), draft);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.tables.at(-1)?.primaryKey).toHaveLength(2);
  });

  it("N:1 coloca la FK en el origen y conserva la orientación", () => {
    const result = createRelation(emptyState([person, { ...person, name: "Destino" }]), {
      source: "Persona",
      target: "Destino",
      participants: ["Persona", "Destino"],
      participantMinimums: [0, 1],
      participantMaximums: ["n", "1"],
      name: "tiene",
      kind: "N:1",
      mandatory: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tables[0].foreignKeys).toHaveLength(1);
    expect(result.value.tables[1].foreignKeys).toHaveLength(0);
    expect(result.value.tables[0].foreignKeys[0].relationKind).toBe("N:1");
    expect(result.value.tables[0].foreignKeys[0].participantMaximums).toEqual(["n", "1"]);
    expect(result.value.cardinalityMinimums["fk:persona:destino_id"]).toEqual([0, 1]);
    const diagram = toDiagram({ tables: result.value.tables, warnings: [] }, []);
    expect(diagram.relations[0].kind).toBe("N:1");
    expect(diagram.relations[0].left).toBe("Persona");
    expect(diagram.relations[0].right).toBe("Destino");
  });

  it("cambia N:1 a 1:N e intercambia los mínimos de participación", () => {
    const created = createRelation(emptyState([person, { ...person, name: "Destino" }]), {
      source: "Persona",
      target: "Destino",
      participants: ["Persona", "Destino"],
      participantMinimums: [0, 1],
      participantMaximums: ["n", "1"],
      name: "tiene",
      kind: "N:1",
      mandatory: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const state = { ...emptyState([person, { ...person, name: "Destino" }]), ...created.value };
    const diagram = toDiagram({ tables: state.tables, warnings: [] }, []);
    const edited = editRelation(state, diagram.relations, diagram.relations[0].id, {
      kind: "1:N",
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.value.tables?.[0].foreignKeys[0].relationKind).toBe("1:N");
    expect(edited.value.tables?.[0].foreignKeys[0].participantMaximums).toEqual(["1", "n"]);
    expect(edited.value.cardinalityMinimums?.[diagram.relations[0].id]).toEqual([1, 0]);
  });
});
