import type { Dispatch, SetStateAction } from "react";
import type { Hierarchy } from "../../../model";
import type { DiagramProps } from "../../../Diagram";
import { HierarchyPreview } from "../previews/HierarchyPreview";
type Props = {
  diagram: DiagramProps;
  selectedHierarchy: string | null;
  selectedHierarchyModel: Hierarchy | undefined;
  availableEntities: string[];
  setSelectedHierarchy: Dispatch<SetStateAction<string | null>>;
  setSelectedEntity: Dispatch<SetStateAction<string | null>>;
  setSelectedAttribute: Dispatch<SetStateAction<{ entity: string; attribute: string } | null>>;
  setSelectedRelation: Dispatch<SetStateAction<string | null>>;
};
export function HierarchyEditDialog({
  diagram,
  selectedHierarchy,
  selectedHierarchyModel,
  availableEntities,
  setSelectedHierarchy,
}: Props) {
  const { setHierarchies } = diagram;
  return (
    selectedHierarchy &&
    selectedHierarchyModel && (
      <div
        className="designer-modal-backdrop mini-menu-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedHierarchy(null);
        }}
      >
        <section
          className="designer-modal diagram-mini-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Editar jerarquía"
        >
          <header>
            <div>
              <h3>Editar herencia</h3>
              <p>Modifica el supertipo, subtipos y restricciones.</p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setSelectedHierarchy(null)}>
              ×
            </button>
          </header>
          <HierarchyPreview
            supertype={selectedHierarchyModel.supertype}
            subtypes={selectedHierarchyModel.subtypes}
            exclusive={selectedHierarchyModel.exclusive}
            total={selectedHierarchyModel.total}
          />
          <label className="inspector-field">
            Supertipo
            <select
              value={selectedHierarchyModel.supertype}
              onChange={(event) => {
                const supertype = event.target.value;
                setHierarchies((current) =>
                  current.map((item) =>
                    item.id === selectedHierarchy
                      ? {
                          ...item,
                          supertype,
                          subtypes: [...item.subtypes, item.supertype].filter(
                            (name) => name !== supertype,
                          ),
                        }
                      : item,
                  ),
                );
              }}
            >
              <option value="">Seleccionar entidad</option>
              {availableEntities.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Subtipos (elige dos o más)</legend>
            <div className="hierarchy-options">
              {availableEntities
                .filter((name) => name !== selectedHierarchyModel.supertype)
                .map((name) => (
                  <label key={name}>
                    <input
                      type="checkbox"
                      checked={selectedHierarchyModel.subtypes.includes(name)}
                      disabled={
                        selectedHierarchyModel.subtypes.includes(name) &&
                        selectedHierarchyModel.subtypes.length <= 2
                      }
                      onChange={(event) =>
                        setHierarchies((current) =>
                          current.map((item) =>
                            item.id !== selectedHierarchy
                              ? item
                              : {
                                  ...item,
                                  subtypes: event.target.checked
                                    ? [...item.subtypes, name]
                                    : item.subtypes.filter((subtype) => subtype !== name),
                                },
                          ),
                        )
                      }
                    />
                    {name}
                  </label>
                ))}
            </div>
          </fieldset>
          <div className="hierarchy-options">
            <label>
              <input
                type="checkbox"
                checked={selectedHierarchyModel.exclusive}
                onChange={(event) =>
                  setHierarchies((current) =>
                    current.map((item) =>
                      item.id === selectedHierarchy
                        ? { ...item, exclusive: event.target.checked }
                        : item,
                    ),
                  )
                }
              />
              Exclusiva · arco
            </label>
            <label>
              <input
                type="checkbox"
                checked={selectedHierarchyModel.total}
                onChange={(event) =>
                  setHierarchies((current) =>
                    current.map((item) =>
                      item.id === selectedHierarchy
                        ? { ...item, total: event.target.checked }
                        : item,
                    ),
                  )
                }
              />
              Total · círculo
            </label>
          </div>
          <button
            type="button"
            className="inspector-danger"
            onClick={() => {
              setHierarchies((current) => current.filter((item) => item.id !== selectedHierarchy));
              setSelectedHierarchy(null);
            }}
          >
            Quitar herencia
          </button>
        </section>
      </div>
    )
  );
}
