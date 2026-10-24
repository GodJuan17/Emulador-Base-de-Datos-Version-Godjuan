import type { Dispatch, SetStateAction } from "react";
import type { RelationDraft } from "../../../model";
type Props = {
  relationDraft: RelationDraft | null;
  setRelationDraft: Dispatch<SetStateAction<RelationDraft | null>>;
  saveRelation: () => void;
};
export function RelationCreateDialog({ relationDraft, setRelationDraft, saveRelation }: Props) {
  return (
    relationDraft && (
      <section className="diagram-inspector relation-builder">
        <header>
          <div>
            <strong>Nueva relación</strong>
            <small>
              {relationDraft.source} → {relationDraft.target}
            </small>
          </div>
          <button type="button" onClick={() => setRelationDraft(null)}>
            Cerrar
          </button>
        </header>
        <label className="inspector-field">
          Nombre
          <input
            value={relationDraft.name}
            onChange={(event) =>
              setRelationDraft((current) =>
                current ? { ...current, name: event.target.value } : current,
              )
            }
          />
        </label>
        <label className="inspector-field">
          Cardinalidad
          <select
            value={relationDraft.kind}
            onChange={(event) =>
              setRelationDraft((current) =>
                current
                  ? { ...current, kind: event.target.value as RelationDraft["kind"] }
                  : current,
              )
            }
          >
            <option value="1:N">1:N</option>
            <option value="1:1">1:1</option>
            <option value="N:M">N:M</option>
          </select>
        </label>
        {relationDraft.kind !== "N:M" && (
          <label className="hierarchy-options">
            <input
              type="checkbox"
              checked={relationDraft.mandatory}
              onChange={(event) =>
                setRelationDraft((current) =>
                  current ? { ...current, mandatory: event.target.checked } : current,
                )
              }
            />{" "}
            FK obligatoria (NOT NULL)
          </label>
        )}
        <small>La FK se agrega en la entidad destino; N:M crea una entidad asociativa.</small>
        <button className="inspector-primary" type="button" onClick={saveRelation}>
          Crear relación
        </button>
      </section>
    )
  );
}
