import type { Dispatch, SetStateAction } from "react";
import type { AttributeMark } from "../../../model";
import type { Column } from "../../../parser/ddlParser";
type Selection = { entity: string; attribute: string } | null;
type Props = {
  selectedAttribute: Selection;
  selectedColumn: Column | undefined;
  selectedMark: AttributeMark | undefined;
  selectedAttributeKey: string;
  domains: Record<string, string>;
  setDomains: (domains: Record<string, string>) => void;
  setSelectedAttribute: Dispatch<SetStateAction<Selection>>;
  editAttribute: (table: string, oldName: string, changes: Partial<Column>) => boolean;
  setAttributeKind: (kind: AttributeMark["kind"] | "simple") => void;
  updateAttributeParts: (value: string) => void;
  deleteAttribute: (table: string, name: string) => boolean;
};
export function AttributeEditDialog({
  selectedAttribute,
  selectedColumn,
  selectedMark,
  selectedAttributeKey,
  domains,
  setDomains,
  setSelectedAttribute,
  editAttribute,
  setAttributeKind,
  updateAttributeParts,
  deleteAttribute,
}: Props) {
  return (
    selectedAttribute &&
    selectedColumn && (
      <div
        className="designer-modal-backdrop mini-menu-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedAttribute(null);
        }}
      >
        <section
          className="designer-modal diagram-mini-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Editar atributo"
        >
          <header>
            <div>
              <h3>Editar atributo</h3>
              <p>
                {selectedAttribute.entity} · {selectedAttribute.attribute}
              </p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setSelectedAttribute(null)}>
              ×
            </button>
          </header>
          <div className="attribute-edit-fields">
            <label className="inspector-field">
              Nombre
              <input
                value={selectedColumn.name}
                onChange={(event) => {
                  if (
                    selectedAttribute &&
                    editAttribute(selectedAttribute.entity, selectedColumn.name, {
                      name: event.target.value,
                    })
                  )
                    setSelectedAttribute({ ...selectedAttribute, attribute: event.target.value });
                }}
              />
            </label>
            <label className="inspector-field">
              Tipo
              <input
                value={selectedColumn.type}
                onChange={(event) =>
                  selectedAttribute &&
                  editAttribute(selectedAttribute.entity, selectedColumn.name, {
                    type: event.target.value,
                  })
                }
              />
            </label>
            <div className="attribute-checks">
              <label>
                <input
                  type="checkbox"
                  checked={selectedColumn.primaryKey}
                  onChange={(event) =>
                    selectedAttribute &&
                    editAttribute(selectedAttribute.entity, selectedColumn.name, {
                      primaryKey: event.target.checked,
                    })
                  }
                />{" "}
                PK
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(selectedColumn.alternateKey)}
                  onChange={(event) =>
                    selectedAttribute &&
                    editAttribute(selectedAttribute.entity, selectedColumn.name, {
                      alternateKey: event.target.checked,
                    })
                  }
                />{" "}
                AK
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedColumn.unique}
                  onChange={(event) =>
                    selectedAttribute &&
                    editAttribute(selectedAttribute.entity, selectedColumn.name, {
                      unique: event.target.checked,
                    })
                  }
                />{" "}
                UK
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!selectedColumn.nullable}
                  onChange={(event) =>
                    selectedAttribute &&
                    editAttribute(selectedAttribute.entity, selectedColumn.name, {
                      nullable: !event.target.checked,
                    })
                  }
                />{" "}
                Obligatorio
              </label>
            </div>
          </div>
          <details className="attribute-classifications">
            <summary>Clasificación del atributo</summary>
            <div className="symbol-choices">
              {(
                [
                  ["simple", "Simple"],
                  ["derived", "Derivado"],
                  ["multivalued", "Multivaluado"],
                  ["composite", "Compuesto"],
                  ["multivalued-composite", "Multivaluado compuesto"],
                  ["optional", "Opcional"],
                ] as const
              ).map(([kind, label]) => (
                <button
                  type="button"
                  key={kind}
                  className={
                    selectedMark?.kind === kind || (kind === "simple" && !selectedMark)
                      ? "symbol-choice active"
                      : "symbol-choice"
                  }
                  onClick={() => setAttributeKind(kind)}
                >
                  {label}
                </button>
              ))}
            </div>
          </details>
          {(selectedMark?.kind === "composite" ||
            selectedMark?.kind === "multivalued-composite") && (
            <label className="inspector-field">
              Componentes, separados por coma
              <input
                value={selectedMark.parts.join(", ")}
                onChange={(event) => updateAttributeParts(event.target.value)}
                placeholder="nombre, apellido"
              />
            </label>
          )}
          <label className="inspector-field">
            Dominio
            <input
              value={domains[selectedAttributeKey] ?? ""}
              onChange={(event) =>
                setDomains({ ...domains, [selectedAttributeKey]: event.target.value })
              }
              placeholder="Ej. correo_electronico"
            />
          </label>
          <button
            type="button"
            className="inspector-danger"
            disabled={selectedColumn.primaryKey}
            onClick={() => {
              if (
                selectedAttribute &&
                deleteAttribute(selectedAttribute.entity, selectedAttribute.attribute)
              )
                setSelectedAttribute(null);
            }}
          >
            Eliminar atributo
          </button>
        </section>
      </div>
    )
  );
}
