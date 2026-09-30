import assert from "node:assert/strict";
import test from "node:test";

import { parseReceiptText } from "../lib/dabo-scan-v3";

test("PaddleOCR Carrefour: reconstruit article, quantité, prix et total séparés sur plusieurs lignes", () => {
  const parsed = parseReceiptText(`
Carrefour
Carrefour Hyper St Agatha Berchem
29-09-2026 13:10
Ticket de caisse
Description
Qté. P.pc/kg Montant
EUR
EUR
*** ALIMENTAIRE ***
SCHW.GRAPEFR.33CL
1
1,12
1,12
*** S/Total ALIMENTAIRE ***
1,12
Total
1,12
1 Article
Carte Bancaire / Crédit
1,12
  `);

  assert.equal(parsed.purchaseDate, "2026-09-29");
  assert.equal(parsed.totalAmount, 1.12);

  const item = parsed.items.find((candidate) =>
    candidate.label.includes("SCHW.GRAPEFR.33CL"),
  );

  assert.ok(item);
  assert.equal(item.quantity, 1);
  assert.equal(item.unitPrice, 1.12);
  assert.equal(item.totalPrice, 1.12);
});

test("PaddleOCR Lidl: associe descriptions et prix séparés et récupère A payer", () => {
  const parsed = parseReceiptText(`
L&DL
Molenbeek.2
Description
€
SALAMI AUX NOI/SALAMI MET WAL
2,99 B
REDUCTION 20%
-0,60
TIKO CAROTTES/TIKO WORTELEN
1,25 B
MSC FISH'STICK/MSC VISSTICKS
1,69 B
FROM. FONOU CH/SMELTKAAS. CHED
1,69 B
SALAMI DE CAMP/BOERENSALAMI
1,29 B
SAUCISSON-LYON/BIERWORST-LYON
1,19 B
CARRE BLANC CO/WIT-BROOD VIER
0,89 B
BELLONA GAUFRE/BELLONA WAFEL
1,69 B
CHAMPIGNONS 1 /CHAMPIGNONS KE
1,19 B
BIO CONCOMBRE/BIO
1,35 x
1
2,70 B
Total
11art.
15,97
Arrondi
-0,02
A payer
15,95
Comptant
15,95
29.09.26
  `);

  assert.equal(parsed.totalAmount, 15.95);

  assert.ok(
    parsed.items.some(
      (item) =>
        item.label.includes("SALAMI AUX NOI") && item.totalPrice === 2.99,
    ),
  );

  assert.ok(
    parsed.items.some(
      (item) =>
        item.label.includes("TIKO CAROTTES") && item.totalPrice === 1.25,
    ),
  );

  assert.ok(
    parsed.discounts.some((discount) => discount.amount === -0.6),
  );

  assert.equal(parsed.purchaseDate, "2026-09-29");

  assert.ok(
    parsed.discounts.some(
      (discount) =>
        discount.label.toLowerCase().includes("arrondi") &&
        discount.amount === -0.02,
    ),
  );

  const cucumber = parsed.items.find((item) =>
    item.label.includes("BIO CONCOMBRE/BIO"),
  );

  assert.ok(cucumber);
  assert.equal(cucumber.unitPrice, 1.35);
  assert.equal(cucumber.totalPrice, 2.70);
});

test("PaddleOCR Action: reconstruit trois articles et le total TTC", () => {
  const parsed = parseReceiptText(`
/ACTION
2408 Sint-Jan-Molenbeek III
26-09-2026 16:53:10
ARTICLES
EUR
2511736
actin sac à comm.
0,59
3222483
fm siring p&m micro dent
4,95
3224477
popcorn serviettes bain
12,95
TOTAL TTC
18,49
NOMBRE D'ARTICLES: 3
  `);

  assert.equal(parsed.purchaseDate, "2026-09-26");
  assert.equal(parsed.totalAmount, 18.49);

  assert.ok(
    parsed.items.some(
      (item) =>
        item.label.includes("actin sac à comm") && item.totalPrice === 0.59,
    ),
  );

  assert.ok(
    parsed.items.some(
      (item) =>
        item.label.includes("fm siring p&m micro dent") &&
        item.totalPrice === 4.95,
    ),
  );

  assert.ok(
    parsed.items.some(
      (item) =>
        item.label.includes("popcorn serviettes bain") &&
        item.totalPrice === 12.95,
    ),
  );
});

test("PaddleOCR Brico: comprend quantité, prix unitaire et total malgré le code-barres", () => {
  const parsed = parseReceiptText(`
Brico
VERKOOP
2026-sep-29 12:58
Artikel
Prijs
Totaal
1
5400107465262
3,49
3,49
25 GLIJDERS WIT AVR4
25 GLISSEURS BLANC A
TOTAAL
3,49
Mastercard
3,49
AANTAL ARTIKELEN: 1
  `);

  assert.equal(parsed.totalAmount, 3.49);

  const item = parsed.items.find(
    (candidate) =>
      candidate.label.includes("25 GLIJDERS") ||
      candidate.label.includes("25 GLISSEURS"),
  );

  assert.ok(item);
  assert.equal(item.quantity, 1);
  assert.equal(item.unitPrice, 3.49);
  assert.equal(item.totalPrice, 3.49);
});

