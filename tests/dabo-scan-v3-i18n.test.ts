import test from "node:test";
import assert from "node:assert/strict";
import { translations, type Lang } from "../lib/i18n";

const expected: Record<Lang, Record<string, string>> = {
  fr: {
    courses_scan_receipt: "Scanner un ticket",
    courses_scan_receipt_title: "Scanner un ticket de caisse",
    courses_scan_receipt_help: "Photographiez ou importez votre ticket, puis vérifiez les achats avant de les enregistrer.",
  },
  nl: {
    courses_scan_receipt: "Kassabon scannen",
    courses_scan_receipt_title: "Een kassabon scannen",
    courses_scan_receipt_help: "Fotografeer of importeer je kassabon en controleer de aankopen voordat je ze opslaat.",
  },
  en: {
    courses_scan_receipt: "Scan a receipt",
    courses_scan_receipt_title: "Scan a receipt",
    courses_scan_receipt_help: "Take a photo or import your receipt, then review the purchases before saving them.",
  },
  de: {
    courses_scan_receipt: "Kassenbon scannen",
    courses_scan_receipt_title: "Einen Kassenbon scannen",
    courses_scan_receipt_help: "Fotografieren oder importieren Sie Ihren Kassenbon und prüfen Sie die Einkäufe, bevor Sie sie speichern.",
  },
  es: {
    courses_scan_receipt: "Escanear un recibo",
    courses_scan_receipt_title: "Escanear un recibo de compra",
    courses_scan_receipt_help: "Fotografía o importa tu recibo y revisa las compras antes de guardarlas.",
  },
  it: {
    courses_scan_receipt: "Scansiona uno scontrino",
    courses_scan_receipt_title: "Scansiona uno scontrino",
    courses_scan_receipt_help: "Fotografa o importa lo scontrino e verifica gli acquisti prima di salvarli.",
  },
  pt: {
    courses_scan_receipt: "Digitalizar um talão",
    courses_scan_receipt_title: "Digitalizar um talão de compra",
    courses_scan_receipt_help: "Fotografe ou importe o talão e verifique as compras antes de as guardar.",
  },
};

test("Scan V3 dispose de ses traductions complètes dans les 7 langues DABO", () => {
  for (const lang of Object.keys(expected) as Lang[]) {
    for (const [key, value] of Object.entries(expected[lang])) {
      assert.equal(translations[lang][key], value, `${lang}.${key}`);
    }
  }
});
