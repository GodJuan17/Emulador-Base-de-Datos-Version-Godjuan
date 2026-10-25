type Props = { attributes: string[]; placement?: "center" | "recursive" };

export function RelationAttributesPreview({ attributes, placement = "center" }: Props) {
  if (attributes.length === 0) return null;

  const widths = attributes.map((attribute) => Math.max(70, attribute.length * 6 + 24));
  const width = Math.max(
    160,
    widths.reduce((sum, item) => sum + item, 0),
  );
  const initialOffset = (width - widths.reduce((sum, item) => sum + item, 0)) / 2;
  let offset = initialOffset;

  return (
    <div
      className={`relation-attributes-preview ${placement === "recursive" ? "recursive" : ""}`}
      aria-hidden="true"
    >
      <svg width={width} height="54" viewBox={`0 0 ${width} 54`}>
        {attributes.map((attribute, index) => {
          const x = offset + 5;
          offset += widths[index];
          return (
            <g key={attribute + index}>
              <line x1={width / 2} y1="0" x2={x} y2="25" className="draft-preview-edge" />
              <circle cx={x} cy="30" r="4" className="draft-preview-node" />
              <text x={x + 9} y="33" textAnchor="start" className="draft-preview-label">
                {attribute.slice(0, 18)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
