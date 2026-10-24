import { sameName } from "../../domain/names";
import type { Entity, Hierarchy, Relation } from "../../model";
import { INITIAL_VIEW } from "../../state/appState";

export function calculateLayout(nodes: Entity[], relations: Relation[], hierarchies: Hierarchy[]) {
  const byName = new Map(nodes.map((node) => [node.table.name.toLowerCase(), node]));
  const adjacent = new Map(nodes.map((node) => [node.table.name, new Set<string>()]));
  const connect = (a: string, b: string) => {
    const left = byName.get(a.toLowerCase())?.table.name;
    const right = byName.get(b.toLowerCase())?.table.name;
    if (left && right && left !== right) {
      adjacent.get(left)?.add(right);
      adjacent.get(right)?.add(left);
    }
  };
  for (const relation of relations) {
    const participants = relation.participants ?? [relation.left, relation.right];
    for (let i = 0; i < participants.length; i++)
      for (let j = i + 1; j < participants.length; j++) connect(participants[i], participants[j]);
  }
  for (const hierarchy of hierarchies)
    for (const subtype of hierarchy.subtypes) connect(hierarchy.supertype, subtype);
  const unseen = new Set(nodes.map((node) => node.table.name));
  const components: string[][] = [];
  while (unseen.size) {
    const root = [...unseen].sort(
      (a, b) => (adjacent.get(b)?.size ?? 0) - (adjacent.get(a)?.size ?? 0) || a.localeCompare(b),
    )[0];
    const queue = [root];
    const component: string[] = [];
    unseen.delete(root);
    while (queue.length) {
      const name = queue.shift()!;
      component.push(name);
      const next = [...(adjacent.get(name) ?? [])]
        .filter((item) => unseen.has(item))
        .sort(
          (a, b) =>
            (adjacent.get(b)?.size ?? 0) - (adjacent.get(a)?.size ?? 0) || a.localeCompare(b),
        );
      for (const item of next) {
        unseen.delete(item);
        queue.push(item);
      }
    }
    components.push(component);
  }
  const result: Record<string, { x: number; y: number }> = {};
  let offsetX = 180;
  let offsetY = 180;
  let componentRowHeight = 0;
  const maxRowWidth = 2400;
  const nodeFootprint = (name: string) => {
    const node = byName.get(name.toLowerCase());
    const attrs =
      node?.table.columns.filter((column) => column.primaryKey || !column.foreignKey) ?? [];
    const extra = Math.max(0, attrs.length - 5) * 17;
    return {
      rx: 143 + extra,
      ry: 103 + Math.max(0, attrs.length - 5) * 14,
      bottom: 103 + Math.max(0, attrs.length - 5) * 14 + 88,
    };
  };
  for (const component of components) {
    const depth = new Map<string, number>();
    const root = component[0];
    depth.set(root, 0);
    const queue = [root];
    while (queue.length) {
      const name = queue.shift()!;
      for (const next of adjacent.get(name) ?? [])
        if (component.includes(next) && !depth.has(next)) {
          depth.set(next, (depth.get(name) ?? 0) + 1);
          queue.push(next);
        }
    }
    const maxDepth = Math.max(0, ...depth.values());
    const layers = Array.from({ length: maxDepth + 1 }, (_, d) =>
      component.filter((name) => depth.get(name) === d).sort((a, b) => a.localeCompare(b)),
    );
    for (let sweep = 0; sweep < 8; sweep++) {
      for (let d = 1; d < layers.length; d++) {
        const previous = new Map(layers[d - 1].map((name, i) => [name, i]));
        const score = (name: string) => {
          const indexes = [...(adjacent.get(name) ?? [])]
            .map((item) => previous.get(item))
            .filter((value): value is number => value !== undefined);
          return indexes.length
            ? indexes.reduce((sum, value) => sum + value, 0) / indexes.length
            : Number.MAX_SAFE_INTEGER;
        };
        layers[d].sort((a, b) => score(a) - score(b) || a.localeCompare(b));
      }
      for (let d = layers.length - 2; d >= 0; d--) {
        const next = new Map(layers[d + 1].map((name, i) => [name, i]));
        const score = (name: string) => {
          const indexes = [...(adjacent.get(name) ?? [])]
            .map((item) => next.get(item))
            .filter((value): value is number => value !== undefined);
          return indexes.length
            ? indexes.reduce((sum, value) => sum + value, 0) / indexes.length
            : Number.MAX_SAFE_INTEGER;
        };
        layers[d].sort((a, b) => score(a) - score(b) || a.localeCompare(b));
      }
    }
    const maxRadiusX = Math.max(...component.map((name) => nodeFootprint(name).rx));
    const maxBottom = Math.max(...component.map((name) => nodeFootprint(name).bottom));
    const xGap = Math.max(500, maxRadiusX * 2 + 190);
    const yGap = Math.max(480, maxBottom * 2 + 95);
    const componentWidth = Math.max(1, maxDepth) * xGap + maxRadiusX * 2 + 260;
    const componentHeight = Math.max(...layers.map((layer) => layer.length)) * yGap + 300;
    if (offsetX > 180 && offsetX + componentWidth > maxRowWidth) {
      offsetX = 180;
      offsetY += componentRowHeight + 260;
      componentRowHeight = 0;
    }
    layers.forEach((layer, d) => {
      const rowHeight = (layer.length - 1) * yGap;
      layer.forEach((name, row) => {
        result[name] = {
          x: offsetX + maxRadiusX + 90 + d * xGap,
          y: offsetY + 150 + row * yGap - rowHeight / 2,
        };
      });
    });
    offsetX += componentWidth + 180;
    componentRowHeight = Math.max(componentRowHeight, componentHeight);
  }
  for (const hierarchy of hierarchies) {
    const supertype = nodes.find((node) => sameName(node.table.name, hierarchy.supertype));
    const children = hierarchy.subtypes
      .map((name) => nodes.find((node) => sameName(node.table.name, name)))
      .filter((node): node is Entity => Boolean(node));
    if (!supertype || children.length < 2) continue;
    const centerX =
      children.reduce((sum, node) => sum + (result[node.table.name]?.x ?? node.x), 0) /
      children.length;
    const topY = Math.min(...children.map((node) => result[node.table.name]?.y ?? node.y));
    const spacing = Math.max(
      520,
      430 + Math.max(...children.map((node) => nodeFootprint(node.table.name).rx)) * 0.35,
    );
    result[supertype.table.name] = { x: centerX, y: topY - spacing };
    children.forEach((child, index) => {
      result[child.table.name] = {
        x:
          centerX +
          (index - (children.length - 1) / 2) *
            Math.max(
              520,
              2 * Math.max(...children.map((node) => nodeFootprint(node.table.name).rx)) + 150,
            ),
        y: topY,
      };
    });
  }
  if (!nodes.length) return { positions: result, view: INITIAL_VIEW };
  const xs = Object.entries(result).map(([name, p]) => ({ ...p, rx: nodeFootprint(name).rx }));
  const ys = Object.entries(result).map(([name, p]) => ({ ...p, ry: nodeFootprint(name).bottom }));
  const minX = Math.min(...xs.map((p) => p.x - p.rx - 100));
  const maxX = Math.max(...xs.map((p) => p.x + p.rx + 100));
  const minY = Math.min(...ys.map((p) => p.y - p.ry - 100));
  const maxY = Math.max(...ys.map((p) => p.y + p.ry + 120));
  let width = Math.max(720, (maxX - minX) * 1.08);
  let height = Math.max(465, (maxY - minY) * 1.08);
  if (width / height > 720 / 465) height = (width * 465) / 720;
  else width = (height * 720) / 465;
  return {
    positions: result,
    view: { x: (minX + maxX - width) / 2, y: (minY + maxY - height) / 2, width, height },
  };
}
