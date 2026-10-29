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
            onChange={(event) => {
              const kind = event.target.value as RelationDraft["kind"];
              setRelationDraft((current) =>
                current
                  ? {
                      ...current,
                      kind,
                      participantMaximums:
                        kind === "1:1"
                          ? ["1", "1"]
                          : kind === "N:1"
                            ? ["n", "1"]
                            : kind === "N:M"
                              ? ["n", "n"]
                              : ["1", "n"],
                      participantMinimums:
                        kind === "1:1"
                          ? [1, 1]
                          : kind === "N:1"
                            ? [current.mandatory ? 1 : 0, 1]
                            : kind === "N:M"
                              ? [1, 1]
                              : [1, current.mandatory ? 1 : 0],
                    }
                  : current,
              );
            }}
          >
            <option value="1:N">1:N</option>
            <option value="N:1">N:1</option>
            <option value="1:1">1:1</option>
            <option value="N:M">N:M</option>
          </select>
        </label>
        {relationDraft.kind !== "N:M" && (
          <label className="hierarchy-options">
            <input
              type="checkbox"
              checked={relationDraft.mandatory}
              onChange={(event) => {
                const mandatory = event.target.checked;
                setRelationDraft((current) =>
                  current
                    ? {
                        ...current,
                        mandatory,
                        participantMinimums:
                          current.kind === "N:1" ? [mandatory ? 1 : 0, 1] : [1, mandatory ? 1 : 0],
                      }
                    : current,
                );
              }}
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
