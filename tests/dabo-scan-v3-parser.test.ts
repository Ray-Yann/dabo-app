import test from "node:test";
import assert from "node:assert/strict";
import { parseReceiptText, validateReceiptConsistency } from "@/lib/dabo-scan-v3";

test("Scan V3 comprend un article simple avec son prix", () => {
  const x = parseReceiptText("LAIT DEMI ECREME 1,89\nTOTAL 1,89");

  assert.equal(x.items[0].label, "LAIT DEMI ECREME");
  assert.equal(x.items[0].quantity, 1);
  assert.equal(x.items[0].totalPrice, 1.89);
  assert.equal(x.totalAmount, 1.89);
});

test("Scan V3 comprend plusieurs unités d'un même article", () => {
  const x = parseReceiptText("COCA COLA 2 x 2,35 4,70\nTOTAL 4,70");

  assert.equal(x.items[0].label, "COCA COLA");
  assert.equal(x.items[0].quantity, 2);
  assert.equal(x.items[0].unitPrice, 2.35);
  assert.equal(x.items[0].totalPrice, 4.7);
});

test("Scan V3 comprend un produit vendu au poids", () => {
  const x = parseReceiptText("BANANES 0,842 kg x 1,99 1,68\nTOTAL 1,68");

  assert.equal(x.items[0].label, "BANANES");
  assert.equal(x.items[0].quantity, 0.842);
  assert.equal(x.items[0].unit, "kg");
  assert.equal(x.items[0].unitPrice, 1.99);
  assert.equal(x.items[0].totalPrice, 1.68);
});

test("Scan V3 distingue une remise d'un nouvel article", () => {
  const x = parseReceiptText(
    "COCA COLA 2 x 2,35 4,70\nPROMO COCA COLA -1,00\nTOTAL 3,70",
  );

  assert.equal(x.items.length, 1);
  assert.equal(x.items[0].label, "COCA COLA");
  assert.equal(x.items[0].totalPrice, 4.7);
  assert.equal(x.discounts.length, 1);
  assert.equal(x.discounts[0].amount, -1);
  assert.equal(x.totalAmount, 3.7);
});

test("Scan V3 intègre les remises dans la vérification mathématique du ticket", () => {
  const receipt = parseReceiptText(
    "COCA COLA 2 x 2,35 4,70\nPROMO COCA COLA -1,00\nTOTAL 3,70",
  );

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.itemsTotal, 4.7);
  assert.equal(consistency.adjustmentsTotal, -1);
  assert.equal(consistency.calculatedTotal, 3.7);
  assert.equal(consistency.difference, 0);
  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.needsReview, false);
});


test("Scan V3 ne transforme pas sous-total et TVA en articles", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nLAIT DEMI ECREME 1,89\nPAIN COMPLET 2,50\nSOUS-TOTAL 4,39\nTVA 6% 0,26\nTOTAL 4,39",
  );

  assert.equal(receipt.items.length, 2);
  assert.deepEqual(
    receipt.items.map((item) => item.label),
    ["LAIT DEMI ECREME", "PAIN COMPLET"],
  );
  assert.equal(receipt.totalAmount, 4.39);
});

test("Scan V3 reconstruit un article dont le nom est réparti sur deux lignes", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nYAOURT GREC\nNATURE 4X125G 3,49\nTOTAL 3,49",
  );

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "YAOURT GREC NATURE 4X125G");
  assert.equal(receipt.items[0].quantity, 1);
  assert.equal(receipt.items[0].totalPrice, 3.49);
});

test("Scan V3 tolère une confusion OCR O/0 dans un montant sans modifier le nom de l'article", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nCOCA COLA 2,5O\nPAIN 1,89\nTOTAL 4,39",
  );

  assert.equal(receipt.items.length, 2);
  assert.equal(receipt.items[0].label, "COCA COLA");
  assert.equal(receipt.items[0].totalPrice, 2.5);
  assert.equal(receipt.items[1].label, "PAIN");
  assert.equal(receipt.items[1].totalPrice, 1.89);
  assert.equal(receipt.totalAmount, 4.39);
});

