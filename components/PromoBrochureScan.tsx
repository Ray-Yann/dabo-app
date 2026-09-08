"use client";

import { useRef, useState } from "react";
import { Camera, Check, LoaderCircle, ScanLine, Trash2, Upload, X } from "lucide-react";
import { extractScan, type ScanExtraction } from "@/lib/dabo-scan";
import { useT } from "@/lib/language-context";
import type { Household, Member } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type TesseractGlobal = { createWorker: (lang: string, oem?: number, options?: { logger?: (m: { progress?: number }) => void }) => Promise<{ recognize: (file: File) => Promise<{ data: { text: string } }>; terminate: () => Promise<void> }> };
declare global { interface Window { Tesseract?: TesseractGlobal } }

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise<void>((resolve, reject) => {
    const old = document.querySelector<HTMLScriptElement>('script[data-dabo-ocr="1"]');
    if (old) { old.addEventListener("load", () => resolve(), { once: true }); old.addEventListener("error", () => reject(new Error("OCR")), { once: true }); return; }
    const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"; script.async = true; script.dataset.daboOcr = "1";
    script.onload = () => resolve(); script.onerror = () => reject(new Error("OCR")); document.head.appendChild(script);
  });
  if (!window.Tesseract) throw new Error("OCR"); return window.Tesseract;
}

export function PromoBrochureScan({ household, me, supabase, onSaved, onClose }: { household: Household; me: Member | null; supabase: SupabaseClient; onSaved: () => void; onClose: () => void }) {
  const t = useT(); const cameraRef = useRef<HTMLInputElement>(null); const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [saving, setSaving] = useState(false); const [progress, setProgress] = useState(0); const [error, setError] = useState(""); const [result, setResult] = useState<ScanExtraction | null>(null);
  async function analyze() { if (!file) return; setBusy(true); setError(""); let worker: Awaited<ReturnType<TesseractGlobal["createWorker"]>> | null = null; try { const Tess = await loadTesseract(); worker = await Tess.createWorker("fra+nld+eng", 1, { logger: (m) => typeof m.progress === "number" && setProgress(Math.round(m.progress * 100)) }); const out = await worker.recognize(file); setResult(extractScan(out.data.text, "promo")); } catch { setError(t("scan_ocr_error")); } finally { if (worker) await worker.terminate().catch(() => undefined); setBusy(false); } }
  async function save() { if (!result || !me) return; const lines = result.lines.filter((l) => l.label.trim()); if (!lines.length) return setError(t("scan_need_item")); setSaving(true); const store = result.merchant.trim() || t("promo_store_to_verify"); const { error: e } = await supabase.from("promos").insert(lines.map((line) => ({ household_id: household.id, author_id: me.id, author_name: me.first_name, product_name: line.label.trim(), store_name: store, note: line.price ? `${line.price} € · ${t("promo_scanned_note")}` : t("promo_scanned_note") }))); setSaving(false); if (e) return setError(t("promos_save_error")); onSaved(); onClose(); }
  return <div className="mx-5 mb-4 rounded-2xl border border-border bg-white2 p-4 space-y-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-ink flex items-center gap-2"><ScanLine size={18}/>{t("promo_scan_brochure")}</div><p className="text-xs text-muted mt-1">{t("promo_scan_intro")}</p></div><button onClick={onClose} className="p-1 text-muted"><X size={18}/></button></div>
    <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }}/><input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }}/>
    {!file ? <div className="grid grid-cols-2 gap-2"><button onClick={() => cameraRef.current?.click()} className="rounded-xl bg-ink text-paper py-2.5 text-sm flex justify-center items-center gap-2"><Camera size={17}/>{t("scan_document")}</button><button onClick={() => fileRef.current?.click()} className="rounded-xl border border-border py-2.5 text-sm flex justify-center items-center gap-2"><Upload size={17}/>{t("scan_import_image")}</button></div> : !result ? <button disabled={busy} onClick={analyze} className="w-full rounded-xl bg-ink text-paper py-3 text-sm flex justify-center items-center gap-2 disabled:opacity-60">{busy ? <><LoaderCircle className="animate-spin" size={17}/>{progress}%</> : t("promo_analyze_brochure")}</button> : <div className="space-y-3"><input value={result.merchant} onChange={(e) => setResult({ ...result, merchant: e.target.value })} placeholder={t("scan_merchant")} className="w-full rounded-lg border border-border bg-white2 px-3 py-2 text-sm"/><div className="space-y-2">{result.lines.map((line, i) => <div key={i} className="grid grid-cols-[1fr_80px_36px] gap-2"><input value={line.label} onChange={(e) => setResult({ ...result, lines: result.lines.map((l, n) => n === i ? { ...l, label: e.target.value } : l) })} className="min-w-0 rounded-lg border border-border px-3 py-2 text-sm"/><input value={line.price || ""} onChange={(e) => setResult({ ...result, lines: result.lines.map((l, n) => n === i ? { ...l, price: e.target.value } : l) })} placeholder="€" className="min-w-0 rounded-lg border border-border px-2 py-2 text-sm"/><button onClick={() => setResult({ ...result, lines: result.lines.filter((_, n) => n !== i) })} className="rounded-lg border border-border flex justify-center items-center text-muted"><Trash2 size={15}/></button></div>)}</div><button disabled={saving} onClick={save} className="w-full rounded-xl bg-ink text-paper py-3 text-sm font-medium flex justify-center items-center gap-2"><Check size={17}/>{saving ? t("scan_saving") : t("promo_publish_detected")}</button><p className="text-xs text-muted">{t("promo_scan_confirmation")}</p></div>}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>;
}
