/** Acorta un nombre para que quepa dentro de su contenedor y añade puntos suspensivos. */
export function truncateName(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 1))}…`;
}
