import type { Dispatch, SetStateAction } from "react";
import type { Table } from "../../../parser/ddlParser";

type Props = {
  entityMenu: string | null;
  tables: Table[];
  setEntityMenu: Dispatch<SetStateAction<string | null>>;
  entityNameDraft: string;
  setEntityNameDraft: Dispatch<SetStateAction<string>>;
  menuError: string;
  deleteEntity: (name: string) => void;
  renameEntity: (oldName: string, newName: string) => boolean;
};

export function EntityMenuModal({
  entityMenu,
  tables,
  setEntityMenu,
  entityNameDraft,
  setEntityNameDraft,
  menuError,
  deleteEntity,
  renameEntity,
}: Props) {
  return (
    entityMenu &&
    tables.find((table) => table.name === entityMenu) && (
      <div
        className="designer-modal-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEntityMenu(null);
        }}
      >
        <section
          className="designer-modal mini-editor-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Editar entidad"
        >
          <header>
            <div>
              <h3>Editar entidad</h3>
              <p>{entityMenu}</p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setEntityMenu(null)}>
              ×
            </button>
          </header>
          <div className="modal-content">
            <label className="form-field">
              Nombre de la entidad
              <input
                autoFocus
                value={entityNameDraft}
                onChange={(event) => setEntityNameDraft(event.target.value)}
              />
            </label>
          </div>
          {menuError && (
            <p className="designer-error" role="alert">
              {menuError}
            </p>
          )}
          <footer>
            <button type="button" className="modal-cancel" onClick={() => setEntityMenu(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="inspector-danger"
              onClick={() => {
                deleteEntity(entityMenu);
                setEntityMenu(null);
              }}
            >
              Eliminar entidad
            </button>
            <button
              type="button"
              className="modal-save"
              onClick={() => {
                if (renameEntity(entityMenu, entityNameDraft)) {
                  setEntityMenu(entityNameDraft.trim());
                }
              }}
            >
              Guardar
            </button>
          </footer>
        </section>
      </div>
    )
  );
}
