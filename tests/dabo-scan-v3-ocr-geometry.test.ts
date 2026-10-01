import test from "node:test";
import assert from "node:assert/strict";
import {
  reconstructReceiptLinesFromOcrGeometry,
  type ReceiptOcrGeometryItem,
} from "@/lib/dabo-scan-v3-ocr";
import { parseReceiptText } from "@/lib/dabo-scan-v3";

test("Scan V3 reconstruit une ligne pondérée à partir des colonnes OCR même sans nom de produit", () => {
  const lines = reconstructReceiptLinesFromOcrGeometry([
    { text: "kg", score: 0.99, poly: [[470, 980], [518, 982], [517, 1023], [470, 1021]] },
    { text: "€/kg", score: 0.99, poly: [[599, 976], [677, 981], [674, 1028], [596, 1023]] },
    { text: "€", score: 0.98, poly: [[830, 987], [855, 988], [853, 1024], [828, 1022]] },
    { text: "1,445", score: 0.98, poly: [[411, 1088], [514, 1088], [514, 1124], [411, 1124]] },
    { text: "7,00", score: 0.97, poly: [[588, 1086], [673, 1086], [673, 1127], [588, 1127]] },
    { text: "10.12", score: 0.98, poly: [[760, 1091], [857, 1091], [857, 1127], [760, 1127]] },
  ]);

  assert.ok(
    lines.some((line) =>
      /1,445\s+kg\s+x\s+7,00\s+10\.12/i.test(line),
    ),
  );
});

test("Scan V3 conserve les articles à la pièce sans inventer un nom absent du ticket", () => {
  const lines = reconstructReceiptLinesFromOcrGeometry([
    { text: "kg", score: 0.99, poly: [[470, 980], [518, 982], [517, 1023], [470, 1021]] },
    { text: "€/kg", score: 0.99, poly: [[599, 976], [677, 981], [674, 1028], [596, 1023]] },
    { text: "€", score: 0.98, poly: [[830, 987], [855, 988], [853, 1024], [828, 1022]] },

    { text: "1,445", score: 0.98, poly: [[411, 1088], [514, 1088], [514, 1124], [411, 1124]] },
    { text: "7,00", score: 0.97, poly: [[588, 1086], [673, 1086], [673, 1127], [588, 1127]] },
    { text: "10.12", score: 0.98, poly: [[760, 1091], [857, 1091], [857, 1127], [760, 1127]] },

    { text: "1 st x", score: 0.93, poly: [[385, 1175], [514, 1175], [514, 1210], [385, 1210]] },
    { text: "15,00", score: 0.93, poly: [[570, 1173], [672, 1173], [672, 1212], [570, 1212]] },
    { text: "15,00", score: 0.91, poly: [[757, 1173], [859, 1173], [859, 1212], [757, 1212]] },

    { text: "1 st x", score: 0.95, poly: [[382, 1263], [509, 1265], [509, 1297], [382, 1295]] },
    { text: "19,00", score: 0.94, poly: [[569, 1259], [670, 1259], [670, 1299], [569, 1299]] },
    { text: "19.00", score: 0.90, poly: [[759, 1258], [859, 1258], [859, 1298], [759, 1298]] },

    { text: "1 st x", score: 0.92, poly: [[381, 1354], [508, 1354], [508, 1385], [381, 1385]] },
    { text: "17,50", score: 0.99, poly: [[565, 1346], [670, 1346], [670, 1389], [565, 1389]] },
    { text: "17,50", score: 0.92, poly: [[759, 1345], [860, 1345], [860, 1386], [759, 1386]] },
  ]);

  assert.ok(lines.includes("1 st x 15,00 15,00"));
  assert.ok(lines.includes("1 st x 19,00 19.00"));
  assert.ok(lines.includes("1 st x 17,50 17,50"));

  assert.equal(
    lines.some((line) => /viande|poulet|boeuf|porc|agneau/i.test(line)),
    false,
  );
});

