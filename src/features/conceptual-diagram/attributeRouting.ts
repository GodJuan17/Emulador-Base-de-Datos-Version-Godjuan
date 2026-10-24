import type { Entity } from "../../model";

export function orthogonalAttributeRoute(
  start: { x: number; y: number },
  end: { x: number; y: number },
  entities: Entity[],
) {
  const boxes = entities.map((entity) => ({
    left: entity.x - 84,
    right: entity.x + 84,
    top: entity.y - 36,
    bottom: entity.y + 36,
  }));
  const minX = Math.min(...boxes.map((box) => box.left)) - 28,
    maxX = Math.max(...boxes.map((box) => box.right)) + 28;
  const minY = Math.min(...boxes.map((box) => box.top)) - 28,
    maxY = Math.max(...boxes.map((box) => box.bottom)) + 28;
  const candidates = [
    ...(Math.abs(start.x - end.x) < 0.1 || Math.abs(start.y - end.y) < 0.1 ? [[start, end]] : []),
    [start, { x: end.x, y: start.y }, end],
    [start, { x: start.x, y: end.y }, end],
    ...[minX, maxX].map((x) => [start, { x, y: start.y }, { x, y: end.y }, end]),
    ...[minY, maxY].map((y) => [start, { x: start.x, y }, { x: end.x, y }, end]),
  ];
  const intersects = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    box: { left: number; right: number; top: number; bottom: number },
  ) =>
    Math.abs(a.y - b.y) < 0.1
      ? a.y > box.top &&
        a.y < box.bottom &&
        Math.max(Math.min(a.x, b.x), box.left) < Math.min(Math.max(a.x, b.x), box.right)
      : Math.abs(a.x - b.x) < 0.1 &&
        a.x > box.left &&
        a.x < box.right &&
        Math.max(Math.min(a.y, b.y), box.top) < Math.min(Math.max(a.y, b.y), box.bottom);
  const score = (path: { x: number; y: number }[]) =>
    path
      .slice(1)
      .reduce(
        (sum, point, index) =>
          sum +
          boxes.reduce((hits, box) => hits + Number(intersects(path[index], point, box)), 0) *
            10000 +
          Math.hypot(point.x - path[index].x, point.y - path[index].y),
        0,
      );
  const path = candidates.reduce((best, candidate) =>
    score(candidate) < score(best) ? candidate : best,
  );
  return path.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");
}
