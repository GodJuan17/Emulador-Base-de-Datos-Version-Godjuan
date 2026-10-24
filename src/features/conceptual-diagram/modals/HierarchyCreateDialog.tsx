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
            exclusive={hierarchyDraft.exclusive}
            total={hierarchyDraft.total}
          />
          <label>
            Supertipo
            <select
              value={hierarchyDraft.supertype}
              onChange={(event) =>
                setHierarchyDraft((current) => ({
                  ...current,
                  supertype: event.target.value,
                  subtypes: current.subtypes.filter((name) => name !== event.target.value),
                }))
              }
            >
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
                .filter((name) => name !== hierarchyDraft.supertype)
                .map((name) => (
                  <label key={name}>
                    <input
                      type="checkbox"
                      checked={hierarchyDraft.subtypes.includes(name)}
                      onChange={(event) =>
                        setHierarchyDraft((current) => ({
                          ...current,
                          subtypes: event.target.checked
                            ? [...current.subtypes, name]
                            : current.subtypes.filter((item) => item !== name),
                        }))
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
                checked={hierarchyDraft.exclusive}
                onChange={(event) =>
                  setHierarchyDraft((current) => ({
                    ...current,
                    exclusive: event.target.checked,
                  }))
                }
              />
              Exclusiva · arco de exclusividad
            </label>
            <label>
              <input
                type="checkbox"
                checked={hierarchyDraft.total}
                onChange={(event) =>
                  setHierarchyDraft((current) => ({ ...current, total: event.target.checked }))
                }
              />
              Total (círculo)
            </label>
          </div>
          <button
            className="inspector-primary"
            type="button"
            disabled={hierarchyDraft.subtypes.length < 2}
            onClick={saveHierarchy}
          >
            Añadir jerarquía
          </button>
        </section>
      </div>
    )
  );
}
