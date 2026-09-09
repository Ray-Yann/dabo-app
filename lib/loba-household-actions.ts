export type LobaHouseholdAction = {
  type: "shopping.add";
  item: string;
  quantity: string | null;
};

export function normalizeHouseholdAction(value: unknown): LobaHouseholdAction | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.type !== "shopping.add") return null;
  const item = typeof row.item === "string" ? row.item.trim().replace(/\s+/g, " ").slice(0, 160) : "";
  if (!item) return null;
  const quantity = typeof row.quantity === "string" && row.quantity.trim()
    ? row.quantity.trim().replace(/\s+/g, " ").slice(0, 80)
    : null;
  return { type: "shopping.add", item, quantity };
}

export function parseLobaHouseholdEnvelope(raw: string): { answer: string; proposedAction: LobaHouseholdAction | null } {
  const fallback = { answer: raw.trim(), proposedAction: null as LobaHouseholdAction | null };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
    if (!answer) return fallback;
    return { answer, proposedAction: normalizeHouseholdAction(parsed.proposedAction) };
  } catch {
    return fallback;
  }
}