test("Scan V3 distingue quantité, prix unitaire et total quand une ligne contient plusieurs montants", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nEAU MINERALE 6 0,75 4,50\nTOTAL 4,50",
  );

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "EAU MINERALE");
  assert.equal(receipt.items[0].quantity, 6);
  assert.equal(receipt.items[0].unit, "piece");
  assert.equal(receipt.items[0].unitPrice, 0.75);
  assert.equal(receipt.items[0].totalPrice, 4.5);
  assert.equal(receipt.totalAmount, 4.5);
});

test("Scan V3 ne transforme pas les lignes de paiement en articles", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nLAIT 1,89\nPAIN 2,50\nTOTAL 4,39\nBANCONTACT 4,39\nCARTE 4,39",
  );

  assert.equal(receipt.items.length, 2);
  assert.deepEqual(
    receipt.items.map((item) => item.label),
    ["LAIT", "PAIN"],
  );
  assert.equal(receipt.totalAmount, 4.39);
});

test("Scan V3 extrait le magasin et la date d'achat d'un ticket européen", () => {
  const receipt = parseReceiptText(
    "DELHAIZE FLAGEY\n29/09/2026 18:42\nLAIT 1,89\nPAIN 2,50\nTOTAL 4,39",
  );

  assert.equal(receipt.merchant, "DELHAIZE FLAGEY");
  assert.equal(receipt.purchaseDate, "2026-09-29");
  assert.equal(receipt.items.length, 2);
  assert.equal(receipt.totalAmount, 4.39);
});

test("Scan V3 refuse une date calendaire invalide au lieu de l'inventer", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\n31/02/2026 18:42\nLAIT 1,89\nTOTAL 1,89",
  );

  assert.equal(receipt.merchant, "DELHAIZE");
  assert.equal(receipt.purchaseDate, null);
  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "LAIT");
  assert.equal(receipt.totalAmount, 1.89);
});

test("Scan V3 traite une ligne négative de fidélité comme un ajustement et non comme un article", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nCOCA COLA 4,70\nBON FIDELITE -1,00\nTOTAL 3,70",
  );

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "COCA COLA");
  assert.equal(receipt.discounts.length, 1);
  assert.equal(receipt.discounts[0].label, "BON FIDELITE");
  assert.equal(receipt.discounts[0].amount, -1);
  assert.equal(receipt.totalAmount, 3.7);

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.calculatedTotal, 3.7);
  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.needsReview, false);
});

test("Scan V3 comprend une date européenne OCR avec une année sur deux chiffres", () => {
  const parsed = parseReceiptText([
    "LIDL",
    "29.09.26",
    "PAIN",
    "1,99",
    "Total",
    "1,99",
  ].join("\n"));

  assert.equal(parsed.purchaseDate, "2026-09-29");
});


test("Scan V3 traite un arrondi OCR séparé sur deux lignes comme un ajustement", () => {
  const receipt = parseReceiptText([
    "LIDL",
    "PAIN",
    "15,97",
    "Arrondi",
    "-0,02",
    "A payer",
    "15,95",
  ].join("\n"));

  assert.equal(receipt.totalAmount, 15.95);
  assert.equal(receipt.discounts.length, 1);
  assert.equal(receipt.discounts[0].label, "Arrondi");
  assert.equal(receipt.discounts[0].amount, -0.02);

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.calculatedTotal, 15.95);
  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.needsReview, false);
});

test("Scan V3 reconstruit une quantité OCR quand prix unitaire, quantité et total sont sur trois lignes", () => {
  const receipt = parseReceiptText([
    "LIDL",
    "BIO CONCOMBRE/BIO",
    "1,35 x",
    "2",
    "2,70 B",
    "Total",
    "2,70",
  ].join("\n"));

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "BIO CONCOMBRE/BIO");
  assert.equal(receipt.items[0].quantity, 2);
  assert.equal(receipt.items[0].unit, "piece");
  assert.equal(receipt.items[0].unitPrice, 1.35);
  assert.equal(receipt.items[0].totalPrice, 2.70);

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.needsReview, false);
});

test("Scan V3 comprend une date OCR avec année, mois textuel et jour", () => {
  const receipt = parseReceiptText([
    "Brico",
    "2026-sep-29 12:58",
    "ARTICLE TEST",
    "3,49",
    "TOTAAL",
    "3,49",
  ].join("\n"));

  assert.equal(receipt.purchaseDate, "2026-09-29");
});

