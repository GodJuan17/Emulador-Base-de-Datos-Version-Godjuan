type Props = { attributes: string[] };

export function RelationAttributesPreview({ attributes }: Props) {
  return attributes.map((attribute, index) => {
    const x = 350 + index * 50;
    return (
      <svg
        key={attribute + index}
        className="relation-attribute-svg"
        viewBox="0 0 800 65"
        aria-hidden="true"
      >
        <line x1="400" y1="0" x2={x} y2="24" className="draft-preview-edge" />
        <circle cx={x} cy="42" r="18" className="draft-preview-node" />
        <text x={x} y="64" textAnchor="middle" className="draft-preview-label">
          {attribute.slice(0, 14)}
        </text>
      </svg>
    );
  });
}