test("Scan V3 transmet une ligne OCR sans libellé au parser sans inventer le produit", async () => {
  const { parseReceiptText, validateReceiptConsistency } = await import("@/lib/dabo-scan-v3");

  const lines = reconstructReceiptLinesFromOcrGeometry([
    { text: "kg", score: 0.99, poly: [[470, 980], [518, 982], [517, 1023], [470, 1021]] },
    { text: "€/kg", score: 0.99, poly: [[599, 976], [677, 981], [674, 1028], [596, 1023]] },
    { text: "€", score: 0.98, poly: [[830, 987], [855, 988], [853, 1024], [828, 1022]] },
    { text: "1,445", score: 0.98, poly: [[411, 1088], [514, 1088], [514, 1124], [411, 1124]] },
    { text: "7,00", score: 0.97, poly: [[588, 1086], [673, 1086], [673, 1127], [588, 1127]] },
    { text: "10.12", score: 0.98, poly: [[760, 1091], [857, 1091], [857, 1127], [760, 1127]] },
  ]);

  const receipt = parseReceiptText([...lines, "TOTAL 10,12"].join("\n"));

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "Article à identifier");
  assert.equal(receipt.items[0].quantity, 1.445);
  assert.equal(receipt.items[0].unit, "kg");
  assert.equal(receipt.items[0].unitPrice, 7);
  assert.equal(receipt.items[0].totalPrice, 10.12);
  assert.equal(receipt.items[0].needsReview, true);
});

test("Scan V3 transmet un article à la pièce sans libellé au parser sans inventer le produit", async () => {
  const { parseReceiptText } = await import("@/lib/dabo-scan-v3");

  const lines = reconstructReceiptLinesFromOcrGeometry([
    { text: "kg", score: 0.99, poly: [[470, 980], [518, 982], [517, 1023], [470, 1021]] },
    { text: "€/kg", score: 0.99, poly: [[599, 976], [677, 981], [674, 1028], [596, 1023]] },
    { text: "€", score: 0.98, poly: [[830, 987], [855, 988], [853, 1024], [828, 1022]] },

    { text: "1 st x", score: 0.93, poly: [[385, 1175], [514, 1175], [514, 1210], [385, 1210]] },
    { text: "15,00", score: 0.93, poly: [[570, 1173], [672, 1173], [672, 1212], [570, 1212]] },
    { text: "15,00", score: 0.91, poly: [[757, 1173], [859, 1173], [859, 1212], [757, 1212]] },
  ]);

  const receipt = parseReceiptText([...lines, "TOTAL 15,00"].join("\n"));

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "Article à identifier");
  assert.equal(receipt.items[0].quantity, 1);
  assert.equal(receipt.items[0].unitPrice, 15);
  assert.equal(receipt.items[0].totalPrice, 15);
  assert.equal(receipt.items[0].needsReview, true);
});

test("Scan V3 rattache les descriptions multilingues placées au-dessus aux colonnes poids prix et total", () => {
  const lines = reconstructReceiptLinesFromOcrGeometry([
    { text: "kg", score: 0.99, poly: [[523, 619], [560, 624], [556, 655], [519, 650]] },
    { text: "€/kg", score: 0.97, poly: [[751, 624], [822, 633], [818, 668], [747, 659]] },

    { text: "Cotis", score: 0.99, poly: [[442, 643], [514, 645], [513, 687], [441, 685]] },
    { text: "Softbones", score: 0.99, poly: [[441, 682], [571, 685], [570, 727], [440, 724]] },
    { text: "3,060", score: 0.99, poly: [[483, 720], [555, 720], [555, 767], [483, 767]] },
    { text: "7,20", score: 0.99, poly: [[755, 731], [813, 731], [813, 776], [755, 776]] },
    { text: "22,03", score: 0.99, poly: [[869, 736], [940, 736], [940, 780], [869, 780]] },

    { text: "Poulet dure", score: 0.99, poly: [[440, 758], [589, 761], [588, 804], [439, 801]] },
    { text: "Kip gerookt", score: 0.99, poly: [[438, 795], [589, 799], [588, 848], [437, 844]] },
    { text: "1,826", score: 0.99, poly: [[485, 837], [555, 837], [555, 881], [485, 881]] },
    { text: "6,00", score: 0.99, poly: [[752, 846], [809, 846], [809, 888], [752, 888]] },
    { text: "10,96", score: 0.99, poly: [[869, 848], [936, 848], [936, 893], [869, 893]] },
  ]);

  assert.ok(lines.includes("Cotis / Softbones 3,060 kg x 7,20 22,03"));
  assert.ok(lines.includes("Poulet dure / Kip gerookt 1,826 kg x 6,00 10,96"));
});


