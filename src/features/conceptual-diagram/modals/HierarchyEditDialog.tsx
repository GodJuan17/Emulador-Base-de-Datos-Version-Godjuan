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
            availableEntities={availableEntities}
            exclusive={selectedHierarchyModel.exclusive}
            total={selectedHierarchyModel.total}
            onSupertypeChange={(supertype) =>
              setHierarchies((current) =>
                current.map((item) =>
                  item.id === selectedHierarchy
                    ? {
                        ...item,
                        supertype,
                        subtypes: [...new Set([...item.subtypes, item.supertype])].filter(
                          (name) => name !== supertype,
                        ),
                      }
                    : item,
                ),
              )
            }
            onSubtypeChange={(index, name) =>
              setHierarchies((current) =>
                current.map((item) => {
                  if (item.id !== selectedHierarchy) return item;
                  if (!name && item.subtypes.length <= 2) return item;
                  const subtypes = [...item.subtypes];
                  if (name) subtypes[index] = name;
                  else subtypes.splice(index, 1);
                  return { ...item, subtypes: [...new Set(subtypes.filter(Boolean))] };
                }),
              )
            }
            onExclusiveChange={(exclusive) =>
              setHierarchies((current) =>
                current.map((item) =>
                  item.id === selectedHierarchy ? { ...item, exclusive } : item,
                ),
              )
            }
            onTotalChange={(total) =>
              setHierarchies((current) =>
                current.map((item) => (item.id === selectedHierarchy ? { ...item, total } : item)),
              )
            }
          />
          <p className="hierarchy-key-warning" role="note">
            La PK propia de cada subtipo se sustituye por la PK heredada del supertipo en el modelo
            lógico.
          </p>
          <div className="inspector-buttons">
            <button
              type="button"
              onClick={() => {
                diagram.requestArrange();
                setSelectedHierarchy(null);
              }}
            >
              Reorganizar y cerrar
            </button>
            <button
              type="button"
              className="inspector-danger"
              onClick={() => {
                setHierarchies((current) =>
                  current.filter((item) => item.id !== selectedHierarchy),
                );
                setSelectedHierarchy(null);
              }}
            >
              Quitar herencia
            </button>
          </div>
        </section>
      </div>
    )
  );
}
