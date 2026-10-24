import { useEffect, useState } from "react";

type Props = {
  name: string;
  ratio: string;
  onNameChange: (name: string) => void;
};

export function RelationDiamond({ name, ratio, onNameChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);

  const confirm = () => {
    onNameChange(draft.trim());
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  return (
    <div className="relation-diamond-wrap">
      <span className="relation-kind-badge">{ratio}</span>
      <div className="relation-diamond">
        <span className="relation-diamond-text">
          {editing ? (
            <input
              autoFocus
              aria-label="Nombre de la interrelación"
              value={draft}
              placeholder="tiene"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirm();
                }
                if (event.key === "Escape") cancel();
              }}
              onBlur={() => setEditing(false)}
            />
          ) : (
            <button
              type="button"
              aria-label="Editar nombre de la interrelación"
              onClick={() => setEditing(true)}
            >
              {name || <span className="relation-name-placeholder">tiene</span>}
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