test("Scan V3 transmet les articles pondérés multilingues reconstruits au parser métier", async () => {
  const { parseReceiptText, validateReceiptConsistency } = await import("@/lib/dabo-scan-v3");

  const lines = [
    "Cotis / Softbones 3,060 kg x 7,20 22,03",
    "Poulet dure / Kip gerookt 1,826 kg x 6,00 10,96",
    "TOTAL 32,99",
  ];

  const receipt = parseReceiptText(lines.join("\n"));

  assert.equal(receipt.items.length, 2);

  assert.equal(receipt.items[0].label, "Cotis / Softbones");
  assert.equal(receipt.items[0].quantity, 3.06);
  assert.equal(receipt.items[0].unit, "kg");
  assert.equal(receipt.items[0].unitPrice, 7.2);
  assert.equal(receipt.items[0].totalPrice, 22.03);

  assert.equal(receipt.items[1].label, "Poulet dure / Kip gerookt");
  assert.equal(receipt.items[1].quantity, 1.826);
  assert.equal(receipt.items[1].unit, "kg");
  assert.equal(receipt.items[1].unitPrice, 6);
  assert.equal(receipt.items[1].totalPrice, 10.96);

  assert.equal(receipt.totalAmount, 32.99);
  const consistency = validateReceiptConsistency(receipt);
  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.itemsTotal, 32.99);
  assert.equal(consistency.calculatedTotal, 32.99);
  assert.equal(consistency.difference, 0);
});



test("Scan V3 traite un arrondi positif comme un ajustement du ticket", async () => {
  const { parseReceiptText, validateReceiptConsistency } = await import("@/lib/dabo-scan-v3");

  const receipt = parseReceiptText([
    "Cotis / Softbones 3,060 kg x 7,20 22,03",
    "Poulet dure / Kip gerookt 1,826 kg x 6,00 10,96",
    "Arrondi",
    "0,01",
    "TOTAL 33,00",
  ].join("\n"));

  assert.equal(receipt.items.length, 2);
  assert.equal(receipt.discounts.length, 1);
  assert.equal(receipt.discounts[0].label, "Arrondi");
  assert.equal(receipt.discounts[0].amount, 0.01);
  assert.equal(receipt.totalAmount, 33);

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.itemsTotal, 32.99);
  assert.equal(consistency.adjustmentsTotal, 0.01);
  assert.equal(consistency.calculatedTotal, 33);
  assert.equal(consistency.difference, 0);
  assert.equal(consistency.isConsistent, true);
});


test("Scan V3 conserve sous-total arrondi et total après reconstruction géométrique", async () => {
  const { reconstructReceiptLinesFromOcrGeometry } = await import("@/lib/dabo-scan-v3-ocr");

  const box = (
    text: string,
    score: number,
    x: number,
    y: number,
    width = 60,
    height = 20,
  ) => ({
    text,
    score,
    poly: [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ] as [number, number][],
  });

  const lines = reconstructReceiptLinesFromOcrGeometry([
    box("kg", 0.99, 510, 620, 60),
    box("€/kg", 0.99, 750, 620, 70),

    box("Cotis", 0.99, 440, 655, 80),
    box("Softbones", 0.99, 445, 695, 120),
    box("3,060", 0.99, 490, 735, 70),
    box("7,20", 0.99, 755, 735, 60),
    box("22,03", 0.99, 875, 735, 70),

    box("Poulet dure", 0.99, 440, 775, 130),
    box("Kip gerookt", 0.99, 440, 815, 140),
    box("1,826", 0.99, 490, 855, 70),
    box("6,00", 0.99, 755, 855, 60),
    box("10,96", 0.99, 875, 855, 70),

    box("Soustot", 0.99, 590, 930, 100),
    box("€", 0.99, 710, 930, 20),
    box("32,99", 0.99, 860, 930, 70),

    box("Arrondi", 0.99, 445, 985, 100),
    box("€", 0.99, 710, 985, 20),
    box("0,01", 0.99, 875, 985, 60),

    box("Total", 0.99, 575, 1070, 80),
    box("€", 0.99, 710, 1070, 20),
    box("33,00", 0.99, 860, 1070, 70),
  ]);

  assert.ok(lines.some((line) =>
    /Cotis \/ Softbones 3,060 kg x 7,20 22,03/i.test(line)
  ));

  assert.ok(lines.some((line) =>
    /Poulet dure \/ Kip gerookt 1,826 kg x 6,00 10,96/i.test(line)
  ));

  assert.ok(lines.some((line) =>
    /Soustot.*32,99/i.test(line)
  ));

  assert.ok(lines.some((line) =>
    /Arrondi.*0,01/i.test(line)
  ));

  assert.ok(lines.some((line) =>
    /Total.*33,00/i.test(line)
  ));
});


