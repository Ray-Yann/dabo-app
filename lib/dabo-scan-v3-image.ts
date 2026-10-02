export const MAX_OCR_IMAGE_DIMENSION = 1600;
const OCR_JPEG_QUALITY = 0.9;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Impossible de préparer l'image pour l'OCR."));
        }
      },
      type,
      quality,
    );
  });
}

async function loadImageWithElement(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("Impossible de lire l'image du ticket."));
      image.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareReceiptImageForOcr(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  let source: CanvasImageSource;
  let width: number;
  let height: number;
  let bitmap: ImageBitmap | null = null;

  if (typeof createImageBitmap === "function") {
    bitmap = await createImageBitmap(file);
    source = bitmap;
    width = bitmap.width;
    height = bitmap.height;
  } else {
    const image = await loadImageWithElement(file);
    source = image;
    width = image.naturalWidth;
    height = image.naturalHeight;
  }

  try {
    if (!width || !height) {
      throw new Error("Dimensions de l'image du ticket invalides.");
    }

    const scale = Math.min(
      1,
      MAX_OCR_IMAGE_DIMENSION / Math.max(width, height),
    );

    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", {
      alpha: false,
    });

    if (!context) {
      throw new Error("Impossible de préparer l'image pour l'OCR.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, targetWidth, targetHeight);

    const blob = await canvasToBlob(
      canvas,
      "image/jpeg",
      OCR_JPEG_QUALITY,
    );

    const baseName = file.name.replace(/\.[^.]+$/, "") || "ticket";

    return new File([blob], `${baseName}-ocr.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } finally {
    bitmap?.close();
  }
}
