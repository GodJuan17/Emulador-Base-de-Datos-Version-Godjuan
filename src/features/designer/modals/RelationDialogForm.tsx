import type { Dispatch, SetStateAction } from "react";
import type { RelationDraft } from "../../../model";
import type { Table } from "../../../parser/ddlParser";
import type { RelationMode } from "../relationPreviewOptions";
import { RelationDraftPreview } from "../previews/RelationDraftPreview";
type DraftState = {
  source: string;
  target: string;
  additional: string[];
  minimums: (0 | 1)[];
  maximums: ("1" | "n")[];
  name: string;
  kind: RelationDraft["kind"];
  mandatory: boolean;
  attributes: string[];
  roles: [string, string];
};
type Props = {
  relation: DraftState;
  setRelation: Dispatch<SetStateAction<DraftState>>;
  relationMode: RelationMode;
  changeRelationMode: (mode: RelationMode) => void;
  setAdditionalParticipant: (index: number, value: string) => void;
  addParticipant: () => void;
  removeParticipant: (index: number) => void;
  tables: Table[];
};
export function RelationDialogForm({
  relation,
  setRelation,
  relationMode,
  changeRelationMode,
  setAdditionalParticipant,
  addParticipant,
  removeParticipant,
  tables,
}: Props) {
  return (
    <div className="modal-content entity-preview-form">
      <RelationDraftPreview
        mode={relationMode}
        onMode={changeRelationMode}
        source={relation.source}
        target={relation.target}
        additional={relation.additional}
        name={relation.name}
        setName={(name) => setRelation((current) => ({ ...current, name }))}
        attributes={relation.attributes}
        minimums={relation.minimums}
        maximums={relation.maximums}
        setCardinality={(index, min, max) =>
          setRelation((current) => ({
            ...current,
            minimums: current.minimums.map((item, i) => (i === index ? min : item)),
            maximums: current.maximums.map((item, i) => (i === index ? max : item)),
          }))
        }
        setSource={(value) => setRelation((current) => ({ ...current, source: value }))}
        setTarget={(value) => setRelation((current) => ({ ...current, target: value }))}
        setAdditional={setAdditionalParticipant}
        addParticipant={addParticipant}
        removeParticipant={removeParticipant}
        roles={relation.roles}
        setRole={(index, value) =>
          setRelation((current) => ({
            ...current,
            roles: current.roles.map((item, i) => (i === index ? value : item)) as [string, string],
          }))
        }
        entities={tables.map((table) => table.name)}
      />
      <div className="entity-preview-fields">
        <div className="form-field">
          <span>Atributos de la interrelación</span>
          {relation.attributes.map((attribute, index) => (
            <div className="relation-attribute-row" key={index}>
              <input
                aria-label={`Nombre del atributo ${index + 1}`}
                value={attribute}
                onChange={(event) =>
                  setRelation((current) => ({
                    ...current,
                    attributes: current.attributes.map((item, i) =>
                      i === index ? event.target.value : item,
                    ),
                  }))
                }
                placeholder="Nombre del atributo"
              />
              <button
                type="button"
                aria-label="Quitar atributo"
                onClick={() =>
                  setRelation((current) => ({
                    ...current,
                    attributes: current.attributes.filter((_, i) => i !== index),
                  }))
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-draft-attribute"
            onClick={() =>
              setRelation((current) => ({
                ...current,
                attributes: [...current.attributes, `atributo_${current.attributes.length + 1}`],
              }))
            }
          >
            ＋ Añadir atributo
          </button>
        </div>
      </div>
    </div>
  );
}