test("Scan V3 valide de bout en bout un ticket pondéré avec arrondi positif", async () => {
  const { reconstructReceiptLinesFromOcrGeometry } = await import("@/lib/dabo-scan-v3-ocr");
  const { parseReceiptText, validateReceiptConsistency } = await import("@/lib/dabo-scan-v3");

  const box = (
    text: string,
    score: number,
    x: number,
    y: number,
    width = 60,
    height = 20,
  ) => ({
    text,
    score,
    poly: [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ] as [number, number][],
  });

  const reconstructed = reconstructReceiptLinesFromOcrGeometry([
    box("kg", 0.99, 510, 620, 60),
    box("€/kg", 0.99, 750, 620, 70),

    box("Cotis", 0.99, 440, 655, 80),
    box("Softbones", 0.99, 445, 695, 120),
    box("3,060", 0.99, 490, 735, 70),
    box("7,20", 0.99, 755, 735, 60),
    box("22,03", 0.99, 875, 735, 70),

    box("Poulet dure", 0.99, 440, 775, 130),
    box("Kip gerookt", 0.99, 440, 815, 140),
    box("1,826", 0.99, 490, 855, 70),
    box("6,00", 0.99, 755, 855, 60),
    box("10,96", 0.99, 875, 855, 70),

    box("Soustot", 0.99, 590, 930, 100),
    box("€", 0.99, 710, 930, 20),
    box("32,99", 0.99, 860, 930, 70),

    box("Arrondi", 0.99, 445, 985, 100),
    box("€", 0.99, 710, 985, 20),
    box("0,01", 0.99, 875, 985, 60),

    box("Total", 0.99, 575, 1070, 80),
    box("€", 0.99, 710, 1070, 20),
    box("33,00", 0.99, 860, 1070, 70),
  ]);

  const receipt = parseReceiptText(reconstructed.join("\n"));
  const consistency = validateReceiptConsistency(receipt);

  assert.equal(receipt.items.length, 2);

  assert.equal(receipt.items[0].label, "Cotis / Softbones");
  assert.equal(receipt.items[0].quantity, 3.06);
  assert.equal(receipt.items[0].unit, "kg");
  assert.equal(receipt.items[0].unitPrice, 7.2);
  assert.equal(receipt.items[0].totalPrice, 22.03);

  assert.equal(receipt.items[1].label, "Poulet dure / Kip gerookt");
  assert.equal(receipt.items[1].quantity, 1.826);
  assert.equal(receipt.items[1].unit, "kg");
  assert.equal(receipt.items[1].unitPrice, 6);
  assert.equal(receipt.items[1].totalPrice, 10.96);

  assert.equal(receipt.discounts.length, 1);
  assert.equal(receipt.discounts[0].label, "Arrondi");
  assert.equal(receipt.discounts[0].amount, 0.01);

  assert.equal(receipt.totalAmount, 33);

  assert.equal(consistency.itemsTotal, 32.99);
  assert.equal(consistency.adjustmentsTotal, 0.01);
  assert.equal(consistency.calculatedTotal, 33);
  assert.equal(consistency.difference, 0);
  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.needsReview, false);
});


