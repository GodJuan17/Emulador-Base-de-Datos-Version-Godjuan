export type RelationMode = "binary" | "recursive" | "nary";

export const relationModes: { id: RelationMode; label: string }[] = [
  { id: "binary", label: "Dos entidades" },
  { id: "recursive", label: "Recursiva" },
  { id: "nary", label: "Más de dos" },
];

export const naryPositions: [number, number][][] = [
  [
    [25, 16],
    [75, 16],
    [50, 86],
  ],
  [
    [25, 16],
    [75, 16],
    [25, 86],
    [75, 86],
  ],
];
