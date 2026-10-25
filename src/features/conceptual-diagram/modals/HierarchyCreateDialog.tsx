import type { Dispatch, SetStateAction } from "react";
import { HierarchyPreview } from "../previews/HierarchyPreview";
type Draft = { supertype: string; subtypes: string[]; exclusive: boolean; total: boolean };
type Props = {
  hierarchyOpen: boolean;
  setHierarchyOpen: Dispatch<SetStateAction<boolean>>;
  hierarchyDraft: Draft;
  setHierarchyDraft: Dispatch<SetStateAction<Draft>>;
  availableEntities: string[];
  saveHierarchy: () => void;
};
export function HierarchyCreateDialog({
  hierarchyOpen,
  setHierarchyOpen,
  hierarchyDraft,
  setHierarchyDraft,
  availableEntities,
  saveHierarchy,
}: Props) {
  return (
    hierarchyOpen && (
      <div
        className="designer-modal-backdrop mini-menu-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setHierarchyOpen(false);
        }}
      >
        <section
          className="designer-modal diagram-mini-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Crear jerarquía"
        >
          <header>
            <div>
              <h3>Nueva jerarquía</h3>
              <p>Selecciona un supertipo y dos o más subtipos.</p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setHierarchyOpen(false)}>
              ×
            </button>
          </header>
          <HierarchyPreview
            supertype={hierarchyDraft.supertype}
            subtypes={hierarchyDraft.subtypes}
            availableEntities={availableEntities}
            exclusive={hierarchyDraft.exclusive}
            total={hierarchyDraft.total}
            onSupertypeChange={(supertype) =>
              setHierarchyDraft((current) => ({
                ...current,
                supertype,
                subtypes: current.subtypes.filter((name) => name !== supertype),
              }))
            }
            onSubtypeChange={(index, name) =>
              setHierarchyDraft((current) => {
                const subtypes = [...current.subtypes];
                while (subtypes.length <= index) subtypes.push("");
                if (name) subtypes[index] = name;
                else if (subtypes.length > 2) subtypes.splice(index, 1);
                return { ...current, subtypes };
              })
            }
            onExclusiveChange={(exclusive) =>
              setHierarchyDraft((current) => ({ ...current, exclusive }))
            }
            onTotalChange={(total) => setHierarchyDraft((current) => ({ ...current, total }))}
          />
          <button
            className="inspector-primary"
            type="button"
            disabled={
              !hierarchyDraft.supertype || hierarchyDraft.subtypes.filter(Boolean).length < 2
            }
            onClick={saveHierarchy}
          >
            Añadir jerarquía
          </button>
        </section>
      </div>
    )
  );
}
