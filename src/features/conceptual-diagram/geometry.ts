import { sameName } from "../../domain/names";
import type { Entity } from "../../model";

export function point(entity: Entity | undefined, fallback: number) {
  return entity ? { x: entity.x, y: entity.y } : { x: 140 + fallback * 300, y: 620 };
}

export function entityEdge(entity: { x: number; y: number }, toward: { x: number; y: number }) {
  const dx = toward.x - entity.x,
    dy = toward.y - entity.y;
  const scale = 1 / Math.max(Math.abs(dx) / 78, Math.abs(dy) / 28, 0.0001);
  return { x: entity.x + dx * scale, y: entity.y + dy * scale };
}

export function diamondEdge(center: { x: number; y: number }, toward: { x: number; y: number }) {
  const dx = toward.x - center.x,
    dy = toward.y - center.y;
  const scale = 39 / Math.max(Math.abs(dx) + Math.abs(dy), 0.0001);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

export function attributePosition(
  entity: Entity,
  index: number,
  count: number,
  avoidAngles: number[] = [],
) {
  const extra = Math.max(0, count - 5);
  const base = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(count, 1);
  let rotation = 0;
  if (avoidAngles.length) {
    let bestScore = -Infinity;
    for (let step = 0; step < 72; step++) {
      const candidate = (step * Math.PI) / 36;
      const clearances = Array.from({ length: Math.max(count, 1) }, (_, slot) => {
        const angle = -Math.PI / 2 + (slot * 2 * Math.PI) / Math.max(count, 1) + candidate;
        return Math.min(
          ...avoidAngles.map((blocked) => {
            const delta = Math.abs(angle - blocked) % (Math.PI * 2);
            return Math.min(delta, Math.PI * 2 - delta);
          }),
        );
      });
      const score =
        Math.min(...clearances) +
        (clearances.reduce((sum, value) => sum + value, 0) / clearances.length) * 0.15;
      if (score > bestScore) {
        bestScore = score;
        rotation = candidate;
      }
    }
  }
  const angle = base + rotation;
  return {
    x: entity.x + Math.cos(angle) * (116 + extra * 11),
    y: entity.y + Math.sin(angle) * (82 + extra * 9),
    angle,
  };
}

export function attributePoint(
  entity: Entity,
  name: string,
  collapsed: boolean,
  avoidAngles: number[] = [],
) {
  const attributes = entity.table.columns.filter(
    (column) => column.primaryKey || !column.foreignKey,
  );
  const shown = collapsed ? attributes.slice(0, 1) : attributes;
  const index = shown.findIndex((column) => sameName(column.name, name));
  return index < 0 ? undefined : attributePosition(entity, index, shown.length, avoidAngles);
}

export function cardinalityPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  side: number,
) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = Math.max(1, Math.hypot(dx, dy));
  const t = 0.38;
  return {
    x: from.x + dx * t - (dy / length) * 14 * side,
    y: from.y + dy * t + (dx / length) * 14 * side,
  };
}
