export type ReceiptOcrGeometryItem = {
  text: string;
  score: number;
  poly: [number, number][];
};

function centerX(item: ReceiptOcrGeometryItem): number {
  return item.poly.reduce((sum, point) => sum + point[0], 0) / item.poly.length;
}

function centerY(item: ReceiptOcrGeometryItem): number {
  return item.poly.reduce((sum, point) => sum + point[1], 0) / item.poly.length;
}

export function reconstructReceiptLinesFromOcrGeometry(
  items: ReceiptOcrGeometryItem[],
): string[] {
  const ordered = [...items].sort((a, b) => {
    const yDifference = centerY(a) - centerY(b);

    if (Math.abs(yDifference) > 20) {
      return yDifference;
    }

    return centerX(a) - centerX(b);
  });

  const kgHeader = ordered.find((item) => /^kg$/i.test(item.text.trim()));
  const unitPriceHeader = ordered.find((item) =>
    /^€\/kg$/i.test(item.text.trim()),
  );
  if (!kgHeader || !unitPriceHeader) {
    return ordered.map((item) => item.text.trim()).filter(Boolean);
  }

  const headerY = centerY(kgHeader);
  const columnTolerance = 90;
  const candidates = ordered.filter(
    (item) => centerY(item) > headerY,
  );

  const weights = candidates.filter(
    (item) =>
      Math.abs(centerX(item) - centerX(kgHeader)) <= columnTolerance &&
      /^\d+(?:[.,]\d+)?$/.test(item.text.trim()),
  );

  const reconstructed: string[] = [];

  const sortedWeights = [...weights].sort(
    (a, b) => centerY(a) - centerY(b),
  );

  for (let weightIndex = 0; weightIndex < sortedWeights.length; weightIndex += 1) {
    const weight = sortedWeights[weightIndex];
    const rowY = centerY(weight);
    const previousWeightY =
      weightIndex > 0 ? centerY(sortedWeights[weightIndex - 1]) : headerY;

    const descriptions = candidates
      .filter((item) => {
        const itemY = centerY(item);
        const itemX = centerX(item);
        const text = item.text.trim();

        return (
          item !== weight &&
          item.score >= 0.5 &&
          itemY > previousWeightY &&
          itemY < rowY - 5 &&
          itemX < centerX(unitPriceHeader) - 100 &&
          itemX >= centerX(kgHeader) - 180 &&
          !/^kg$/i.test(text) &&
          !/^€\/?kg$/i.test(text) &&
          !/^€$/i.test(text) &&
          !/^\d+(?:[.,]\d+)?$/.test(text)
        );
      })
      .sort((a, b) => centerY(a) - centerY(b));

    const unitPrice = candidates.find(
      (item) =>
        Math.abs(centerY(item) - rowY) <= 25 &&
        Math.abs(centerX(item) - centerX(unitPriceHeader)) <= columnTolerance &&
        /^\d+(?:[.,]\d{2})$/.test(item.text.trim()),
    );

    const totalPrice = candidates
      .filter(
        (item) =>
          item !== weight &&
          item !== unitPrice &&
          Math.abs(centerY(item) - rowY) <= 25 &&
          centerX(item) > centerX(unitPriceHeader) + 40 &&
          /^\d+(?:[.,]\d{2})$/.test(item.text.trim()),
      )
      .sort((a, b) => centerX(b) - centerX(a))[0];

    if (unitPrice && totalPrice) {
      const description = descriptions
        .map((item) => item.text.trim())
        .filter(Boolean)
        .join(" / ");

      reconstructed.push(
        description
          ? `${description} ${weight.text.trim()} kg x ${unitPrice.text.trim()} ${totalPrice.text.trim()}`
          : `${weight.text.trim()} kg x ${unitPrice.text.trim()} ${totalPrice.text.trim()}`,
      );
    }
  }

  const pieceMarkers = candidates.filter((item) =>
    /^\d+(?:[.,]\d+)?\s*(?:st|pc|pcs|piece|pieces)?\s*x$/i.test(
      item.text.trim(),
    ),
  );

  for (const marker of pieceMarkers) {
    const rowY = centerY(marker);

    const unitPrice = candidates.find(
      (item) =>
        item !== marker &&
        Math.abs(centerY(item) - rowY) <= 25 &&
        Math.abs(centerX(item) - centerX(unitPriceHeader)) <= columnTolerance &&
        /^\d+(?:[.,]\d{2})$/.test(item.text.trim()),
    );

    const totalPrice = candidates
      .filter(
        (item) =>
          item !== marker &&
          item !== unitPrice &&
          Math.abs(centerY(item) - rowY) <= 25 &&
          centerX(item) > centerX(unitPriceHeader) + 40 &&
          /^\d+(?:[.,]\d{2})$/.test(item.text.trim()),
      )
      .sort((a, b) => centerX(b) - centerX(a))[0];

    if (unitPrice && totalPrice) {
      reconstructed.push(
        `${marker.text.trim()} ${unitPrice.text.trim()} ${totalPrice.text.trim()}`,
      );
    }
  }

  if (reconstructed.length === 0) {
    return ordered.map((item) => item.text.trim()).filter(Boolean);
  }

  const commercialLabelPattern =
    /^(?:SOUS[ -]?TOTAL|SOUSTOT|SUBTOTAL|SUB[ -]?TOTAL|ARRONDI|AFRONDING|ROUNDING|TOTAL|TOTAAL|TOTA\(A\)L|TOTAL ARRONDI)$/i;

  const commercialLines: Array<{ y: number; text: string }> = [];

  for (const label of candidates.filter((item) =>
    commercialLabelPattern.test(item.text.trim()),
  )) {
    const rowY = centerY(label);

    const amount = candidates
      .filter(
        (item) =>
          item !== label &&
          Math.abs(centerY(item) - rowY) <= 25 &&
          centerX(item) > centerX(label) &&
          /^-?\d+(?:[.,]\d{2})$/.test(item.text.trim()),
      )
      .sort((a, b) => centerX(b) - centerX(a))[0];

    if (amount) {
      commercialLines.push({
        y: rowY,
        text: `${label.text.trim()} ${amount.text.trim()}`,
      });
    }
  }

  const metadataLines = ordered
    .filter(
      (item) =>
        centerY(item) < headerY &&
        item !== kgHeader &&
        item !== unitPriceHeader,
    )
    .map((item) => item.text.trim())
    .filter(Boolean);

  return [
    ...metadataLines,
    ...reconstructed,
    ...commercialLines
      .sort((a, b) => a.y - b.y)
      .map((line) => line.text),
  ];
}
