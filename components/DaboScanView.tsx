"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, FileImage, LoaderCircle, Plus, ReceiptText, ShoppingBasket, Trash2, Upload, X } from "lucide-react";
import { useT } from "@/lib/language-context";
import { extractScan, parseMoney, parseScanDate, type ScanExtraction, type ScanKind } from "@/lib/dabo-scan";
import type { Household, Member } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type TesseractGlobal = { createWorker: (lang: string, oem?: number, options?: { logger?: (m: { progress?: number }) => void }) => Promise<{ recognize: (file: File) => Promise<{ data: { text: string } }>; terminate: () => Promise<void> }> };
declare global { interface Window { Tesseract?: TesseractGlobal } }

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise<void>((resolve, reject) => {
    const old = document.querySelector<HTMLScriptElement>('script[data-dabo-ocr="1"]');
    if (old) { if (window.Tesseract) resolve(); else { old.addEventListener("load", () => resolve(), { once: true }); old.addEventListener("error", () => reject(new Error("OCR")), { once: true }); } return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true; script.dataset.daboOcr = "1";
    script.onload = () => resolve(); script.onerror = () => reject(new Error("OCR"));
    document.head.appendChild(script);
  });
  if (!window.Tesseract) throw new Error("OCR");
  return window.Tesseract;
}

