export function parseShoppingListImport(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^(?:[-*•]|[☐☑])\s*/, "")
        .trim()
    )
    .filter((line) => line.length > 0);
}
