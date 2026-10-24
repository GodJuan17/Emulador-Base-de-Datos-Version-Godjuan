import type { DraftAttribute } from "../DraftAttribute";

export function EntityDraftPreview({
  entityName,
  setEntityName,
  attributes,
  selectedAttribute,
  onEditAttribute,
}: {
  entityName: string;
  setEntityName: (name: string) => void;
  attributes: DraftAttribute[];
  selectedAttribute: number | null;
  onEditAttribute: (index: number) => void;
}) {
  const cx = 400,
    cy = 220,
    rx = 280,
    ry = 150,
    halfWidth = 96,
    halfHeight = 32;
  return (
    <section
      className="entity-live-preview"
      aria-label="Vista previa en vivo del modelo conceptual"
    >
      <div className="entity-preview-diagram">
        <svg
          viewBox="0 0 800 460"
          role="img"
          aria-label="Rectángulo de entidad con atributos alrededor"
        >
          <defs>
            <marker
              id="draft-multivalued-arrow"
              markerWidth="9"
              markerHeight="9"
              refX="8"
              refY="4.5"
              orient="auto"
            >
              <path d="M0 0L9 4.5L0 9z" fill="#6d8791" />
            </marker>
          </defs>
          {attributes.map((attribute, index) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(attributes.length, 1);
            const dx = Math.cos(angle),
              dy = Math.sin(angle),
              x = cx + dx * rx,
              y = cy + dy * ry;
            const edgeDistance = Math.min(
              Math.abs(dx) > 0.001 ? halfWidth / Math.abs(dx) : Infinity,
              Math.abs(dy) > 0.001 ? halfHeight / Math.abs(dy) : Infinity,
            );
            const x1 = cx + dx * edgeDistance,
              y1 = cy + dy * edgeDistance;
            const anchor = dx > 0.35 ? "start" : dx < -0.35 ? "end" : "middle";
            const labelX = x + dx * 17,
              labelY = y + dy * 17 + (dy < -0.35 ? -2 : dy > 0.35 ? 10 : 4);
            const composite =
                attribute.kind === "composite" || attribute.kind === "multivalued-composite",
              derived = attribute.kind === "derived",
              optional = !attribute.required || attribute.kind === "optional";
            const children = composite
              ? [-1, 0, 1].map((offset) => ({
                  x: x + dx * 34 - dy * offset * 17,
                  y: y + dy * 34 + dx * offset * 17,
                }))
              : [];
            const domain = attribute.domain.trim(),
              domainRx = Math.max(25, domain.length * 3.8),
              domainX = (x1 + x) / 2,
              domainY = (y1 + y) / 2;
            return (
              <g
                key={attribute.name + "-" + index}
                className={
                  selectedAttribute === index
                    ? "draft-preview-selected"
                    : "draft-preview-selectable"
                }
                onClick={() => onEditAttribute(index)}
                role="button"
                tabIndex={0}
                aria-label={"Editar atributo " + (attribute.name || "sin nombre")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onEditAttribute(index);
                }}
              >
                <line
                  x1={x1}
                  y1={y1}
                  x2={x}
                  y2={y}
                  className={optional ? "draft-preview-edge optional" : "draft-preview-edge"}
                  markerEnd={
                    attribute.kind === "multivalued" || attribute.kind === "multivalued-composite"
                      ? "url(#draft-multivalued-arrow)"
                      : undefined
                  }
                />
                {children.map((child, i) => (
                  <g key={i}>
                    <line x1={x} y1={y} x2={child.x} y2={child.y} className="draft-preview-edge" />
                    <circle cx={child.x} cy={child.y} r="4" className="draft-preview-node" />
                  </g>
                ))}
                {selectedAttribute === index && (
                  <path
                    d={
                      "M" +
                      (x - 12) +
                      " " +
                      (y - 6) +
                      "v-6h6 M" +
                      (x + 6) +
                      " " +
                      (y - 12) +
                      "h6v6 M" +
                      (x + 12) +
                      " " +
                      (y + 6) +
                      "v6h-6 M" +
                      (x - 6) +
                      " " +
                      (y + 12) +
                      "h-6v-6"
                    }
                    className="draft-preview-selection-reticle"
                  />
                )}
                {attribute.primaryKey ? (
                  <circle cx={x} cy={y} r="7" className="draft-preview-node primary" />
                ) : attribute.alternateKey ? (
                  <>
                    <path
                      d={"M" + x + " " + (y - 7) + " A7 7 0 0 0 " + x + " " + (y + 7) + " Z"}
                      className="draft-preview-half"
                    />
                    <circle cx={x} cy={y} r="7" className="draft-preview-node outline" />
                  </>
                ) : (
                  <circle
                    cx={x}
                    cy={y}
                    r="7"
                    className={derived ? "draft-preview-node derived" : "draft-preview-node"}
                  />
                )}
                {attribute.unique && !attribute.primaryKey && (
                  <circle cx={x} cy={y} r="10" className="draft-preview-unique" />
                )}
                <text x={labelX} y={labelY} textAnchor={anchor} className="draft-preview-label">
                  {(attribute.name || "atributo").slice(0, 18)}
                </text>
                {domain && (
                  <g className="draft-preview-domain">
                    <ellipse
                      cx={domainX}
                      cy={domainY}
                      rx={domainRx}
                      ry="13"
                      className="domain-oval"
                    />
                    <text x={domainX} y={domainY + 3} textAnchor="middle" className="domain-label">
                      {domain}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          <rect
            x={cx - halfWidth}
            y={cy - halfHeight}
            width={halfWidth * 2}
            height={halfHeight * 2}
            rx="4"
            className="draft-preview-entity"
          />
          <path
            d={
              "M" +
              (cx + halfWidth) +
              " " +
              (cy - halfHeight) +
              "v" +
              halfHeight * 2 +
              "h" +
              -halfWidth * 2
            }
            className="draft-preview-entity-emphasis"
          />
        </svg>
        <input
          className="entity-preview-name"
          aria-label="Nombre de la entidad"
          value={entityName}
          onChange={(event) => setEntityName(event.target.value)}
          placeholder="Nombre de la entidad"
        />
      </div>
    </section>
  );
}