test("Scan V3 traite de bout en bout un ticket sans noms avec arrondi négatif", async () => {
  const { reconstructReceiptLinesFromOcrGeometry } = await import("@/lib/dabo-scan-v3-ocr");
  const { parseReceiptText, validateReceiptConsistency } = await import("@/lib/dabo-scan-v3");

  const reconstructed = reconstructReceiptLinesFromOcrGeometry([
    { text: "kg", score: 0.99, poly: [[470, 980], [518, 982], [517, 1023], [470, 1021]] },
    { text: "€/kg", score: 0.99, poly: [[599, 976], [677, 981], [674, 1028], [596, 1023]] },
    { text: "€", score: 0.98, poly: [[830, 987], [855, 988], [853, 1024], [828, 1022]] },

    { text: "1,445", score: 0.98, poly: [[411, 1088], [514, 1088], [514, 1124], [411, 1124]] },
    { text: "7,00", score: 0.97, poly: [[588, 1086], [673, 1086], [673, 1127], [588, 1127]] },
    { text: "10.12", score: 0.98, poly: [[760, 1091], [857, 1091], [857, 1127], [760, 1127]] },

    { text: "1 st x", score: 0.93, poly: [[385, 1175], [514, 1175], [514, 1210], [385, 1210]] },
    { text: "15,00", score: 0.93, poly: [[570, 1173], [672, 1173], [672, 1212], [570, 1212]] },
    { text: "15,00", score: 0.91, poly: [[757, 1173], [859, 1173], [859, 1212], [757, 1212]] },

    { text: "1 st x", score: 0.95, poly: [[382, 1263], [509, 1265], [509, 1297], [382, 1295]] },
    { text: "19,00", score: 0.94, poly: [[569, 1259], [670, 1259], [670, 1299], [569, 1299]] },
    { text: "19.00", score: 0.90, poly: [[759, 1258], [859, 1258], [859, 1298], [759, 1298]] },

    { text: "1 st x", score: 0.92, poly: [[381, 1354], [508, 1354], [508, 1385], [381, 1385]] },
    { text: "17,50", score: 0.99, poly: [[565, 1346], [670, 1346], [670, 1389], [565, 1389]] },
    { text: "17,50", score: 0.92, poly: [[759, 1345], [860, 1345], [860, 1386], [759, 1386]] },

    { text: "TOTAL (", score: 0.99, poly: [[294, 1446], [508, 1446], [508, 1509], [294, 1509]] },
    { text: "4", score: 0.98, poly: [[504, 1455], [567, 1455], [567, 1506], [504, 1506]] },
    { text: "61,62", score: 0.99, poly: [[745, 1440], [862, 1440], [862, 1501], [745, 1501]] },

    { text: "Arrondi", score: 0.99, poly: [[295, 1507], [438, 1507], [438, 1539], [295, 1539]] },
    { text: "-0.02", score: 0.99, poly: [[759, 1493], [860, 1493], [860, 1533], [759, 1533]] },

    { text: "TOTAL ARRONDI", score: 0.99, poly: [[294, 1593], [683, 1593], [683, 1652], [294, 1652]] },
    { text: "61,60", score: 0.99, poly: [[742, 1579], [857, 1579], [857, 1645], [742, 1645]] },
  ]);

  const receipt = parseReceiptText(reconstructed.join("\n"));
  const consistency = validateReceiptConsistency(receipt);

  assert.equal(receipt.items.length, 4);
  assert.equal(receipt.items.every((item) => item.label === "Article à identifier"), true);
  assert.equal(receipt.items.every((item) => item.needsReview === true), true);

  assert.equal(receipt.items[0].quantity, 1.445);
  assert.equal(receipt.items[0].unit, "kg");
  assert.equal(receipt.items[0].unitPrice, 7);
  assert.equal(receipt.items[0].totalPrice, 10.12);

  assert.deepEqual(
    receipt.items.slice(1).map((item) => [item.quantity, item.unitPrice, item.totalPrice]),
    [
      [1, 15, 15],
      [1, 19, 19],
      [1, 17.5, 17.5],
    ],
  );

  assert.equal(receipt.discounts.length, 1);
  assert.equal(receipt.discounts[0].label, "Arrondi");
  assert.equal(receipt.discounts[0].amount, -0.02);

  assert.equal(receipt.totalAmount, 61.6);
  assert.equal(consistency.itemsTotal, 61.62);
  assert.equal(consistency.adjustmentsTotal, -0.02);
  assert.equal(consistency.calculatedTotal, 61.6);
  assert.equal(consistency.difference, 0);

  assert.equal(consistency.isConsistent, false);
  assert.equal(consistency.needsReview, true);
});


