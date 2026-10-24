import type { Dispatch, SetStateAction } from "react";
import type { AttributeMark } from "../../../model";
import type { Column, Table } from "../../../parser/ddlParser";

type AttributeSelection = { entity: string; name: string };
type Props = {
  attributeMenu: AttributeSelection | null;
  attributeDraft: Column | null;
  setAttributeMenu: Dispatch<SetStateAction<AttributeSelection | null>>;
  updateCurrentAttribute: (changes: Partial<Column>) => void;
  attributeMarks: Record<string, AttributeMark>;
  setAttributeMarks: (marks: Record<string, AttributeMark>) => void;
  updateAttributeMark: (kind: "simple" | AttributeMark["kind"]) => void;
  domains: Record<string, string>;
  setDomains: (domains: Record<string, string>) => void;
  menuError: string;
  setMenuError: Dispatch<SetStateAction<string>>;
  tables: Table[];
  deleteAttribute: (entity: string, name: string) => boolean;
};

export function AttributeMenuModal({
  attributeMenu,
  attributeDraft,
  setAttributeMenu,
  updateCurrentAttribute,
  attributeMarks,
  setAttributeMarks,
  updateAttributeMark,
  domains,
  setDomains,
  menuError,
  setMenuError,
  tables,
  deleteAttribute,
}: Props) {
  return (
    attributeMenu &&
    attributeDraft && (
      <div
        className="designer-modal-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAttributeMenu(null);
        }}
      >
        <section
          className="designer-modal mini-editor-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Editar atributo"
        >
          <header>
            <div>
              <h3>Editar atributo</h3>
              <p>
                {attributeMenu.entity} · {attributeMenu.name}
              </p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setAttributeMenu(null)}>
              ×
            </button>
          </header>
          <div className="modal-content">
            <label className="form-field">
              Nombre
              <input
                autoFocus
                value={attributeDraft.name}
                onChange={(event) => updateCurrentAttribute({ name: event.target.value })}
              />
            </label>
            <label className="form-field">
              Tipo
              <input
                value={attributeDraft.type}
                onChange={(event) => updateCurrentAttribute({ type: event.target.value })}
              />
            </label>
            <div className="attribute-checks">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(attributeDraft.alternateKey)}
                  onChange={(event) =>
                    updateCurrentAttribute({ alternateKey: event.target.checked })
                  }
                />{" "}
                AK
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(attributeDraft.unique)}
                  onChange={(event) => updateCurrentAttribute({ unique: event.target.checked })}
                />{" "}
                UK
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!attributeDraft.nullable}
                  onChange={(event) => updateCurrentAttribute({ nullable: !event.target.checked })}
                />{" "}
                Obligatorio
              </label>
            </div>
            <details className="attribute-classifications">
              <summary>Clasificación</summary>
              <div className="attribute-checks classification-checks">
                {(
                  [
                    "simple",
                    "derived",
                    "multivalued",
                    "composite",
                    "multivalued-composite",
                    "optional",
                  ] as const
                ).map((kind) => (
                  <label key={kind}>
                    <input
                      type="radio"
                      name="sidebar-attribute-kind"
                      checked={
                        (attributeMarks[attributeMenu.entity + "." + attributeMenu.name]?.kind ??
                          "simple") === kind
                      }
                      onChange={() => updateAttributeMark(kind)}
                    />
                    {
                      {
                        simple: "Simple",
                        derived: "Derivado",
                        multivalued: "Multivaluado",
                        composite: "Compuesto",
                        "multivalued-composite": "Multivaluado compuesto",
                        optional: "Opcional",
                      }[kind]
                    }
                  </label>
                ))}
              </div>
            </details>
            {(["composite", "multivalued-composite"] as const).includes(
              attributeMarks[attributeMenu.entity + "." + attributeMenu.name]?.kind as
                "composite" | "multivalued-composite",
            ) && (
              <label className="form-field">
                Componentes
                <input
                  value={
                    attributeMarks[attributeMenu.entity + "." + attributeMenu.name]?.parts.join(
                      ", ",
                    ) ?? ""
                  }
                  onChange={(event) => {
                    const key = attributeMenu.entity + "." + attributeMenu.name;
                    setAttributeMarks({
                      ...attributeMarks,
                      [key]: {
                        kind: attributeMarks[key]?.kind ?? "composite",
                        parts: event.target.value
                          .split(",")
                          .map((part) => part.trim())
                          .filter(Boolean),
                      },
                    });
                  }}
                  placeholder="nombre, apellido"
                />
              </label>
            )}
            <label className="form-field">
              Dominio
              <input
                value={domains[attributeMenu.entity + "." + attributeMenu.name] ?? ""}
                onChange={(event) =>
                  setDomains({
                    ...domains,
                    [attributeMenu.entity + "." + attributeMenu.name]: event.target.value,
                  })
                }
              />
            </label>
          </div>
          {menuError && (
            <p className="designer-error" role="alert">
              {menuError}
            </p>
          )}
          <footer>
            <button type="button" className="modal-cancel" onClick={() => setAttributeMenu(null)}>
              Cerrar
            </button>
            <button
              type="button"
              className="inspector-danger"
              disabled={
                attributeDraft.primaryKey ||
                tables.some((table) =>
                  table.foreignKeys.some(
                    (fk) =>
                      fk.table === attributeMenu.entity &&
                      (fk.targetColumns ?? []).includes(attributeMenu.name),
                  ),
                )
              }
              onClick={() => {
                if (deleteAttribute(attributeMenu.entity, attributeMenu.name))
                  setAttributeMenu(null);
                else
                  setMenuError(
                    "Este atributo pertenece a una clave relacionada y no se puede eliminar aquí.",
                  );
              }}
            >
              Eliminar atributo
            </button>
          </footer>
        </section>
      </div>
    )
  );
}
