export function HierarchyPreview({
  supertype,
  subtypes,
  exclusive,
  total,
}: {
  supertype: string;
  subtypes: string[];
  exclusive: boolean;
  total: boolean;
}) {
  const labels = subtypes.length ? subtypes : ["Subtipo A", "Subtipo B"];
  const points = labels.map((_, index) => ({
    x:
      300 + (index - (labels.length - 1) / 2) * Math.min(155, 460 / Math.max(labels.length - 1, 1)),
    y: 222,
  }));
  const arcStart = Math.max(50, points[0].x - 66);
  const arcEnd = Math.min(550, points[points.length - 1].x + 66);
  const arcPath = [`M${arcStart} 207`, "Q300 286", `${arcEnd} 207`].join(" ");
  return (
    <div className="diagram-kind-preview">
      <strong>Vista previa</strong>
      <svg
        viewBox="0 0 600 300"
        role="img"
        aria-label="Vista previa de jerarquía de generalización"
      >
        <rect x="220" y="28" width="160" height="52" rx="4" className="draft-preview-entity" />
        <text
          x="300"
          y="56"
          textAnchor="middle"
          dominantBaseline="middle"
          className="draft-preview-label"
        >
          {supertype || "Supertipo"}
        </text>
        <line x1="300" y1="80" x2="300" y2="126" className="draft-preview-edge" />
        <text x="322" y="105" className="draft-preview-label">
          (1,1)
        </text>
        <circle cx="300" cy="125" r="6" className="draft-preview-node outline" />
        <path d="M270 144 L330 144 L300 180 Z" className="draft-preview-entity" />
        {points.map((point, index) => (
          <g key={labels[index]}>
            <line
              x1={
                300 +
                (index - (points.length - 1) / 2) *
                  Math.min(34, 80 / Math.max(points.length - 1, 1))
              }
              y1="144"
              x2={point.x}
              y2="194"
              className="draft-preview-edge"
            />
            <text x={point.x} y="187" textAnchor="middle" className="draft-preview-label">
              (0,1)
            </text>
            <rect
              x={point.x - 66}
              y={point.y}
              width="132"
              height="48"
              rx="4"
              className="draft-preview-entity"
            />
            <text
              x={point.x}
              y={point.y + 25}
              textAnchor="middle"
              dominantBaseline="middle"
              className="draft-preview-label"
            >
              {labels[index]}
            </text>
          </g>
        ))}
        {exclusive && <path d={arcPath} className="hierarchy-arc" />}
        {total && <circle cx="300" cy="124" r="9" className="hierarchy-total" />}
      </svg>
      <small>Las cardinalidades de la jerarquía son fijas.</small>
    </div>
  );
}