test("Scan V3 ne transforme pas les montants parasites d'un reçu de paiement réel en achats", () => {
  const sanitizedPaymentOcr = [
    "00",
    "19.00",
    "9.00",
    "17.50",
    "TICKET CLIENT",
    "17.50",
    "61,62",
    "-0.02",
    "61,60",
    "Bancontact",
    "ARRONDI",
    "PAIEMENT",
    "Date: 30/09/2026 13:00",
    "WORLDLINE",
    "61,60 EUR",
    "Total:",
    "Sans contact",
    "Methode",
    "de lecture: PUCE",
    "VERIFIE PAR CODE",
    "MERCI",
    "AU REVOIR",
  ].join("\n");

  const receipt = parseReceiptText(sanitizedPaymentOcr);

  assert.equal(receipt.items.length, 0);
  assert.equal(receipt.totalAmount, 61.6);
  assert.equal(receipt.purchaseDate, "2026-09-30");
  assert.equal(receipt.discounts.length, 0);
});


test("Scan V3 retrouve le commerce sur un reçu de paiement malgré du texte parasite au-dessus", () => {
  const receipt = parseReceiptText([
    "TOTAL",
    "Ray. 1",
    "Bedankt en tot",
    "30.09.202",
    "Merci et à bientôt",
    "Cotis",
    "Soft",
    "Copie marchand",
    "ROI DU JAMBON",
    "1070 ANDERLECHT",
    "Bancontact",
    "Sans contact",
    "PAIEMENT",
    "Date:30/09/2026 12:38",
    "Total:",
    "33.00 EUR",
    "Verifie avec PIN",
    "THANK YOU",
  ].join("\n"));

  assert.equal(receipt.merchant, "ROI DU JAMBON");
  assert.equal(receipt.purchaseDate, "2026-09-30");
  assert.equal(receipt.totalAmount, 33);
  assert.equal(receipt.items.length, 0);
  assert.equal(receipt.discounts.length, 0);
});


test("Scan V3 conserve commerce et date quand la géométrie reconstruit les articles", () => {
  const geometry: ReceiptOcrGeometryItem[] = [
    { text: "Maison de la viande", score: 0.99, poly: [[300, 100], [600, 100], [600, 130], [300, 130]] },
    { text: "30/SEP/26", score: 0.99, poly: [[300, 160], [470, 160], [470, 190], [300, 190]] },
    { text: "kg", score: 0.99, poly: [[470, 300], [520, 300], [520, 330], [470, 330]] },
    { text: "€/kg", score: 0.99, poly: [[600, 300], [680, 300], [680, 330], [600, 330]] },
    { text: "1,445", score: 0.99, poly: [[410, 400], [515, 400], [515, 430], [410, 430]] },
    { text: "7,00", score: 0.99, poly: [[590, 400], [675, 400], [675, 430], [590, 430]] },
    { text: "10.12", score: 0.99, poly: [[760, 400], [860, 400], [860, 430], [760, 430]] },
    { text: "TOTAL", score: 0.99, poly: [[300, 500], [500, 500], [500, 530], [300, 530]] },
    { text: "10,12", score: 0.99, poly: [[760, 500], [860, 500], [860, 530], [760, 530]] },
  ];

  const reconstructed = reconstructReceiptLinesFromOcrGeometry(geometry);
  const receipt = parseReceiptText(reconstructed.join("\n"));

  assert.equal(receipt.merchant, "Maison de la viande");
  assert.equal(receipt.purchaseDate, "2026-09-30");
  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "Article à identifier");
  assert.equal(receipt.totalAmount, 10.12);
});
