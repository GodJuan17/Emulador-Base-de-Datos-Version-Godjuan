import { describe, expect, it } from "vitest";
import { hierarchyGeometry } from "../src/features/conceptual-diagram/hierarchyGeometry";

describe("geometría de jerarquías", () => {
  it("coloca el conector entre el supertipo y los subtipos", () => {
    const geometry = hierarchyGeometry({ x: 300, y: 100, halfWidth: 78, halfHeight: 28 }, [
      { x: 120, y: 420, halfWidth: 78, halfHeight: 28 },
      { x: 480, y: 420, halfWidth: 78, halfHeight: 28 },
    ]);
    expect(geometry).not.toBeNull();
    if (!geometry) return;
    expect(geometry.connector.y).toBeGreaterThan(128);
    expect(geometry.connector.y).toBeLessThan(420);
    expect(geometry.childAnchors).toHaveLength(2);
    expect(geometry.childLineEnds).toHaveLength(2);
    expect(geometry.doubleStem).toHaveLength(2);
    expect(geometry.arc).toContain("Q");
  });

  it("no genera geometría con menos de dos subtipos", () => {
    expect(
      hierarchyGeometry({ x: 300, y: 100, halfWidth: 78, halfHeight: 28 }, [
        { x: 300, y: 420, halfWidth: 78, halfHeight: 28 },
      ]),
    ).toBeNull();
  });
});
