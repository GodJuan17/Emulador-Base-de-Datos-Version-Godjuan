import type { Dispatch, SetStateAction } from "react";
import type { Relation } from "../../../model";
import type { WeakCardinality } from "../../../parser/ddlParser";
import type { DiagramProps } from "../../../Diagram";
import { RelationPreview } from "../previews/RelationPreview";
type Selection = { entity: string; attribute: string } | null;
type Props = {
  diagram: DiagramProps;
  selectedRelation: string | null;
  selectedRelationModel: Relation | undefined;
  setSelectedRelation: Dispatch<SetStateAction<string | null>>;
  setSelectedAttribute: Dispatch<SetStateAction<Selection>>;
  setSelectedEntity: Dispatch<SetStateAction<string | null>>;
  setSelectedHierarchy: Dispatch<SetStateAction<string | null>>;
  relationMinimum: (relation: Relation, index: number) => 0 | 1;
  updateRecursiveRole: (index: 0 | 1, value: string) => void;
  updateRelationMinimum: (id: string, count: number, index: number, value: 0 | 1) => void;
};
export function RelationEditDialog({
  diagram,
  selectedRelation,
  selectedRelationModel,
  setSelectedRelation,
  relationMinimum,
  updateRecursiveRole,
  updateRelationMinimum,
}: Props) {
  const { names, rename, editRelation, deleteRelation } = diagram;
  return (
    selectedRelation &&
    selectedRelationModel && (
      <div
        className="designer-modal-backdrop mini-menu-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedRelation(null);
        }}
      >
        <section
          className="designer-modal diagram-mini-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Editar interrelación"
        >
          <header>
            <div>
              <h3>Editar interrelación</h3>
              <p>{names[selectedRelation] ?? selectedRelationModel.name}</p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setSelectedRelation(null)}>
              ×
            </button>
          </header>
          <RelationPreview
            left={selectedRelationModel.left}
            right={selectedRelationModel.right}
            participants={
              selectedRelationModel.participants ?? [
                selectedRelationModel.left,
                selectedRelationModel.right,
              ]
            }
            name={names[selectedRelation] ?? selectedRelationModel.name}
            kind={selectedRelationModel.kind}
            weakCardinality={selectedRelationModel.weakCardinality}
            dependency={selectedRelationModel.dependency}
            minima={[
              relationMinimum(selectedRelationModel, 0),
              relationMinimum(selectedRelationModel, 1),
            ]}
          />
          <label className="inspector-field">
            Nombre
            <input
              value={names[selectedRelation] ?? selectedRelationModel.name}
              onChange={(event) => rename(selectedRelation, event.target.value)}
            />
          </label>
          {selectedRelationModel.left.toLowerCase() === selectedRelationModel.right.toLowerCase() &&
            selectedRelationModel.roles && (
              <>
                <label className="inspector-field">
                  Rol · {selectedRelationModel.left}
                  <input
                    value={selectedRelationModel.roles[0]}
                    onChange={(event) => updateRecursiveRole(0, event.target.value)}
                  />
                </label>
                <label className="inspector-field">
                  Rol · {selectedRelationModel.right}
                  <input
                    value={selectedRelationModel.roles[1]}
                    onChange={(event) => updateRecursiveRole(1, event.target.value)}
                  />
                </label>
              </>
            )}
          {selectedRelationModel.weakCardinality ? (
            <>
              <label className="inspector-field">
                Entidad fuerte · {selectedRelationModel.left}
                <input value="(1,1)" readOnly />
              </label>
              <label className="inspector-field">
                Cardinalidad junto a la entidad débil
                <select
                  value={selectedRelationModel.weakCardinality}
                  onChange={(event) =>
                    editRelation(selectedRelation, {
                      weakCardinality: event.target.value as WeakCardinality,
                    })
                  }
                >
                  <option value="0:N">(0,n)</option>
                  <option value="1:N">(1,n)</option>
                  <option value="0:1">(0,1)</option>
                  <option value="1:1">(1,1)</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="inspector-field">
                Cardinalidad
                <select
                  value={selectedRelationModel.kind}
                  disabled={selectedRelationModel.kind === "N:M"}
                  onChange={(event) =>
                    editRelation(selectedRelation, {
                      kind: event.target.value as Relation["kind"],
                    })
                  }
                >
                  <option value="1:N">1:N</option>
                  <option value="1:1">1:1</option>
                  <option value="N:M">N:M</option>
                </select>
              </label>
              {(
                selectedRelationModel.participants ?? [
                  selectedRelationModel.left,
                  selectedRelationModel.right,
                ]
              ).map((participant, index) => (
                <label
                  className="inspector-field"
                  key={`${selectedRelation}:${participant}:${index}`}
                >
                  Mínimo · {participant}
                  <select
                    value={relationMinimum(selectedRelationModel, index)}
                    onChange={(event) =>
                      updateRelationMinimum(
                        selectedRelation,
                        (
                          selectedRelationModel.participants ?? [
                            selectedRelationModel.left,
                            selectedRelationModel.right,
                          ]
                        ).length,
                        index,
                        Number(event.target.value) as 0 | 1,
                      )
                    }
                  >
                    <option value={0}>0 · opcional</option>
                    <option value={1}>1 · obligatorio</option>
                  </select>
                </label>
              ))}
            </>
          )}
          <button
            type="button"
            className="inspector-danger"
            onClick={() => {
              deleteRelation(selectedRelation);
              setSelectedRelation(null);
            }}
          >
            Eliminar interrelación
          </button>
        </section>
      </div>
    )
  );
}