test("reconstruit une quantité placée avant une description", () => {
  const parsed = parseReceiptText([
    "RATP",
    "1 Passe Easy Souple",
    "2,00€",
    "TOTAL",
    "2,00€",
  ].join("\n"));

  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].label, "Passe Easy Souple");
  assert.equal(parsed.items[0].quantity, 1);
  assert.equal(parsed.items[0].totalPrice, 2);
});

test("reconstruit une description continuée après une quantité préfixée", () => {
  const parsed = parseReceiptText([
    "RATP",
    "4 Métro-Train-RER",
    "Z1-5",
    "10,20€",
    "TOTAL",
    "10,20€",
  ].join("\n"));

  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].label, "Métro-Train-RER Z1-5");
  assert.equal(parsed.items[0].quantity, 4);
  assert.equal(parsed.items[0].unitPrice, null);
  assert.equal(parsed.items[0].totalPrice, 10.20);
});

test("ignore les montants HT et TVA comme articles mais conserve le total TTC", () => {
  const parsed = parseReceiptText([
    "RATP",
    "1 Passe Easy Souple",
    "2,00€",
    "Montant total HT",
    "1,82€",
    "TVA : 10,00%",
    "0,18€",
    "Montant total TTC",
    "2,00€",
  ].join("\n"));

  assert.equal(parsed.totalAmount, 2);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].label, "Passe Easy Souple");
});

test("Scan V3 retrouve un total OCR séparé de son libellé par plusieurs lignes", () => {
  const parsed = parseReceiptText([
    "HOPITAUX",
    "15/09/2026",
    "PAIEMENT",
    "Total:",
    "WORLDLINE.",
    "Méthode de lecture: PUCE",
    "Sans contact",
    "DEBIT MASTERCARD",
    "3,00 EUR",
  ].join("\n"));

  assert.equal(parsed.purchaseDate, "2026-09-15");
  assert.equal(parsed.totalAmount, 3.00);
  assert.equal(parsed.items.length, 0);
});

test("Scan V3 ne confond pas un en-tête Totaal avec le total final d'un ticket", () => {
  const parsed = parseReceiptText([
    "Brico",
    "VERKOOP",
    "2026-sep-29 12:58",
    "Artikel",
    "Prijs",
    "Totaal",
    "1",
    "5400107465262",
    "3,49",
    "3,49",
    "25 GLIJDERS WIT AVR4",
    "TOTAAL",
    "3,49",
  ].join("\n"));

  const item = parsed.items.find((candidate) =>
    candidate.label.includes("25 GLIJDERS"),
  );

  assert.ok(item);
  assert.equal(item.quantity, 1);
  assert.equal(item.unitPrice, 3.49);
  assert.equal(item.totalPrice, 3.49);
  assert.equal(parsed.totalAmount, 3.49);
});

test("Scan V3 retrouve le montant final d'un reçu de paiement malgré un ordre OCR dispersé", () => {
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

  assert.equal(parsed.totalAmount, 3.00);
  assert.equal(parsed.items.length, 0);
});

test("Scan V3 reconstruit un article quand le prix OCR precede sa description", () => {
  const receipt = parseReceiptText(
    "MAGASIN\n2,59\nOEUFS 12PC\nTOTAL 2,59",
  );

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "OEUFS 12PC");
  assert.equal(receipt.items[0].quantity, 1);
  assert.equal(receipt.items[0].unit, "piece");
  assert.equal(receipt.items[0].unitPrice, 2.59);
  assert.equal(receipt.items[0].totalPrice, 2.59);
  assert.equal(receipt.totalAmount, 2.59);
});

test("Scan V3 ne transforme pas un libelle de paiement sans contact en article", () => {
  const receipt = parseReceiptText(
    "MAGASIN\nARTICLE TEST\n5,18\nTOTAL\n5,18\nPAIEMENT\n5,18 EUR\nSans contact\nMethode de lecture: PUCE\n5,18\nBANCONTACT",
  );

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "ARTICLE TEST");
  assert.equal(receipt.items[0].totalPrice, 5.18);
  assert.equal(receipt.totalAmount, 5.18);
});

