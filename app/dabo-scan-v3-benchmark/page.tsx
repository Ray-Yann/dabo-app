"use client";

import { useRef, useState } from "react";
import { PaddleOCR } from "@paddleocr/paddleocr-js";
import DaboScanV3Review from "@/components/DaboScanV3Review";
import { buildReceiptReviewFromOcr } from "@/lib/dabo-scan-v3-pipeline";
import type { ReceiptReview } from "@/lib/dabo-scan-v3-review";

type BenchmarkResult = {
  fileName: string;
  text: string;
  items: Array<{
    text: string;
    score: number;
    poly: Array<[number, number]>;
  }>;
  confidence: number | null;
  elapsedMs: number;
  detMs: number;
  recMs: number;
  detectedBoxes: number;
  recognizedCount: number;
  backend: string;
  review?: ReceiptReview;
  error?: string;
};

export default function DaboScanV3BenchmarkPage() {
  const ocrRef = useRef<Awaited<ReturnType<typeof PaddleOCR.create>> | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Prêt");
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [error, setError] = useState("");

  async function getOcr() {
    if (!ocrRef.current) {
      setStatus("Initialisation de PaddleOCR PP-OCRv6…");
      ocrRef.current = await PaddleOCR.create({
        lang: "fr",
        ocrVersion: "PP-OCRv6",
      });
    }

    return ocrRef.current;
  }

  async function recognizeFile(
    ocr: Awaited<ReturnType<typeof PaddleOCR.create>>,
    file: File,
  ): Promise<BenchmarkResult> {
    const startedAt = performance.now();

    try {
      const predictions = await ocr.predict(file);
      const elapsedMs = performance.now() - startedAt;
      const first = predictions[0];

      if (!first) {
        throw new Error("PaddleOCR n'a retourné aucun résultat.");
      }

      const items = first.items ?? [];
      const confidence =
        items.length > 0
          ? items.reduce((sum, item) => sum + item.score, 0) / items.length
          : null;

      const rawText = items.map((item) => item.text).join("\n");
      const geometryItems = items.map((item) => ({
        text: item.text,
        score: item.score,
        poly: item.poly,
      }));

      const review = buildReceiptReviewFromOcr({
        source: "photo",
        rawText: rawText,
        items: geometryItems,
      });

      return {
        fileName: file.name,
        text: rawText,
        items: geometryItems,
        confidence,
        review,
        elapsedMs,
        detMs: first.metrics.detMs,
        recMs: first.metrics.recMs,
        detectedBoxes: first.metrics.detectedBoxes,
        recognizedCount: first.metrics.recognizedCount,
        backend: first.runtime.recProvider,
      };
    } catch (cause) {
      return {
        fileName: file.name,
        text: "",
        items: [],
        confidence: null,
        elapsedMs: performance.now() - startedAt,
        detMs: 0,
        recMs: 0,
        detectedBoxes: 0,
        recognizedCount: 0,
        backend: "",
        error: cause instanceof Error ? cause.message : String(cause),
      };
    }
  }

  async function runBenchmark(files: File[]) {
    setRunning(true);
    setError("");
    setResults([]);

    try {
      const ocr = await getOcr();
      const nextResults: BenchmarkResult[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];

        setStatus(
          `Analyse ${index + 1}/${files.length} — ${file.name}`,
        );

        const result = await recognizeFile(ocr, file);
        nextResults.push(result);
        setResults([...nextResults]);
      }

      setStatus(
        `Terminé — ${nextResults.length} ticket${nextResults.length > 1 ? "s" : ""} analysé${nextResults.length > 1 ? "s" : ""}`,
      );
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("Échec");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: "40px auto", padding: 24 }}>
      <h1>DABO Scan V3 — Benchmark PaddleOCR</h1>

      <p>
        Benchmark local uniquement. Les tickets sélectionnés ne sont pas
        enregistrés par cette page.
      </p>

      <input
        type="file"
        accept="image/*"
        multiple
        disabled={running}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) void runBenchmark(files);
        }}
      />

      <p>
        <strong>État :</strong> {status}
      </p>

      {error ? <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre> : null}

      {results.length > 0 ? (
        <>
          <h2>Résultats</h2>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: 32,
              }}
            >
              <thead>
                <tr>
                  <th align="left">Fichier</th>
                  <th align="right">Temps</th>
                  <th align="right">Confiance</th>
                  <th align="right">Zones</th>
                  <th align="right">Reconnues</th>
                  <th align="left">Backend</th>
                  <th align="left">État</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.fileName}>
                    <td>{result.fileName}</td>
                    <td align="right">{Math.round(result.elapsedMs)} ms</td>
                    <td align="right">
                      {result.confidence === null
                        ? "—"
                        : `${Math.round(result.confidence * 10000) / 100}%`}
                    </td>
                    <td align="right">{result.detectedBoxes}</td>
                    <td align="right">{result.recognizedCount}</td>
                    <td>{result.backend || "—"}</td>
                    <td>{result.error ? "Échec" : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {results.map((result) => (
            <section
              key={`${result.fileName}-details`}
              style={{ marginBottom: 40 }}
            >
              <h2>{result.fileName}</h2>

              {result.error ? (
                <pre style={{ whiteSpace: "pre-wrap" }}>{result.error}</pre>
              ) : (
                <>
                  <pre style={{ whiteSpace: "pre-wrap" }}>
{JSON.stringify(
  {
    elapsedMs: Math.round(result.elapsedMs),
    confidence:
      result.confidence === null
        ? null
        : Math.round(result.confidence * 10000) / 100,
    detMs: Math.round(result.detMs),
    recMs: Math.round(result.recMs),
    detectedBoxes: result.detectedBoxes,
    recognizedCount: result.recognizedCount,
    backend: result.backend,
  },
  null,
  2,
)}
                  </pre>

                  {result.review ? (
                    <>
                      <h3>Vérification humaine Scan V3</h3>
                      <DaboScanV3Review
                        initialReview={result.review}
                        onConfirm={(confirmedReview) => {
                          setResults((currentResults) =>
                            currentResults.map((currentResult) =>
                              currentResult.fileName === result.fileName
                                ? {
                                    ...currentResult,
                                    review: confirmedReview,
                                  }
                                : currentResult,
                            ),
                          );
                          setStatus(
                            `Ticket vérifié dans le benchmark — aucune donnée enregistrée — ${result.fileName}`,
                          );
                        }}
                      />
                    </>
                  ) : null}

                  <h3>Texte OCR</h3>
                  <pre style={{ whiteSpace: "pre-wrap" }}>{result.text}</pre>

                  <h3>Zones OCR + géométrie</h3>

                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        JSON.stringify(
                          {
                            fileName: result.fileName,
                            elapsedMs: Math.round(result.elapsedMs),
                            confidence:
                              result.confidence === null
                                ? null
                                : Math.round(result.confidence * 10000) / 100,
                            detectedBoxes: result.detectedBoxes,
                            recognizedCount: result.recognizedCount,
                            backend: result.backend,
                            text: result.text,
                            items: result.items,
                          },
                          null,
                          2,
                        ),
                      );
                    }}
                    style={{ marginBottom: 12 }}
                  >
                    Copier OCR + géométrie
                  </button>

                  <pre style={{ whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(result.items, null, 2)}
                  </pre>
                </>
              )}
            </section>
          ))}
        </>
      ) : null}
    </main>
  );
}
