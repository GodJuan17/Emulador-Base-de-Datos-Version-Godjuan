import { describe, expect, it } from "vitest";
import { INITIAL_APP_STATE } from "../src/state/appState";
import {
  APP_STATE_KEY,
  LEGACY_STATE_KEYS,
  loadHistoryState,
  saveHistoryState,
  type StorageWriter,
} from "../src/state/persistence";
import { appReducer, createHistoryState } from "../src/state/reducer";
import { generateDDL } from "../src/generateDDL";

function fakeStorage(initial: Record<string, string> = {}): StorageWriter & {
  values: Record<string, string>;
} {
  const values = { ...initial };
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    },
    removeItem: (key) => {
      delete values[key];
    },
  };
}

const legacyValue = <Value>(value: Value) => JSON.stringify({ version: 1, value });

describe("estado versionado y migraciones", () => {
  it("migra todas las claves heredadas al estado nuevo sin perder datos", () => {
    const oldState = fakeStorage({
      "sima.modelador.exercise-statement.v1": legacyValue("Enunciado"),
      "sima.modelador.tables.v1": legacyValue([{ name: "Cliente", primaryKey: ["id"] }]),
      "sima.modelador.tab.v1": legacyValue("logical"),
      "sima.modelador.relation-names.v1": legacyValue({ "fk:pedido:cliente_id": "registra" }),
      "sima.modelador.cardinality-minimums.v1": legacyValue({ relation: [1, 0] }),
      "sima.modelador.attribute-marks.v1": legacyValue({
        "Cliente.telefono": { kind: "multivalued", parts: [] },
      }),
      "sima.modelador.domains.v1": legacyValue({ "Cliente.codigo": "dominio" }),
      "sima.modelador.relation-attributes.v1": legacyValue({ relation: ["fecha"] }),
      "sima.modelador.positions.v1": legacyValue({ Cliente: { x: 10, y: 20 } }),
      "sima.modelador.canvas-view.v1": legacyValue({ x: 1, y: 2, width: 800, height: 600 }),
      "sima.modelador.collapsed.v1": legacyValue({ Cliente: true }),
      "sima.modelador.hierarchies.v1": legacyValue([
        {
          id: "hierarchy-stable",
          supertype: "Persona",
          subtypes: ["Alumno", "Profesor"],
          exclusive: true,
          total: true,
        },
      ]),
    });

    const migrated = loadHistoryState(oldState).present;
    expect(migrated.exerciseStatement).toBe("Enunciado");
    expect(migrated.tables[0].name).toBe("Cliente");
    expect(migrated.tab).toBe("logical");
    expect(migrated.names["fk:pedido:cliente_id"]).toBe("registra");
    expect(migrated.cardinalityMinimums.relation).toEqual([1, 0]);
    expect(migrated.attributeMarks["Cliente.telefono"].kind).toBe("multivalued");
    expect(migrated.domains["Cliente.codigo"]).toBe("dominio");
    expect(migrated.relationAttributes.relation).toEqual(["fecha"]);
    expect(migrated.positions.Cliente).toEqual({ x: 10, y: 20 });
    expect(migrated.view.width).toBe(800);
    expect(migrated.collapsed.Cliente).toBe(true);
    expect(migrated.hierarchies[0].id).toBe("hierarchy-stable");

    saveHistoryState(oldState, createHistoryState(migrated));
    expect(JSON.parse(oldState.values[APP_STATE_KEY]).version).toBe(2);
    expect(LEGACY_STATE_KEYS.every((key) => !(key in oldState.values))).toBe(true);
  });

  it("prefiere el estado consolidado y restaura su historial", () => {
    const storedState = {
      ...INITIAL_APP_STATE,
      exerciseStatement: "Estado v2",
    };
    const store = fakeStorage({
      [APP_STATE_KEY]: JSON.stringify({
        version: 2,
        value: { present: storedState, past: [INITIAL_APP_STATE], future: [] },
      }),
      "sima.modelador.exercise-statement.v1": legacyValue("obsoleto"),
    });
    const loaded = loadHistoryState(store);

    expect(loaded.present.exerciseStatement).toBe("Estado v2");
    expect(loaded.past).toHaveLength(1);
  });
});

describe("historial del reducer", () => {
  it("deshace y rehace cambios agrupados del modelo", () => {
    const initial = createHistoryState(INITIAL_APP_STATE);
    const changed = appReducer(initial, {
      type: "update",
      history: true,
      groupId: 1,
      update: (state) => ({ ...state, exerciseStatement: "Nuevo" }),
    });
    const undone = appReducer(changed, { type: "undo" });
    const redone = appReducer(undone, { type: "redo" });

    expect(undone.present.exerciseStatement).toBe("");
    expect(redone.present.exerciseStatement).toBe("Nuevo");
  });

  it("agrupa varios cambios consecutivos de una misma interacción", () => {
    const initial = createHistoryState(INITIAL_APP_STATE);
    const first = appReducer(initial, {
      type: "update",
      history: true,
      groupId: 2,
      update: (state) => ({ ...state, tables: [] }),
    });
    const second = appReducer(first, {
      type: "update",
      history: true,
      groupId: 2,
      update: (state) => ({ ...state, domains: { "A.b": "d" } }),
    });
    expect(second.past).toHaveLength(1);
  });
});

describe("traducción de jerarquías a DDL", () => {
  const tables = [
    {
      name: "Persona",
      columns: [{ name: "id", type: "INTEGER", nullable: false, primaryKey: true, unique: false }],
      primaryKey: ["id"],
      uniqueKeys: [],
      foreignKeys: [],
      checks: [],
    },
    {
      name: "Alumno",
      columns: [
        { name: "id", type: "INTEGER", nullable: false, primaryKey: true, unique: false },
        { name: "programa", type: "TEXT", nullable: true, primaryKey: false, unique: false },
      ],
      primaryKey: ["id"],
      uniqueKeys: [],
      foreignKeys: [],
      checks: [],
    },
    {
      name: "Docente",
      columns: [{ name: "id", type: "INTEGER", nullable: false, primaryKey: true, unique: false }],
      primaryKey: ["id"],
      uniqueKeys: [],
      foreignKeys: [],
      checks: [],
    },
  ];

  it("genera PK/FK compartidas por subtipo y discriminador exclusivo total", () => {
    const ddl = generateDDL(tables, [
      {
        id: "hierarchy-1",
        supertype: "Persona",
        subtypes: ["Alumno", "Docente"],
        exclusive: true,
        total: true,
      },
    ]);

    expect(ddl).toContain('"tipo_Persona" TEXT NOT NULL');
    expect(ddl).toContain("CHECK (\"tipo_Persona\" IN ('Alumno', 'Docente'))");
    expect(ddl).toContain("PRIMARY KEY (id)");
    expect(ddl).toContain('REFERENCES "Persona" (id) ON DELETE CASCADE');
    expect(ddl).toContain("programa TEXT");
  });

  it("requiere al menos un subtipo en una jerarquía total solapada", () => {
    const ddl = generateDDL(tables, [
      {
        id: "hierarchy-2",
        supertype: "Persona",
        subtypes: ["Alumno", "Docente"],
        exclusive: false,
        total: true,
      },
    ]);
    expect(ddl).toContain('"es_Alumno" BOOLEAN NOT NULL');
    expect(ddl).toContain('CHECK ("es_Alumno" OR "es_Docente")');
  });
});