test("Scan V3 n'invente pas de prix unitaire quand une quantite prefixee n'a qu'un montant", () => {
  const receipt = parseReceiptText(
    "MAGASIN\n50 PRODUIT TEST\n4,99\nTOTAL 4,99",
  );

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "PRODUIT TEST");
  assert.equal(receipt.items[0].quantity, 50);
  assert.equal(receipt.items[0].unitPrice, null);
  assert.equal(receipt.items[0].totalPrice, 4.99);
  assert.equal(receipt.totalAmount, 4.99);
});


test("Scan V3 reconstruit le ticket Lidl reel avec produit au poids et reduction globale", () => {
  const receipt = parseReceiptText([
    "LIDL",
    "Gosselies",
    "OIGNONS 3P ROUGES-ROSE 1,35 B",
    "TOMATES ROMA 2,69 B",
    "NUTELLA 3,39 B",
    "RAISINS FONCES SANS PEPIN 2,19 B",
    "AVOCAT RTE 2,99 B",
    "Réduction -0,20",
    "BOSTO BASMATI RIZ 5,15 B",
    "POIVRON ROUGE 1,87 B",
    "0,568 kg x 3,29 €/kg",
    "OEUFS PLEIN AIR 3,99 B",
    "SUCRE FIN 0,69 B",
    "Nombre 9 art.",
    "A payer 24,11",
    "Réduction de prix total 0,20",
    "01.10.26 12:52",
  ].join("\n"));

  assert.equal(receipt.purchaseDate, "2026-10-01");
  assert.equal(receipt.totalAmount, 24.11);
  assert.equal(receipt.items.length, 9);

  const pepper = receipt.items.find((item) =>
    item.label.includes("POIVRON ROUGE"),
  );

  assert.ok(pepper);
  assert.equal(pepper.quantity, 0.568);
  assert.equal(pepper.unit, "kg");
  assert.equal(pepper.unitPrice, 3.29);
  assert.equal(pepper.totalPrice, 1.87);

  assert.equal(receipt.discounts.length, 1);
  assert.equal(receipt.discounts[0].amount, -0.20);

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.calculatedTotal, 24.11);
  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.needsReview, false);
});

test("Scan V3 reconstruit le ticket McDonalds reel avec remise arrondi et modificateurs gratuits", () => {
  const receipt = parseReceiptText([
    "McDonald's Gosselies",
    "01/10/2026 13:01",
    "1 MM FOF De Luxe 9,30",
    "1 FOF De Luxe 6,90",
    "1 Moyen Frites 0,00",
    "1 Sans sauce 0,00",
    "1 Fanta Moyen McMenu 2,40",
    "-1 Glacon 0,00",
    "1 Sans extra 0,00",
    "SUBTOTAL 9,30",
    "30% Off -2,79",
    "TOTAL before rounding 6,51",
    "ROUNDING -0,01",
    "TOTAL 6,50",
  ].join("\n"));

  assert.equal(receipt.purchaseDate, "2026-10-01");
  assert.equal(receipt.totalAmount, 6.50);

  assert.equal(
    receipt.items.some((item) => item.label.includes("Sans sauce")),
    false,
  );
  assert.equal(
    receipt.items.some((item) => item.label.includes("Glacon")),
    false,
  );
  assert.equal(
    receipt.items.some((item) => item.label.includes("Sans extra")),
    false,
  );

  assert.ok(
    receipt.discounts.some((adjustment) => adjustment.amount === -2.79),
  );
  assert.ok(
    receipt.discounts.some((adjustment) => adjustment.amount === -0.01),
  );

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.calculatedTotal, 6.50);
  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.needsReview, false);
});

test("Scan V3 realigne une sequence OCR alternee quand les prix precedent les descriptions", () => {
  const receipt = parseReceiptText([
    "MAGASIN",
    "EN-TETE",
    "10,00",
    "PRODUIT A",
    "5,00",
    "PRODUIT B",
    "2,50",
    "PRODUIT C",
    "TOTAL 17,50",
  ].join("\n"));

  assert.equal(receipt.totalAmount, 17.5);
  assert.equal(receipt.items.length, 3);
  assert.deepEqual(
    receipt.items.map((item) => ({
      label: item.label,
      totalPrice: item.totalPrice,
    })),
    [
      { label: "PRODUIT A", totalPrice: 10 },
      { label: "PRODUIT B", totalPrice: 5 },
      { label: "PRODUIT C", totalPrice: 2.5 },
    ],
  );
});