export function DaboScanView({ household, me, members, supabase, onSaved }: { household: Household; me: Member | null; members: Member[]; supabase: SupabaseClient; onSaved?: () => void }) {
  const t = useT();
  const cameraRef = useRef<HTMLInputElement>(null); const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Exclude<ScanKind, "promo">>("receipt");
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); const [busy, setBusy] = useState(false); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [result, setResult] = useState<ScanExtraction | null>(null); const [saved, setSaved] = useState(false);
  const [shopperId, setShopperId] = useState(me?.id || "");
  useEffect(() => { if (me?.id && !shopperId) setShopperId(me.id); }, [me?.id, shopperId]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(next: File | null) {
    if (preview) URL.revokeObjectURL(preview); setFile(next); setResult(null); setError(""); setSaved(false); setProgress(0);
    setPreview(next && next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
  }
  async function analyze() {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError(t("scan_pdf_later")); return; }
    setBusy(true); setError(""); setProgress(0); setSaved(false);
    let worker: Awaited<ReturnType<TesseractGlobal["createWorker"]>> | null = null;
    try {
      const Tess = await loadTesseract();
      worker = await Tess.createWorker("fra+nld+eng", 1, { logger: (m) => { if (typeof m.progress === "number") setProgress(Math.round(m.progress * 100)); } });
      const out = await worker.recognize(file); setResult(extractScan(out.data.text, kind));
    } catch { setError(t("scan_ocr_error")); } finally { if (worker) await worker.terminate().catch(() => undefined); setBusy(false); }
  }
  function updateLine(i: number, key: "label" | "price" | "quantity", value: string) { if (!result) return; setResult({ ...result, lines: result.lines.map((x, n) => n === i ? { ...x, [key]: value } : x) }); setSaved(false); }
  function removeLine(i: number) { if (!result) return; setResult({ ...result, lines: result.lines.filter((_, n) => n !== i) }); }
  function addLine() { if (!result) return; setResult({ ...result, lines: [...result.lines, { label: "" }] }); }

  async function save() {
    if (!result || !me) return;
    const lines = result.lines.filter((line) => line.label.trim());
    if (!lines.length) { setError(t("scan_need_item")); return; }
    if (kind === "receipt" && !shopperId) { setError(t("scan_need_shopper")); return; }
    setSaving(true); setError("");
    try {
      if (kind === "list") {
        const { error: insertError } = await supabase.from("shopping_items").insert(lines.map((line) => ({ household_id: household.id, name: line.label.trim(), quantity: line.quantity?.trim() || null, status: "to_buy", urgent: false })));
        if (insertError) throw insertError;
      } else {
        const { data: receipt, error: receiptError } = await supabase.from("shopping_receipts").insert({
          household_id: household.id, created_by_member_id: me.id, shopper_member_id: shopperId,
          merchant: result.merchant.trim() || null, purchase_date: parseScanDate(result.date), total_amount: parseMoney(result.total), raw_text: result.rawText || null,
        }).select("id").single();
        if (receiptError || !receipt) throw receiptError || new Error("receipt");
        const boughtAt = new Date().toISOString();
        const { error: itemError } = await supabase.from("shopping_items").insert(lines.map((line) => ({
          household_id: household.id, name: line.label.trim(), quantity: line.quantity?.trim() || null, status: "bought", bought_at: boughtAt,
          receipt_id: receipt.id, unit_price: parseMoney(line.price), bought_by_member_id: shopperId, urgent: false,
        })));
        if (itemError) { await supabase.from("shopping_receipts").delete().eq("id", receipt.id); throw itemError; }
      }
      setSaved(true); onSaved?.();
    } catch { setError(t("scan_save_error")); } finally { setSaving(false); }
  }

  return <section className="px-5 pb-8"><div className="rounded-2xl bg-white2 border border-border p-4 space-y-5">
    <div><div className="text-lg font-semibold text-ink">{t("scan_heading")}</div><p className="text-sm text-muted mt-1">{t("scan_intro_v21")}</p></div>
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={() => { setKind("receipt"); setResult(null); setSaved(false); }} className={`rounded-xl border p-3 text-left ${kind === "receipt" ? "border-ink bg-paper" : "border-border bg-white2"}`}><ReceiptText size={19} className="mb-2"/><span className="text-sm font-medium">{t("scan_type_receipt")}</span><span className="block text-xs text-muted mt-1">{t("scan_receipt_hint")}</span></button>
      <button type="button" onClick={() => { setKind("list"); setResult(null); setSaved(false); }} className={`rounded-xl border p-3 text-left ${kind === "list" ? "border-ink bg-paper" : "border-border bg-white2"}`}><ShoppingBasket size={19} className="mb-2"/><span className="text-sm font-medium">{t("scan_type_list")}</span><span className="block text-xs text-muted mt-1">{t("scan_list_hint")}</span></button>
    </div>
    <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(e) => choose(e.target.files?.[0] || null)}/>
    <input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={(e) => choose(e.target.files?.[0] || null)}/>
    {!file ? <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => cameraRef.current?.click()} className="rounded-xl bg-ink text-paper py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium"><Camera size={18}/>{t("scan_document")}</button><button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-border py-3 px-4 flex items-center justify-center gap-2 text-sm"><Upload size={18}/>{t("scan_import_image")}</button></div> : <div className="rounded-xl border border-border overflow-hidden">{preview ? <img src={preview} alt="" className="w-full max-h-80 object-contain bg-paper"/> : <div className="h-36 flex items-center justify-center bg-paper"><FileImage size={36}/></div>}<div className="p-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-sm font-medium truncate">{file.name}</div><div className="text-xs text-muted">{Math.max(1, Math.round(file.size / 1024))} Ko</div></div><button type="button" onClick={() => choose(null)} className="p-2 rounded-lg hover:bg-paper" aria-label={t("scan_remove")}><X size={18}/></button></div></div>}
    {file && !result && <button type="button" disabled={busy} onClick={analyze} className="w-full rounded-xl bg-ink text-paper py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">{busy ? <><LoaderCircle size={18} className="animate-spin"/>{t("scan_reading")} {progress}%</> : t("scan_analyze")}</button>}
    {error && <div className="rounded-xl border border-border bg-paper p-3 text-sm">{error}</div>}
    {result && <div className="space-y-4 border-t border-border pt-4">
      <div><div className="font-semibold">{t("scan_understood")}</div><div className="text-xs text-muted">{t("scan_edit_before_confirm")}</div></div>
      {kind === "receipt" && <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><input className="rounded-lg border border-border bg-white2 px-3 py-2 text-sm" value={result.merchant} placeholder={t("scan_merchant")} onChange={(e) => setResult({ ...result, merchant: e.target.value })}/><input className="rounded-lg border border-border bg-white2 px-3 py-2 text-sm" value={result.date} placeholder={t("scan_date")} onChange={(e) => setResult({ ...result, date: e.target.value })}/><input className="rounded-lg border border-border bg-white2 px-3 py-2 text-sm" value={result.total} placeholder={t("scan_total")} onChange={(e) => setResult({ ...result, total: e.target.value })}/></div>}
      <div className="space-y-2">{result.lines.map((line, i) => <div key={i} className={`grid gap-2 ${kind === "receipt" ? "grid-cols-[1fr_78px_36px]" : "grid-cols-[1fr_88px_36px]"}`}><input className="min-w-0 rounded-lg border border-border bg-white2 px-3 py-2 text-sm" value={line.label} placeholder={t("scan_item_name")} onChange={(e) => updateLine(i, "label", e.target.value)}/><input className="min-w-0 rounded-lg border border-border bg-white2 px-2 py-2 text-sm" value={kind === "receipt" ? line.price || "" : line.quantity || ""} placeholder={kind === "receipt" ? "€" : t("scan_quantity")} onChange={(e) => updateLine(i, kind === "receipt" ? "price" : "quantity", e.target.value)}/><button type="button" onClick={() => removeLine(i)} className="rounded-lg border border-border flex items-center justify-center text-muted" aria-label={t("delete")}><Trash2 size={15}/></button></div>)}</div>
      <button type="button" onClick={addLine} className="text-sm text-accent flex items-center gap-1.5"><Plus size={16}/>{t("scan_add_item")}</button>
      {kind === "receipt" && <div className="rounded-xl bg-paper p-3"><label className="text-sm font-semibold text-ink block mb-2">{t("scan_who_shopped")}</label><select value={shopperId} onChange={(e) => setShopperId(e.target.value)} className="w-full rounded-lg border border-border bg-white2 px-3 py-2 text-sm"><option value="">{t("scan_choose_member")}</option>{members.filter((m) => !m.left_at).map((m) => <option key={m.id} value={m.id}>{m.id === me?.id ? `${m.first_name} · ${t("me")}` : m.first_name}</option>)}</select><p className="text-xs text-muted mt-2">{t("scan_receipt_save_explainer")}</p></div>}
      <details className="text-xs text-muted"><summary className="cursor-pointer">{t("scan_raw_text")}</summary><textarea className="mt-2 w-full min-h-32 rounded-lg border border-border bg-white2 p-2" readOnly value={result.rawText}/></details>
      <button type="button" disabled={saving || saved} onClick={save} className="w-full rounded-xl bg-ink text-paper py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"><Check size={18}/>{saving ? t("scan_saving") : saved ? t("scan_saved") : kind === "receipt" ? t("scan_validate_receipt") : t("scan_add_to_courses")}</button>
      {saved && <div className="rounded-xl bg-paper p-3 text-sm">{kind === "receipt" ? t("scan_receipt_saved_note") : t("scan_list_saved_note")}</div>}
    </div>}
    <div className="rounded-xl bg-paper p-3 text-xs text-muted leading-relaxed">{t("scan_confirmation_rule_v21")}</div>
  </div></section>;
}
