import type { DependencyMark, WeakCardinality } from "../../../parser/ddlParser";

export function WeakEntityDraftPreview({
  parent,
  name,
  relationName,
  dependency,
  cardinality,
  identifier,
  attributes,
}: {
  parent: string;
  name: string;
  relationName: string;
  dependency: DependencyMark;
  cardinality: WeakCardinality;
  identifier: string;
  attributes: string[];
}) {
  return (
    <section className="entity-live-preview relationship-preview">
      <h4>Vista previa</h4>
      <svg
        viewBox="0 0 800 460"
        role="img"
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
        <text
          x="170"
          y="222"
          textAnchor="middle"
          dominantBaseline="middle"
          className="draft-preview-label"
        >
          {parent || "Entidad fuerte"}
        </text>
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
        <text x="400" y="226" textAnchor="middle" className="draft-preview-label">
          {relationName || "Relación"}
        </text>
        <text x="400" y="132" textAnchor="middle" className="draft-preview-label">
          1:N
        </text>
        <text x="278" y="207" textAnchor="middle" className="draft-preview-label">
          (1,1)
        </text>
        <text x="522" y="207" textAnchor="middle" className="draft-preview-label">
          ({cardinality.replace(":", ",").toLowerCase()})
        </text>
        <circle cx="630" cy="278" r="6" className="draft-preview-node primary" />
        <text x="630" y="305" textAnchor="middle" className="draft-preview-label">
          {dependency === "E" ? identifier : "PK heredada"}
        </text>
        {attributes.slice(0, 3).map((attribute, index) => (
          <g key={attribute + index}>
            <line x1="630" y1="250" x2={545 + index * 85} y2="348" className="draft-preview-edge" />
            <circle cx={545 + index * 85} cy="365" r="24" className="draft-preview-node" />
            <text x={545 + index * 85} y="401" textAnchor="middle" className="draft-preview-label">
              {attribute.slice(0, 12)}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}
