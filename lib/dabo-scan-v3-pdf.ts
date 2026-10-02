const PDF_RENDER_SCALE = 2;
const MAX_RECEIPT_PDF_PAGES = 10;

export async function renderReceiptPdfPages(file: File): Promise<File[]> {
  if (
    file.type !== "application/pdf" &&
    !file.name.toLocaleLowerCase().endsWith(".pdf")
  ) {
    throw new TypeError("Expected a PDF receipt");
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerUrl = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;

  try {
    if (document.numPages < 1) {
      throw new Error("PDF receipt contains no pages");
    }

    if (document.numPages > MAX_RECEIPT_PDF_PAGES) {
      throw new Error(
        `PDF receipt exceeds the ${MAX_RECEIPT_PDF_PAGES}-page limit`,
      );
    }

    const pages: File[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });

      const canvas = window.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvas,
        viewport,
      }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Unable to render PDF receipt page"));
          }
        }, "image/png");
      });

      pages.push(
        new File(
          [blob],
          `${file.name.replace(/\.pdf$/i, "")}-page-${pageNumber}.png`,
          { type: "image/png" },
        ),
      );

      page.cleanup();
    }

    return pages;
  } finally {
    await loadingTask.destroy();
  }
}
