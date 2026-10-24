import type { Dispatch, SetStateAction } from "react";
import type { Entity, Hierarchy } from "../../../model";
type Selection = { entity: string; attribute: string } | null;
type Props = {
  selectedEntity: string | null;
  selectedEntityModel: Entity | undefined;
  entityNameDraft: string;
  setEntityNameDraft: Dispatch<SetStateAction<string>>;
  setSelectedEntity: Dispatch<SetStateAction<string | null>>;
  commitEntityName: () => void;
  addAttribute: (table: string) => string | null;
  setSelectedAttribute: Dispatch<SetStateAction<Selection>>;
  deleteEntity: (name: string) => void;
  setHierarchies: Dispatch<SetStateAction<Hierarchy[]>>;
};
export function EntityEditDialog({
  selectedEntity,
  selectedEntityModel,
  entityNameDraft,
  setEntityNameDraft,
  setSelectedEntity,
  commitEntityName,
  addAttribute,
  setSelectedAttribute,
  deleteEntity,
  setHierarchies,
}: Props) {
  return (
    selectedEntity &&
    selectedEntityModel && (
      <div
        className="designer-modal-backdrop mini-menu-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedEntity(null);
        }}
      >
        <section
          className="designer-modal diagram-mini-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Editar entidad"
        >
          <header>
            <div>
              <h3>Editar entidad</h3>
              <p>{selectedEntity}</p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setSelectedEntity(null)}>
              ×
            </button>
          </header>
          <label className="inspector-field">
            Nombre
            <input
              value={entityNameDraft}
              onChange={(event) => setEntityNameDraft(event.target.value)}
            />
          </label>
          <div className="inspector-buttons">
            <button type="button" className="inspector-primary" onClick={commitEntityName}>
              Guardar nombre
            </button>
            <button
              type="button"
              className="inspector-primary"
              onClick={() => {
                const name = addAttribute(selectedEntityModel.table.name);
                if (name) {
                  setSelectedAttribute({
                    entity: selectedEntityModel.table.name,
                    attribute: name,
                  });
                  setSelectedEntity(null);
                }
              }}
            >
              ＋ Añadir atributo
            </button>
            <button
              type="button"
              className="inspector-danger"
              onClick={() => {
                deleteEntity(selectedEntity);
                setHierarchies((current) =>
                  current.filter(
                    (item) =>
                      item.supertype !== selectedEntity && !item.subtypes.includes(selectedEntity),
                  ),
                );
                setSelectedEntity(null);
              }}
            >
              Eliminar entidad
            </button>
          </div>
        </section>
      </div>
    )
  );
}
