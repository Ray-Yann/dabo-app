"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, FileImage, LoaderCircle, Upload, X } from "lucide-react";
import { PaddleOCR } from "@paddleocr/paddleocr-js";
import { useT } from "@/lib/language-context";
import DaboScanV3Review from "@/components/DaboScanV3Review";
import { createScanV3ConfirmationController } from "@/lib/dabo-scan-v3-controller";
import {
  buildReceiptReviewFromOcr,
  buildReceiptReviewFromOcrPages,
} from "@/lib/dabo-scan-v3-pipeline";
import { renderReceiptPdfPages } from "@/lib/dabo-scan-v3-pdf";
import { prepareReceiptImageForOcr } from "@/lib/dabo-scan-v3-image";
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
  const t = useT();
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

    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);

    if (!file.type.startsWith("image/") && !isPdf) {
      setError(t("scan_v3_file_type_error"));
      return;
    }

    setBusy(true);
    setError("");
    setSaved(false);
    setReview(null);
    resetConfirmationController();

    try {
      if (isPdf) {
        const ocr = await getOcr();
        const pageFiles = await renderReceiptPdfPages(file);
        const pages = [];

        for (const pageFile of pageFiles) {
          const predictions = await ocr.predict(pageFile);
          const first = predictions[0];

          if (!first) {
            continue;
          }

          const items = first.items ?? [];

          pages.push({
            rawText: items.map((item) => item.text).join("\n"),
            items: items.map((item) => ({
              text: item.text,
              score: item.score,
              poly: item.poly,
            })),
          });
        }

        if (
          pages.length === 0 ||
          pages.every((page) => page.rawText.trim().length === 0)
        ) {
          throw new Error(t("scan_v3_ocr_empty_error"));
        }

        const nextReview = buildReceiptReviewFromOcrPages({
          source: isPdf ? "digital_document" : "photo",
          pages,
        });

        setReview(nextReview);
      } else {
        const ocrImageFile = await prepareReceiptImageForOcr(file);
        const ocr = await getOcr();
        const predictions = await ocr.predict(ocrImageFile);
        const first = predictions[0];

        if (!first) {
          throw new Error(t("scan_v3_ocr_empty_error"));
        }

        const items = first.items ?? [];
        const rawText = items.map((item) => item.text).join("\n");
        const geometryItems = items.map((item) => ({
          text: item.text,
          score: item.score,
          poly: item.poly,
        }));

        const nextReview = buildReceiptReviewFromOcr({
          source: isPdf ? "digital_document" : "photo",
          rawText,
          items: geometryItems,
        });

        setReview(nextReview);
      }
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : t("scan_v3_analyze_error"),
      );
    } finally {
      setBusy(false);
    }
  }

  function getController(): ScanV3Controller {
    if (!shopperId.trim()) {
      throw new Error(t("scan_choose_member"));
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
      setError(t("scan_choose_member"));
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
          : t("scan_v3_save_error"),
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
            {t("courses_scan_receipt")}
          </div>
          <p className="text-sm text-muted mt-1">
            {t("scan_v3_intro")}
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
          accept="image/*,application/pdf"
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
              {t("scan_v3_take_receipt_photo")}
            </button>

            <button
              type="button"
              disabled={busy || saving}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-border py-3 px-4 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              <Upload size={18} />
              {t("scan_v3_import_image_or_pdf")}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {preview ? (
              <img
                src={preview}
                alt={t("scan_v3_preview_alt")}
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
                aria-label={t("scan_v3_remove_receipt")}
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
                {t("scan_v3_analyzing")}
              </>
            ) : (
              t("scan_v3_analyze")
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
                {t("scan_who_shopped")}
              </span>
              <select
                value={shopperId}
                disabled={saving}
                onChange={(event) => changeShopper(event.target.value)}
                className="w-full rounded-lg border border-border bg-white2 px-3 py-2"
              >
                <option value="">{t("scan_choose_member")}</option>
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
                {t("scan_saving")}
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
              {t("scan_v3_saved_title")}
            </div>
            <p className="text-sm text-muted">
              {t("scan_v3_saved_note")}
            </p>
            <button
              type="button"
              onClick={() => choose(null)}
              className="rounded-xl border border-border px-4 py-2 text-sm"
            >
              {t("scan_v3_scan_another")}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
