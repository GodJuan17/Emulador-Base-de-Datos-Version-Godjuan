import { useState } from "react";
import { naryPositions, relationModes, type RelationMode } from "../relationPreviewOptions";
import { RelationDiamond } from "./RelationDiamond";
import { RelationAttributesPreview } from "./RelationAttributesPreview";

export function RelationDraftPreview({
  mode,
  onMode,
  source,
  target,
  additional,
  name,
  setName,
  attributes,
  minimums,
  maximums,
  setCardinality,
  setSource,
  setTarget,
  setAdditional,
  addParticipant,
  removeParticipant,
  roles,
  setRole,
  entities,
}: {
  mode: RelationMode;
  onMode: (mode: RelationMode) => void;
  source: string;
  target: string;
  additional: string[];
  name: string;
  setName: (name: string) => void;
  attributes: string[];
  minimums: (0 | 1)[];
  maximums: ("1" | "n")[];
  setCardinality: (index: number, min: 0 | 1, max: "1" | "n") => void;
  setSource: (value: string) => void;
  setTarget: (value: string) => void;
  setAdditional: (index: number, value: string) => void;
  addParticipant: () => void;
  removeParticipant: (index: number) => void;
  roles: [string, string];
  setRole: (index: 0 | 1, value: string) => void;
  entities: string[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const participants = [source, target, ...additional];
  const recursive = mode === "recursive";
  const ratio =
    mode === "nary"
      ? "N-aria"
      : (maximums[0] ?? "1").toUpperCase() + ":" + (maximums[1] ?? "n").toUpperCase();
  const kindOptions = ["1:1", "1:N", "N:1", "N:M"] as const;
  const applyKind = (kind: (typeof kindOptions)[number]) => {
    if (kind === "1:1") {
      setCardinality(0, 1, "1");
      setCardinality(1, 1, "1");
    } else if (kind === "1:N") {
      setCardinality(0, 1, "1");
      setCardinality(1, 0, "n");
    } else if (kind === "N:1") {
      setCardinality(0, 0, "n");
      setCardinality(1, 1, "1");
    } else {
      setCardinality(0, 0, "n");
      setCardinality(1, 0, "n");
    }
  };
  const choose = (index: number) => {
    const key = "p" + index;
    const value = participants[index];
    const options = entities.filter(
      (item) =>
        item.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
        (recursive ||
          !participants.some(
            (other, i) =>
              i !== index && other && other.toLocaleLowerCase() === item.toLocaleLowerCase(),
          )),
    );
    const pick = (item: string) => {
      if (recursive) {
        setSource(item);
        setTarget(item);
      } else if (index === 0) setSource(item);
      else if (index === 1) setTarget(item);
      else setAdditional(index - 2, item);
      setOpen(null);
    };
    return (
      <div className="relation-picker-wrap">
        <button
          type="button"
          className="relation-entity-picker"
          aria-expanded={open === key}
          onClick={() => {
            setSearch("");
            setOpen(open === key ? null : key);
          }}
        >
          {value || "Elegir entidad"}
          <span>⌄</span>
        </button>
        {open === key && (
          <div className="relation-popover">
            <input
              autoFocus
              className="relation-search"
              aria-label="Buscar entidad"
              placeholder="Buscar entidad…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="relation-entity-options">
              {options.map((item) => (
                <button type="button" key={item} onClick={() => pick(item)}>
                  {item}
                </button>
              ))}
              {options.length === 0 && <small>No se encontraron entidades</small>}
            </div>
          </div>
        )}
      </div>
    );
  };
  const cardinality = (index: number) => {
    const key = "c" + index;
    const max = maximums[index] ?? "n";
    const options: readonly (readonly [0 | 1, "1" | "n"])[] =
      index < 2
        ? [
            [0, "1"],
            [1, "1"],
            [0, "n"],
            [1, "n"],
          ]
        : [
            [0, "n"],
            [1, "n"],
          ];
    return (
      <div className="relation-cardinality-wrap">
        <button
          type="button"
          className="relation-cardinality-button"
          aria-expanded={open === key}
          onClick={() => setOpen(open === key ? null : key)}
        >
          {"(" + (minimums[index] ?? 0) + "," + max.toUpperCase() + ")"}
        </button>
        {open === key && (
          <div
            className="relation-popover cardinality-popover"
            role="group"
            aria-label={"Cardinalidad del participante " + (index + 1)}
          >
            {options.map(([min, maxValue]) => (
              <button
                type="button"
                className={minimums[index] === min && max === maxValue ? "active" : ""}
                key={"" + min + maxValue}
                onClick={() => {
                  setCardinality(index, min, maxValue);
                  setOpen(null);
                }}
              >
                {"(" + min + "," + maxValue.toUpperCase() + ")"}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  const diamond = <RelationDiamond name={name} ratio={ratio} onNameChange={setName} />;
  const spots = naryPositions[Math.min(Math.max(additional.length, 1), 2) - 1];
  const canAdd = additional.length < 2 && entities.length >= additional.length + 3;
  return (
    <section className="entity-live-preview relationship-preview relation-preview-editor">
      <header className="relation-preview-heading">
        <h4>Vista previa</h4>
        <div className="relation-mode-switch" role="group" aria-label="Tipo de interrelación">
          {relationModes.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={mode === item.id}
              disabled={item.id === "nary" && entities.length < 3}
              title={
                item.id === "nary" && entities.length < 3
                  ? "Necesitas al menos tres entidades"
                  : undefined
              }
              onClick={() => {
                setOpen(null);
                setSearch("");
                onMode(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>
      {mode !== "nary" && (
        <div
          className="relation-mode-switch relation-kind-switch"
          role="group"
          aria-label="Cardinalidad de la interrelación"
        >
          {kindOptions.map((kind) => (
            <button
              type="button"
              key={kind}
              aria-pressed={ratio === kind}
              onClick={() => {
                setOpen(null);
                applyKind(kind);
              }}
            >
              {kind}
            </button>
          ))}
        </div>
      )}
      {mode === "nary" ? (
        <div className="relation-nary-preview">
          <div className="relation-nary-stage">
            <svg
              className="relation-nary-lines"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {spots.map(([x, y], i) => (
                <line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={x}
                  y2={y}
                  className="draft-preview-edge"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {spots.map(([x, y], i) => (
              <div
                key={i}
                className={"relation-nary-node " + (y < 50 ? "top" : "bottom")}
                style={{
                  left: x + "%",
                  top: y + "%",
                  zIndex: open === "p" + i || open === "c" + i ? 6 : 2,
                }}
              >
                {choose(i)}
                {cardinality(i)}
                {i >= 3 && (
                  <button
                    type="button"
                    className="relation-nary-remove"
                    aria-label="Quitar participante"
                    onClick={() => removeParticipant(i - 2)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {diamond}
            <RelationAttributesPreview attributes={attributes} />
          </div>
          {canAdd && (
            <button type="button" className="add-draft-attribute" onClick={addParticipant}>
              ＋ Añadir participante ({additional.length + 3} entidades)
            </button>
          )}
        </div>
      ) : recursive ? (
        <div className="relation-recursive-layout">
          <div className="relation-recursive-stage">
            <div className="recursive-entity">{choose(0)}</div>
            <div className="recursive-card top">{cardinality(0)}</div>
            <div className="recursive-card bottom">{cardinality(1)}</div>
            {diamond}
            <RelationAttributesPreview attributes={attributes} placement="recursive" />
          </div>
        </div>
      ) : (
        <div className="relation-binary-layout">
          <div className="relation-end-preview">
            <small>Desde</small>
            {choose(0)}
            {cardinality(0)}
          </div>
          {diamond}
          <div className="relation-end-preview">
            <small>Hasta</small>
            {choose(1)}
            {cardinality(1)}
          </div>
          <RelationAttributesPreview attributes={attributes} />
        </div>
      )}
      {mode === "binary" && (
        <button
          type="button"
          className="relation-swap-button"
          aria-label="Intercambiar Desde y Hasta"
          title="Intercambiar Desde y Hasta"
          onClick={() => {
            setSource(target);
            setTarget(source);
            setCardinality(0, minimums[1] ?? 0, maximums[1] ?? "n");
            setCardinality(1, minimums[0] ?? 1, maximums[0] ?? "1");
            setRole(0, roles[1]);
            setRole(1, roles[0]);
          }}
        >
          ⇄
        </button>
      )}
    </section>
  );
}
