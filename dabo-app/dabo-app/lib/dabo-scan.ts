export type ScanKind = "receipt" | "list" | "promo";
export type ScanLine = { label: string; price?: string; quantity?: string };
export type ScanExtraction = {
  rawText: string;
  merchant: string;
  date: string;
  total: string;
  lines: ScanLine[];
};

const money = /(?:€\s*)?(\d{1,4}(?:[.,]\d{2}))(?:\s*€)?/g;
const dateRe = /\b(\d{1,2}[\/.\-]\d{1,2}[\/.\-](?:\d{2}|\d{4}))\b/;

export function cleanOcrText(text: string) {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseScanDate(value: string): string | null {
  const match = value.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/);
  if (!match) return null;
  const [, d, m, rawY] = match;
  const y = rawY.length === 2 ? `20${rawY}` : rawY;
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : iso;
}

export function parseMoney(value?: string): number | null {
  if (!value) return null;
  const n = Number(value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function cleanListLabel(row: string) {
  return row.replace(/^[\s•·*\-–—\[\]()]+/, "").replace(/\s{2,}/g, " ").trim();
}

export function extractScan(text: string, kind: ScanKind): ScanExtraction {
  const rawText = cleanOcrText(text);
  const rows = rawText.split("\n").map((x) => x.trim()).filter(Boolean);
  const date = rawText.match(dateRe)?.[1] || "";
  const merchant = rows.find((r) => r.length >= 3 && !dateRe.test(r) && !/\d+[.,]\d{2}/.test(r)) || "";
  const priced: ScanLine[] = [];
  for (const row of rows) {
    const matches = [...row.matchAll(money)];
    if (!matches.length) continue;
    const last = matches[matches.length - 1];
    const label = row.slice(0, last.index).replace(/[-–—:]+$/, "").trim();
    if (label.length >= 2 && !/\b(total|totaal|à payer|a payer|te betalen|amount due)\b/i.test(label)) {
      priced.push({ label, price: last[1].replace(",", ".") });
    }
  }
  const totalRow = rows.find((r) => /\b(total|totaal|à payer|a payer|te betalen|amount due)\b/i.test(r));
  const totalMatches = totalRow ? [...totalRow.matchAll(money)] : [];
  const total = totalMatches.length ? totalMatches[totalMatches.length - 1][1].replace(",", ".") : "";
  const unpriced = rows
    .map(cleanListLabel)
    .filter((r) => r.length >= 2 && r.length <= 80 && !dateRe.test(r) && !/\d+[.,]\d{2}/.test(r))
    .filter((r) => !/^(merci|bedankt|thank|total|totaal|ticket|facture|invoice)/i.test(r))
    .slice(kind === "list" ? 0 : 1, 40)
    .map((label) => ({ label }));
  return { rawText, merchant, date, total, lines: priced.length && kind !== "list" ? priced.slice(0, 50) : unpriced };
}
