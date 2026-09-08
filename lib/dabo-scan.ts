export type ScanKind = "receipt" | "list" | "promo" | "invoice";
export type ScanLine = { label: string; price?: string };
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
    if (label.length >= 2) priced.push({ label, price: last[1].replace(",", ".") });
  }
  const totalRow = rows.find((r) => /\b(total|totaal|à payer|a payer|te betalen|amount due)\b/i.test(r));
  const totalMatches = totalRow ? [...totalRow.matchAll(money)] : [];
  const total = totalMatches.length ? totalMatches[totalMatches.length - 1][1].replace(",", ".") : "";
  const unpriced = rows
    .filter((r) => r.length >= 2 && r.length <= 80 && !dateRe.test(r) && !/\d+[.,]\d{2}/.test(r))
    .filter((r) => !/^(merci|bedankt|thank|total|totaal|ticket|facture|invoice)/i.test(r))
    .slice(kind === "list" ? 0 : 1, 30)
    .map((label) => ({ label }));
  return { rawText, merchant, date, total, lines: priced.length ? priced.slice(0, 40) : unpriced };
}
