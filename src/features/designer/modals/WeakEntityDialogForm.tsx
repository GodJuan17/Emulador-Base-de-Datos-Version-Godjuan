import type { Dispatch, SetStateAction } from "react";
import type { DraftAttribute } from "../DraftAttribute";
import { WeakEntityDraftPreview } from "../previews/WeakEntityDraftPreview";
import { PostgresTypePicker } from "../PostgresTypePicker";
import type { DependencyMark, Table, WeakCardinality } from "../../../parser/ddlParser";
type WeakDraft = {
  name: string;
  parent: string;
  dependency: DependencyMark;
  cardinality: WeakCardinality;
  identifier: string;
  foreignKeyName: string;
  relationName: string;
  attributes: string;
};
type Props = {
  weakDraft: WeakDraft;
  setWeakDraft: Dispatch<SetStateAction<WeakDraft>>;
  weakAttributes: DraftAttribute[];
  setWeakAttributes: Dispatch<SetStateAction<DraftAttribute[]>>;
  tables: Table[];
  emptyAttribute: (name: string) => DraftAttribute;
};
export function WeakEntityDialogForm({
  weakDraft,
  setWeakDraft,
  weakAttributes,
  setWeakAttributes,
  tables,
  emptyAttribute,
}: Props) {
  const parent = tables.find((table) => table.name === weakDraft.parent);
  const parentKey = parent?.primaryKey[0] ?? "id";
  return (
    <div className="modal-content entity-preview-form">
      <WeakEntityDraftPreview
        parent={weakDraft.parent}
        name={weakDraft.name}
        relationName={weakDraft.relationName}
        dependency={weakDraft.dependency}
        cardinality={weakDraft.cardinality}
        identifier={weakDraft.dependency === "ID" ? weakDraft.foreignKeyName : weakDraft.identifier}
        attributes={weakAttributes.map((attribute) => attribute.name || "atributo")}
        discriminants={weakAttributes
          .filter((attribute) => attribute.primaryKey)
          .map((attribute) => attribute.name)}
        parents={tables.filter((table) => table.primaryKey.length > 0).map((table) => table.name)}
        onParentChange={(parent) => setWeakDraft((current) => ({ ...current, parent }))}
        onRelationNameChange={(relationName) =>
          setWeakDraft((current) => ({ ...current, relationName }))
        }
        onDependencyChange={(dependency) => setWeakDraft((current) => ({ ...current, dependency }))}
        onCardinalityChange={(cardinality) =>
          setWeakDraft((current) => ({ ...current, cardinality }))
        }
      />
      <div className="entity-preview-fields">
        <label className="form-field">
          Nombre de la entidad débil
          <input
            autoFocus
            value={weakDraft.name}
            onChange={(event) =>
              setWeakDraft((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Familiar"
          />
        </label>
        <div className="form-field weak-dependency-field">
          <span>Tipo de dependencia</span>
          <div className="relation-mode-switch" role="group" aria-label="Tipo de dependencia">
            {(["E", "ID"] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={weakDraft.dependency === value}
                onClick={() => setWeakDraft((current) => ({ ...current, dependency: value }))}
              >
                {value === "ID" ? "Id" : "Ex"}
              </button>
            ))}
          </div>
          <small>Ex = existencial · Id = identificativa</small>
        </div>
        {weakDraft.dependency === "E" ? (
          <label className="form-field">
            Nombre de la llave propia
            <input
              value={weakDraft.identifier}
              onChange={(event) =>
                setWeakDraft((current) => ({
                  ...current,
                  identifier: event.target.value,
                }))
              }
              placeholder="id"
            />
          </label>
        ) : !weakDraft.cardinality.endsWith(":1") ? (
          <small className="weak-id-hint">
            Marca como discriminante cada atributo que complete la clave del padre.
          </small>
        ) : (
          <small className="weak-id-hint">
            En una relación 1:1, la clave de la entidad fuerte identifica a la entidad débil.
          </small>
        )}
        {weakDraft.dependency === "ID" && parent?.primaryKey.length === 1 && (
          <label className="form-field">
            Nombre de la clave heredada (FK)
            <input
              value={weakDraft.foreignKeyName}
              onChange={(event) =>
                setWeakDraft((current) => ({
                  ...current,
                  foreignKeyName: event.target.value,
                }))
              }
              placeholder={parentKey}
            />
            <small>Déjalo vacío para heredar «{parentKey}» del padre.</small>
          </label>
        )}
        <div className="attribute-draft-title">
          <strong>Atributos</strong>
        </div>
        <div className="attribute-draft-list">
          {weakAttributes.map((attribute, index) => (
            <article className="attribute-draft" key={index}>
              <div className="attribute-draft-main">
                <input
                  aria-label="Nombre del atributo"
                  value={attribute.name}
                  onChange={(event) =>
                    setWeakAttributes((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Nombre del atributo"
                />
                <PostgresTypePicker
                  compact
                  label=""
                  value={attribute.type}
                  onChange={(type) =>
                    setWeakAttributes((current) =>
                      current.map((item, i) => (i === index ? { ...item, type } : item)),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label="Eliminar atributo"
                  onClick={() =>
                    setWeakAttributes((current) => current.filter((_, i) => i !== index))
                  }
                >
                  ×
                </button>
              </div>
              <div className="attribute-checks">
                {weakDraft.dependency === "ID" && !weakDraft.cardinality.endsWith(":1") && (
                  <label>
                    <input
                      type="checkbox"
                      checked={attribute.primaryKey}
                      onChange={(event) =>
                        setWeakAttributes((current) =>
                          current.map((item, i) =>
                            i === index
                              ? { ...item, primaryKey: event.target.checked, required: true }
                              : item,
                          ),
                        )
                      }
                    />{" "}
                    Discriminante
                  </label>
                )}
                <label>
                  <input
                    type="checkbox"
                    checked={attribute.alternateKey}
                    onChange={(event) =>
                      setWeakAttributes((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, alternateKey: event.target.checked } : item,
                        ),
                      )
                    }
                  />{" "}
                  AK
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={attribute.unique}
                    onChange={(event) =>
                      setWeakAttributes((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, unique: event.target.checked } : item,
                        ),
                      )
                    }
                  />{" "}
                  UK
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={attribute.required}
                    onChange={(event) =>
                      setWeakAttributes((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, required: event.target.checked } : item,
                        ),
                      )
                    }
                  />{" "}
                  Obligatorio
                </label>
              </div>
              <label className="form-field domain-draft">
                Dominio
                <input
                  value={attribute.domain}
                  onChange={(event) =>
                    setWeakAttributes((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, domain: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Dominio"
                />
              </label>
            </article>
          ))}
        </div>
        <button
          type="button"
          className="add-draft-attribute"
          onClick={() =>
            setWeakAttributes((current) => [
              ...current,
              emptyAttribute(`atributo_${current.length + 1}`),
            ])
          }
        >
          ＋ Añadir atributo
        </button>
      </div>
    </div>
  );
}
