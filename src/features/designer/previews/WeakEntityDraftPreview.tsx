import type { DependencyMark, WeakCardinality } from "../../../parser/ddlParser";

export function WeakEntityDraftPreview({
  parent,
  name,
  relationName,
  dependency,
  cardinality,
  identifier,
  attributes,
  discriminants,
  parents,
  onParentChange,
  onRelationNameChange,
  onDependencyChange,
  onCardinalityChange,
}: {
  parent: string;
  name: string;
  relationName: string;
  dependency: DependencyMark;
  cardinality: WeakCardinality;
  identifier: string;
  attributes: string[];
  discriminants: string[];
  parents: string[];
  onParentChange: (parent: string) => void;
  onRelationNameChange: (name: string) => void;
  onDependencyChange: (dependency: DependencyMark) => void;
  onCardinalityChange: (cardinality: WeakCardinality) => void;
}) {
  return (
    <section className="entity-live-preview relationship-preview">
      <header className="weak-preview-heading">
        <h4>Vista previa</h4>
        <div className="relation-mode-switch" role="group" aria-label="Tipo de identificación">
          {(["E", "ID"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={dependency === value}
              onClick={() => onDependencyChange(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </header>
      <svg
        viewBox="0 0 800 460"
        role="group"
        aria-label="Vista previa de entidad débil y su relación"
      >
        <line x1="230" y1="220" x2="330" y2="220" className="draft-preview-edge" />
        <line x1="470" y1="220" x2="570" y2="220" className="draft-preview-edge" />
        <rect x="110" y="190" width="120" height="60" rx="4" className="draft-preview-entity" />
        <rect x="570" y="190" width="120" height="60" rx="4" className="draft-preview-entity" />
        <rect
          x="576"
          y="196"
          width="108"
          height="48"
          rx="3"
          className="draft-preview-entity-emphasis"
        />
        <foreignObject x="115" y="198" width="110" height="44">
          <select
            className="weak-preview-control weak-preview-parent"
            aria-label="Clase padre"
            value={parent}
            onChange={(event) => onParentChange(event.target.value)}
          >
            <option value="">Clase padre</option>
            {parents.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </foreignObject>
        <text
          x="630"
          y="222"
          textAnchor="middle"
          dominantBaseline="middle"
          className="draft-preview-label"
        >
          {name || "Entidad débil"}
        </text>
        <polygon points="400,150 470,220 400,290 330,220" className="draft-preview-entity" />
        <line x1="365" y1="185" x2="435" y2="185" className="draft-preview-edge" />
        <text x="400" y="178" textAnchor="middle" className="draft-preview-label">
          {dependency === "ID" ? "ID" : "EX"}
        </text>
        <foreignObject x="350" y="202" width="100" height="36">
          <input
            className="weak-preview-control weak-preview-relation-name"
            aria-label="Nombre de la relación"
            value={relationName}
            onChange={(event) => onRelationNameChange(event.target.value)}
            placeholder="pertenece"
          />
        </foreignObject>
        <text x="400" y="132" textAnchor="middle" className="draft-preview-label">
          1:N
        </text>
        <text x="278" y="207" textAnchor="middle" className="draft-preview-label">
          (1,1)
        </text>
        <foreignObject x="485" y="197" width="75" height="42">
          <select
            className="weak-preview-control weak-preview-cardinality"
            aria-label="Cardinalidad de la entidad débil"
            value={cardinality}
            onChange={(event) => onCardinalityChange(event.target.value as WeakCardinality)}
          >
            {(["0:N", "1:N", "0:1", "1:1"] as const).map((value) => (
              <option key={value} value={value}>
                ({value.replace(":", ",").toUpperCase()})
              </option>
            ))}
          </select>
        </foreignObject>
        <circle cx="630" cy="278" r="6" className="draft-preview-node primary" />
        <text x="630" y="305" textAnchor="middle" className="draft-preview-label">
          {identifier ||
            (dependency === "E"
              ? "id"
              : cardinality.endsWith(":1")
                ? "PK heredada"
                : "Discriminante")}
        </text>
        {attributes.slice(0, 3).map((attribute, index) => {
          const x = 545 + index * 85;
          const discriminant = discriminants.some(
            (item) => item.toLocaleLowerCase() === attribute.toLocaleLowerCase(),
          );
          return (
            <g key={attribute + index}>
              <line x1="630" y1="250" x2={x} y2="348" className="draft-preview-edge" />
              {dependency === "ID" && discriminant && (
                <line x1="630" y1="284" x2={x} y2="359" className="identifying-attribute-edge" />
              )}
              <circle
                cx={x}
                cy="365"
                r="24"
                className={discriminant ? "draft-preview-node primary" : "draft-preview-node"}
              />
              <text x={x} y="401" textAnchor="middle" className="draft-preview-label">
                {attribute.slice(0, 12)}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
