export type HierarchyPoint = { x: number; y: number };

export type HierarchyBox = {
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
};

export type HierarchyGeometry = {
  connector: HierarchyPoint;
  radius: number;
  supertypeAnchor: HierarchyPoint;
  childAnchors: HierarchyPoint[];
  childLineEnds: HierarchyPoint[];
  stem: [HierarchyPoint, HierarchyPoint];
  doubleStem: [[HierarchyPoint, HierarchyPoint], [HierarchyPoint, HierarchyPoint]];
  arc: string;
};

function normalize(vector: HierarchyPoint): HierarchyPoint {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

export function hierarchyBoxEdge(box: HierarchyBox, toward: HierarchyPoint): HierarchyPoint {
  const dx = toward.x - box.x;
  const dy = toward.y - box.y;
  const scale = 1 / Math.max(Math.abs(dx) / box.halfWidth, Math.abs(dy) / box.halfHeight, 0.0001);
  return { x: box.x + dx * scale, y: box.y + dy * scale };
}

export function hierarchyGeometry(
  supertype: HierarchyBox,
  children: HierarchyBox[],
  options: { radius?: number; stemLength?: number } = {},
): HierarchyGeometry | null {
  if (children.length < 2) return null;
  const childCenter = {
    x: children.reduce((sum, child) => sum + child.x, 0) / children.length,
    y: children.reduce((sum, child) => sum + child.y, 0) / children.length,
  };
  const rawDirection = { x: childCenter.x - supertype.x, y: childCenter.y - supertype.y };
  const direction =
    Math.hypot(rawDirection.x, rawDirection.y) < 0.001 ? { x: 0, y: 1 } : normalize(rawDirection);
  const nearestChild = Math.min(
    ...children.map((child) => Math.hypot(child.x - supertype.x, child.y - supertype.y)),
  );
  const stemLength =
    options.stemLength ?? Math.max(74, Math.min(150, Math.max(nearestChild, 1) * 0.38));
  const radius = options.radius ?? 10;
  const connector = {
    x: supertype.x + direction.x * stemLength,
    y: supertype.y + direction.y * stemLength,
  };
  const supertypeAnchor = hierarchyBoxEdge(supertype, connector);
  const childLineEnds = children.map((child) => hierarchyBoxEdge(child, connector));
  const childAnchors = childLineEnds.map((end) => {
    const away = normalize({ x: end.x - connector.x, y: end.y - connector.y });
    return { x: connector.x + away.x * (radius + 4), y: connector.y + away.y * (radius + 4) };
  });
  const ordered = childAnchors
    .map((point, index) => ({
      point,
      angle: Math.atan2(point.y - connector.y, point.x - connector.x),
      index,
    }))
    .sort((first, second) => first.angle - second.angle);
  const first = ordered[0].point;
  const last = ordered[ordered.length - 1].point;
  const outward = normalize({ x: childCenter.x - connector.x, y: childCenter.y - connector.y });
  const spread = Math.min(120, Math.hypot(last.x - first.x, last.y - first.y) * 0.28);
  const control = {
    x: connector.x + outward.x * (radius + 14 + spread),
    y: connector.y + outward.y * (radius + 14 + spread),
  };
  const arc = `M${first.x} ${first.y} Q${control.x} ${control.y} ${last.x} ${last.y}`;
  const stemEnd = {
    x: connector.x - direction.x * radius,
    y: connector.y - direction.y * radius,
  };
  const perpendicular = { x: -direction.y, y: direction.x };
  const offset = 2.7;
  const shifted = (point: HierarchyPoint, sign: number) => ({
    x: point.x + perpendicular.x * offset * sign,
    y: point.y + perpendicular.y * offset * sign,
  });
  return {
    connector,
    radius,
    supertypeAnchor,
    childAnchors,
    childLineEnds,
    stem: [supertypeAnchor, stemEnd],
    doubleStem: [
      [shifted(supertypeAnchor, 1), shifted(stemEnd, 1)],
      [shifted(supertypeAnchor, -1), shifted(stemEnd, -1)],
    ],
    arc,
  };
}