test("PaddleOCR RATP paiement: conserve date et montant sans inventer d'article", () => {
  const parsed = parseReceiptText([
    "CARTE BANCAIRE SANS CONTACT",
    "DEBIT MASTERCARD",
    "le 11/09/26 a 14:55:53",
    "RATP",
    "75 PARIS",
    "MONTANT",
    "12,20 EUR",
    "DEBIT",
    "TICKET CLIENT A CONSERVER",
    "Merci, au revoir.",
  ].join("\n"));

  assert.equal(parsed.purchaseDate, "2026-09-11");
  assert.equal(parsed.totalAmount, 12.20);
  assert.equal(parsed.items.length, 0);
});

test("PaddleOCR RATP achat: reconstruit les deux achats et le total TTC", () => {
  const parsed = parseReceiptText([
    "RATP",
    "RECU D'ACHAT",
    "Edité le 11/09/2026 à 14:56:03",
    "ACHAT",
    "1 Passe Easy Souple",
    "2,00€",
    "4 Métro-Train-RER",
    "Z1-5",
    "10,20€",
    "Montant total HT",
    "11,09€",
    "TVA : 10,00%",
    "0,93€",
    "Montant total TTC",
    "12,20€",
    "CONTENU DES PASSES",
  ].join("\n"));

  assert.equal(parsed.purchaseDate, "2026-09-11");
  assert.equal(parsed.totalAmount, 12.20);
  assert.equal(parsed.items.length, 2);

  const pass = parsed.items.find((item) =>
    item.label.includes("Passe Easy Souple"),
  );
  assert.ok(pass);
  assert.equal(pass.quantity, 1);
  assert.equal(pass.totalPrice, 2.00);

  const journeys = parsed.items.find((item) =>
    item.label.includes("Métro-Train-RER"),
  );
  assert.ok(journeys);
  assert.equal(journeys.quantity, 4);
  assert.equal(journeys.totalPrice, 10.20);
});

test("PaddleOCR hôpital paiement: extrait date et montant sans inventer d'article", () => {
  const parsed = parseReceiptText([
    "TICKET CLIENT",
    "Date: 15/09/2026 13:47",
    "PAIEMENT",
    "Total:",
    "WORLDLINE.",
    "Méthode de lecture: PUCE",
    "Sans contact",
    "DEBIT MASTERCARD",
    "HOPITAUX",
    "Transaction:",
    "ANDERLECHT",
    "AU REVOIR",
    "Commercant:",
    "MERCI",
    "IRIS",
    "3,00 EUR",
  ].join("\n"));

  assert.equal(parsed.purchaseDate, "2026-09-15");
  assert.equal(parsed.totalAmount, 3.00);
  assert.equal(parsed.items.length, 0);
});

test("PaddleOCR Delhaize: reconstruit deux articles identiques sans confondre paiement et fidélité avec des achats", () => {
  const parsed = parseReceiptText([
    "Delhaize Karreveld",
    "Rue de Rudder 32",
    "1080 Bruxelles",
    "28/09/26 14:14",
    "DLL OEUFS 12PC",
    "2,59",
    "DLL. OEUFS 12PC",
    "2,59",
    "TOTA(A)L",
    "5,18",
    "TOTA(A)L",
    "5,18",
    "TICKET CLIENT",
    "DELHAIZE KARREVELD",
    "PAIEMENT",
    "28/09/2026 14:14",
    "WORLDLINE.",
    "5,18 EUR",
    "Total:",
    "Sans contact",
    "Methode de lecture: PUCE",
    "5,18",
    "BANCONTACT",
    "0,00",
    "RENDU/TERUG CASH",
    "ANCIEN SOLDE DE POINTS",
    "2 POINTS SUR MONTANT DES ACHATS",
    "2",
    "242 TOTAL POINTS TICKET",
    "NOUVEAU SOLDE DE POINTS",
  ].join("\n"));

  assert.equal(parsed.purchaseDate, "2026-09-28");
  assert.equal(parsed.totalAmount, 5.18);
  assert.equal(parsed.items.length, 2);

  assert.equal(parsed.items[0].totalPrice, 2.59);
  assert.equal(parsed.items[1].totalPrice, 2.59);

  assert.ok(parsed.items[0].label.includes("OEUFS 12PC"));
  assert.ok(parsed.items[1].label.includes("OEUFS 12PC"));
});

test("PaddleOCR Delhaize complexe: reconstruit trois achats quand les prix precedent les descriptions", () => {
  const parsed = parseReceiptText([
    "Delhaize Karreveld",
    "Rue de Rudder 32",
    "1080 Bruxelles",
    "26/09/26 13:53",
    "PT",
    "18,99",
    "24X33CL MAES PILS",
    "4,50",
    "VIDANGE/LEEGGOED",
    "4,99",
    "75 FILIPETI ASTI D",
    "28,48",
    "TOTA(A)L",
    "TICKET CLIENT",
    "DELHAIZE KARREVELD",
    "PAIEMENT",
    "26/09/2026 13:54",
    "DEBIT",
    "MASTERCARD",
    "28,48 EUR",
    "WORLDLINE.",
    "Total:",
    "Sans contact",
    "Methode de lecture: PUCE",
    "28,48",
    "CARTE CREDIT",
    "0,00",
    "RENDU/TERUG",
    "ANCIEN SOLDE DE POINTS",
    "11 POINTS SUR MONTANT DES ACHATS",
    "240 TOTAL POINTS TICKET",
    "NOUVEAU SOLDE DE POINTS",
  ].join("\n"));

  assert.equal(parsed.purchaseDate, "2026-09-26");
  assert.equal(parsed.totalAmount, 28.48);
  assert.equal(parsed.items.length, 3);
  assert.deepEqual(
    parsed.items.map((item) => item.totalPrice),
    [18.99, 4.5, 4.99],
  );
});

