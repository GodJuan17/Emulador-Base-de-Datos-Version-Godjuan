import type { Dispatch, SetStateAction } from "react";
import type { DraftAttribute } from "../DraftAttribute";
import { WeakEntityDraftPreview } from "../previews/WeakEntityDraftPreview";
import type { DependencyMark, Table, WeakCardinality } from "../../../parser/ddlParser";
type WeakDraft = {
  name: string;
  parent: string;
  dependency: DependencyMark;
  cardinality: WeakCardinality;
  identifier: string;
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
  return (
    <div className="modal-content entity-preview-form">
      <WeakEntityDraftPreview
        parent={weakDraft.parent}
        name={weakDraft.name}
        relationName={weakDraft.relationName}
        dependency={weakDraft.dependency}
        cardinality={weakDraft.cardinality}
        identifier={weakDraft.identifier}
        attributes={weakAttributes.map((attribute) => attribute.name || "atributo")}
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
        <label className="form-field">
          Entidad fuerte
          <select
            value={weakDraft.parent}
            onChange={(event) =>
              setWeakDraft((current) => ({ ...current, parent: event.target.value }))
            }
          >
            <option value="">Seleccionar entidad fuerte</option>
            {tables
              .filter((table) => table.primaryKey.length > 0)
              .map((table) => (
                <option key={table.name} value={table.name}>
                  {table.name}
                </option>
              ))}
          </select>
        </label>
        <label className="form-field">
          Tipo de identificación
          <select
            value={weakDraft.dependency}
            onChange={(event) =>
              setWeakDraft((current) => ({
                ...current,
                dependency: event.target.value as DependencyMark,
              }))
            }
          >
            <option value="E">Por existencia (E)</option>
            <option value="ID">Por identificación (ID)</option>
          </select>
        </label>
        <label className="form-field">
          Nombre de la relación
          <input
            value={weakDraft.relationName}
            onChange={(event) =>
              setWeakDraft((current) => ({
                ...current,
                relationName: event.target.value,
              }))
            }
            placeholder="pertenece"
          />
        </label>
        <label className="form-field">
          Cardinalidad junto a la entidad débil
          <select
            value={weakDraft.cardinality}
            onChange={(event) =>
              setWeakDraft((current) => ({
                ...current,
                cardinality: event.target.value as WeakCardinality,
              }))
            }
          >
            <option value="0:N">(0,n)</option>
            <option value="1:N">(1,n)</option>
            <option value="0:1">(0,1)</option>
            <option value="1:1">(1,1)</option>
          </select>
        </label>
        {weakDraft.dependency === "E" ? (
          <label className="form-field">
            {weakDraft.dependency === "E" ? "Nombre de la llave propia" : "Identificador parcial"}
            <input
              value={weakDraft.identifier}
              onChange={(event) =>
                setWeakDraft((current) => ({
                  ...current,
                  identifier: event.target.value,
                }))
              }
              placeholder={weakDraft.dependency === "E" ? "id" : "nro_linea"}
            />
          </label>
        ) : (
          <small className="weak-id-hint">
            La PK de la entidad débil será la misma clave heredada de la entidad fuerte.
          </small>
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
                <input
                  aria-label="Tipo de dato"
                  value={attribute.type}
                  onChange={(event) =>
                    setWeakAttributes((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, type: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="TEXT"
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
