import type { Dispatch, SetStateAction } from "react";
import type { DraftAttribute } from "../DraftAttribute";
import { EntityDraftPreview } from "../previews/EntityDraftPreview";
type Props = {
  entityName: string;
  setEntityName: (name: string) => void;
  attributes: DraftAttribute[];
  setAttributes: Dispatch<SetStateAction<DraftAttribute[]>>;
  selectedDraftAttribute: number | null;
  setSelectedDraftAttribute: Dispatch<SetStateAction<number | null>>;
  editingDraftAttribute: boolean;
  setEditingDraftAttribute: Dispatch<SetStateAction<boolean>>;
  emptyAttribute: (name: string) => DraftAttribute;
  selectedDraft: DraftAttribute | undefined;
  updateAttribute: (index: number, patch: Partial<DraftAttribute>) => void;
};
export function EntityDialogForm({
  entityName,
  setEntityName,
  attributes,
  setAttributes,
  selectedDraftAttribute,
  setSelectedDraftAttribute,
  editingDraftAttribute,
  setEditingDraftAttribute,
  emptyAttribute,
  selectedDraft,
  updateAttribute,
}: Props) {
  return (
    <div className="modal-content entity-builder-content">
      <section className="entity-preview-column">
        <h4>Vista previa</h4>
        <EntityDraftPreview
          entityName={entityName}
          setEntityName={setEntityName}
          attributes={attributes}
          selectedAttribute={selectedDraftAttribute}
          onEditAttribute={(index) => {
            setSelectedDraftAttribute(index);
            setEditingDraftAttribute(true);
          }}
        />
        <small>Selecciona un atributo del diagrama para editarlo.</small>
      </section>
      <section className="entity-attribute-editor">
        <header>
          <div>
            <h4>Atributos</h4>
            <small>Haz clic en un punto para editarlo o agrega otro.</small>
          </div>
          <button
            type="button"
            className="add-draft-attribute"
            onClick={() => {
              const index = attributes.length;
              setAttributes((current) => [
                ...current,
                emptyAttribute("atributo_" + (current.length + 1)),
              ]);
              setSelectedDraftAttribute(index);
              setEditingDraftAttribute(true);
            }}
          >
            ＋ Crear atributo
          </button>
        </header>
        {selectedDraft && editingDraftAttribute && (
          <div className="selected-draft-editor">
            <div className="selected-draft-heading">
              <strong>{selectedDraft.primaryKey ? "Clave primaria" : "Editar atributo"}</strong>
              {!selectedDraft.primaryKey && (
                <button
                  type="button"
                  className="remove-selected-draft"
                  aria-label="Eliminar atributo"
                  onClick={() => {
                    setAttributes((current) =>
                      current.filter((_, i) => i !== selectedDraftAttribute),
                    );
                    setSelectedDraftAttribute(0);
                    setEditingDraftAttribute(true);
                  }}
                >
                  Eliminar
                </button>
              )}
            </div>
            <label className="form-field">
              {selectedDraft.primaryKey ? "Nombre de la PK" : "Nombre"}
              <input
                autoFocus={!selectedDraft.primaryKey}
                value={selectedDraft.name}
                onChange={(event) =>
                  selectedDraftAttribute !== null &&
                  updateAttribute(selectedDraftAttribute, { name: event.target.value })
                }
                placeholder="id"
              />
            </label>
            {!selectedDraft.primaryKey && (
              <>
                <label className="form-field">
                  Tipo
                  <input
                    value={selectedDraft.type}
                    onChange={(event) =>
                      selectedDraftAttribute !== null &&
                      updateAttribute(selectedDraftAttribute, {
                        type: event.target.value,
                      })
                    }
                    placeholder="TEXT"
                  />
                </label>
                <div className="attribute-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedDraft.alternateKey}
                      onChange={(event) =>
                        selectedDraftAttribute !== null &&
                        updateAttribute(selectedDraftAttribute, {
                          alternateKey: event.target.checked,
                        })
                      }
                    />{" "}
                    AK
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedDraft.unique}
                      onChange={(event) =>
                        selectedDraftAttribute !== null &&
                        updateAttribute(selectedDraftAttribute, {
                          unique: event.target.checked,
                        })
                      }
                    />{" "}
                    UK
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedDraft.required}
                      onChange={(event) =>
                        selectedDraftAttribute !== null &&
                        updateAttribute(selectedDraftAttribute, {
                          required: event.target.checked,
                        })
                      }
                    />{" "}
                    Obligatorio
                  </label>
                </div>
                <details className="attribute-classifications" open>
                  <summary>Clasificación</summary>
                  <div className="attribute-checks classification-checks">
                    {(
                      [
                        "simple",
                        "derived",
                        "multivalued",
                        "composite",
                        "multivalued-composite",
                      ] as const
                    ).map((kind) => (
                      <label key={kind}>
                        <input
                          type="radio"
                          name="entity-draft-classification"
                          checked={selectedDraft.kind === kind}
                          onChange={() =>
                            selectedDraftAttribute !== null &&
                            updateAttribute(selectedDraftAttribute, { kind })
                          }
                        />
                        {
                          {
                            simple: "Simple",
                            derived: "Derivado",
                            multivalued: "Multivaluado",
                            composite: "Compuesto",
                            "multivalued-composite": "Multivaluado compuesto",
                          }[kind]
                        }
                      </label>
                    ))}
                  </div>
                  {(selectedDraft.kind === "composite" ||
                    selectedDraft.kind === "multivalued-composite") && (
                    <label className="form-field">
                      Componentes
                      <input
                        value={selectedDraft.parts}
                        onChange={(event) =>
                          selectedDraftAttribute !== null &&
                          updateAttribute(selectedDraftAttribute, {
                            parts: event.target.value,
                          })
                        }
                        placeholder="nombre, apellido"
                      />
                    </label>
                  )}
                </details>
                <label className="form-field">
                  Dominio
                  <input
                    value={selectedDraft.domain}
                    onChange={(event) =>
                      selectedDraftAttribute !== null &&
                      updateAttribute(selectedDraftAttribute, {
                        domain: event.target.value,
                      })
                    }
                    placeholder="correo_electronico"
                  />
                </label>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
