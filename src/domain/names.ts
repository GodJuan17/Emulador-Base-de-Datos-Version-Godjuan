export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function sameName(first: string, second: string): boolean {
  return normalizeName(first) === normalizeName(second);
}

export function hasDuplicateNames(names: string[]): boolean {
  return new Set(names.map(normalizeName)).size !== names.length;
}

export function isUniqueName(name: string, existingNames: string[]): boolean {
  return !existingNames.some((existingName) => sameName(name, existingName));
}
