"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, FileImage, LoaderCircle, Upload, X } from "lucide-react";
import { PaddleOCR } from "@paddleocr/paddleocr-js";
import DaboScanV3Review from "@/components/DaboScanV3Review";
import { createScanV3ConfirmationController } from "@/lib/dabo-scan-v3-controller";
import { buildReceiptReviewFromOcr } from "@/lib/dabo-scan-v3-pipeline";
import type { ReceiptReview } from "@/lib/dabo-scan-v3-review";
import type { Household, Member } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type ScanV3Controller = ReturnType<typeof createScanV3ConfirmationController>;

export function DaboScanView({
  household,
  me,
  members,
  supabase,
  onSaved,
}: {
  household: Household;
  me: Member | null;
  members: Member[];
  supabase: SupabaseClient;
  onSaved?: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ocrRef = useRef<Awaited<ReturnType<typeof PaddleOCR.create>> | null>(null);
  const controllerRef = useRef<ScanV3Controller | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [review, setReview] = useState<ReceiptReview | null>(null);
  const [shopperId, setShopperId] = useState(me?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (me?.id && !shopperId) {
      setShopperId(me.id);
    }
  }, [me?.id, shopperId]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function resetConfirmationController() {
    controllerRef.current = null;
  }

  function choose(next: File | null) {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(next);
    setPreview(
      next && next.type.startsWith("image/")
        ? URL.createObjectURL(next)
        : null,
    );
    setReview(null);
    setError("");
    setSaved(false);
    setSaving(false);
    resetConfirmationController();
  }

  async function getOcr() {
    if (!ocrRef.current) {
      ocrRef.current = await PaddleOCR.create({
        lang: "fr",
        ocrVersion: "PP-OCRv6",
      });
    }

    return ocrRef.current;
  }

  async function analyze() {
    if (!file || busy || saving) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Le Scan V3 accepte actuellement les images de tickets.");
      return;
    }

    setBusy(true);
    setError("");
    setSaved(false);
    setReview(null);
    resetConfirmationController();

    try {
      const ocr = await getOcr();
      const predictions = await ocr.predict(file);
      const first = predictions[0];

      if (!first) {
        throw new Error("PaddleOCR n'a retournÃ© aucun rÃ©sultat.");
      }

      const items = first.items ?? [];
      const rawText = items.map((item) => item.text).join("\n");
      const geometryItems = items.map((item) => ({
        text: item.text,
        score: item.score,
        poly: item.poly,
      }));

      const nextReview = buildReceiptReviewFromOcr({
        source: "photo",
        rawText,
        items: geometryItems,
      });

      setReview(nextReview);
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'analyser ce ticket.",
      );
    } finally {
      setBusy(false);
    }
  }

  function getController(): ScanV3Controller {
    if (!shopperId.trim()) {
      throw new Error("Choisissez la personne qui a effectuÃ© les achats.");
    }

    if (!controllerRef.current) {
      controllerRef.current = createScanV3ConfirmationController({
        supabase,
        householdId: household.id,
        shopperMemberId: shopperId,
        createClientRequestId: () => crypto.randomUUID(),
      });
    }

    return controllerRef.current;
  }

  async function confirmReview(confirmedReview: ReceiptReview) {
    if (saving || saved) {
      return;
    }

    if (!shopperId.trim()) {
      setError("Choisissez la personne qui a effectuÃ© les achats.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const controller = getController();
      await controller.confirm(confirmedReview);
      setSaved(true);
      onSaved?.();
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'enregistrer ce ticket.",
      );
    } finally {
      setSaving(false);
    }
  }

  function changeShopper(nextShopperId: string) {
    if (saving) {
      return;
    }

    setShopperId(nextShopperId);
    setSaved(false);
    setError("");
    resetConfirmationController();
  }

  return (
    <section className="px-5 pb-8">
      <div className="rounded-2xl bg-white2 border border-border p-4 space-y-5">
        <div>
          <div className="text-lg font-semibold text-ink">
            Scanner un ticket
          </div>
          <p className="text-sm text-muted mt-1">
            DABO lit le ticket, puis vous demande de vÃ©rifier les informations
            avant tout enregistrement.
          </p>
        </div>

        <input
          ref={cameraRef}
          className="hidden"
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy || saving}
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />

        <input
          ref={fileRef}
          className="hidden"
          type="file"
          accept="image/*"
          disabled={busy || saving}
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />

        {!file ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy || saving}
              onClick={() => cameraRef.current?.click()}
              className="rounded-xl bg-ink text-paper py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-60"
            >
              <Camera size={18} />
              Photographier le ticket
            </button>

            <button
              type="button"
              disabled={busy || saving}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-border py-3 px-4 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              <Upload size={18} />
              Importer une image
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {preview ? (
              <img
                src={preview}
                alt="Ticket Ã  analyser"
                className="w-full max-h-80 object-contain bg-paper"
              />
            ) : (
              <div className="h-36 flex items-center justify-center bg-paper">
                <FileImage size={36} />
              </div>
            )}

            <div className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted">
                  {Math.max(1, Math.round(file.size / 1024))} Ko
                </div>
              </div>

              <button
                type="button"
                disabled={busy || saving}
                onClick={() => choose(null)}
                className="p-2 rounded-lg hover:bg-paper disabled:opacity-60"
                aria-label="Retirer le ticket"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {file && !review && !saved ? (
          <button
            type="button"
            disabled={busy || saving}
            onClick={() => void analyze()}
            className="w-full rounded-xl bg-ink text-paper py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Analyse du ticketâ€¦
              </>
            ) : (
              "Analyser le ticket"
            )}
          </button>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-xl border border-border bg-paper p-3 text-sm">
            {error}
          </div>
        ) : null}

        {review && !saved ? (
          <div className="space-y-4 border-t border-border pt-4">
            <label className="block text-sm">
              <span className="block font-medium mb-1">
                Qui a effectuÃ© les achats ?
              </span>
              <select
                value={shopperId}
                disabled={saving}
                onChange={(event) => changeShopper(event.target.value)}
                className="w-full rounded-lg border border-border bg-white2 px-3 py-2"
              >
                <option value="">Choisir un membre</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.first_name}
                  </option>
                ))}
              </select>
            </label>

            {saving ? (
              <p role="status" className="text-sm text-muted flex items-center gap-2">
                <LoaderCircle size={16} className="animate-spin" />
                Enregistrement des achatsâ€¦
              </p>
            ) : null}

            <div className={saving ? "pointer-events-none opacity-60" : ""}>
              <DaboScanV3Review
                initialReview={review}
                disabled={saving}
                onConfirm={(nextReview) => {
                  void confirmReview(nextReview);
                }}
              />
            </div>
          </div>
        ) : null}

        {saved ? (
          <div
            role="status"
            className="rounded-xl border border-border bg-paper p-4 space-y-3"
          >
            <div className="flex items-center gap-2 font-medium">
              <Check size={18} />
              Achats enregistrÃ©s
            </div>
            <p className="text-sm text-muted">
              Le ticket a Ã©tÃ© vÃ©rifiÃ© puis enregistrÃ© dans les Courses.
            </p>
            <button
              type="button"
              onClick={() => choose(null)}
              className="rounded-xl border border-border px-4 py-2 text-sm"
            >
              Scanner un autre ticket
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
