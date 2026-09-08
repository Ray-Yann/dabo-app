"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, FileImage, FileText, LoaderCircle, ReceiptText, ShoppingBasket, Tags, Upload, X } from "lucide-react";
import { useT } from "@/lib/language-context";
import { extractScan, type ScanExtraction, type ScanKind } from "@/lib/dabo-scan";

const kinds: { id: ScanKind; icon: typeof ReceiptText; label: string }[] = [
  { id: "receipt", icon: ReceiptText, label: "scan_type_receipt" },
  { id: "list", icon: ShoppingBasket, label: "scan_type_list" },
  { id: "promo", icon: Tags, label: "scan_type_promo" },
  { id: "invoice", icon: FileText, label: "scan_type_invoice" },
];

type TesseractGlobal = { createWorker: (lang: string, oem?: number, options?: { logger?: (m: { progress?: number }) => void }) => Promise<{ recognize: (file: File) => Promise<{ data: { text: string } }>; terminate: () => Promise<void> }> };
declare global { interface Window { Tesseract?: TesseractGlobal } }

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise<void>((resolve, reject) => {
    const old = document.querySelector<HTMLScriptElement>('script[data-dabo-ocr="1"]');
    if (old) { old.addEventListener("load", () => resolve(), { once: true }); old.addEventListener("error", () => reject(new Error("OCR")), { once: true }); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true; script.dataset.daboOcr = "1";
    script.onload = () => resolve(); script.onerror = () => reject(new Error("OCR"));
    document.head.appendChild(script);
  });
  if (!window.Tesseract) throw new Error("OCR");
  return window.Tesseract;
}

export function DaboScanView() {
  const t = useT();
  const cameraRef = useRef<HTMLInputElement>(null); const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<ScanKind>("receipt"); const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null); const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [result, setResult] = useState<ScanExtraction | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(next: File | null) {
    if (preview) URL.revokeObjectURL(preview); setFile(next); setResult(null); setError(""); setConfirmed(false); setProgress(0);
    setPreview(next && next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
  }
  async function analyze() {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError(t("scan_pdf_later")); return; }
    setBusy(true); setError(""); setProgress(0); setConfirmed(false);
    let worker: Awaited<ReturnType<TesseractGlobal["createWorker"]>> | null = null;
    try {
      const Tess = await loadTesseract();
      worker = await Tess.createWorker("fra+nld+eng", 1, { logger: (m) => { if (typeof m.progress === "number") setProgress(Math.round(m.progress * 100)); } });
      const out = await worker.recognize(file); setResult(extractScan(out.data.text, kind));
    } catch { setError(t("scan_ocr_error")); } finally { if (worker) await worker.terminate().catch(() => undefined); setBusy(false); }
  }
  function updateLine(i: number, key: "label" | "price", value: string) { if (!result) return; const lines = result.lines.map((x, n) => n === i ? { ...x, [key]: value } : x); setResult({ ...result, lines }); setConfirmed(false); }

  return <section className="px-5 pb-8"><div className="rounded-2xl bg-white2 border border-border p-4 space-y-5">
    <div><div className="text-lg font-semibold text-ink">{t("scan_heading")}</div><p className="text-sm text-muted mt-1">{t("scan_intro")}</p></div>
    <div className="grid grid-cols-2 gap-2">{kinds.map(({id,icon:Icon,label}) => <button key={id} type="button" onClick={() => {setKind(id);setResult(null);setConfirmed(false)}} className={`rounded-xl border p-3 text-left ${kind===id?"border-ink bg-paper":"border-border bg-white2"}`}><Icon size={19} className="mb-2"/><span className="text-sm font-medium">{t(label)}</span></button>)}</div>
    <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(e)=>choose(e.target.files?.[0]||null)}/>
    <input ref={fileRef} className="hidden" type="file" accept="image/*,application/pdf" onChange={(e)=>choose(e.target.files?.[0]||null)}/>
    {!file ? <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={()=>cameraRef.current?.click()} className="rounded-xl bg-ink text-paper py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium"><Camera size={18}/>{t("scan_take_photo")}</button><button type="button" onClick={()=>fileRef.current?.click()} className="rounded-xl border border-border py-3 px-4 flex items-center justify-center gap-2 text-sm"><Upload size={18}/>{t("scan_import")}</button></div> : <div className="rounded-xl border border-border overflow-hidden">{preview?<img src={preview} alt="" className="w-full max-h-80 object-contain bg-paper"/>:<div className="h-36 flex items-center justify-center bg-paper"><FileImage size={36}/></div>}<div className="p-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-sm font-medium truncate">{file.name}</div><div className="text-xs text-muted">{Math.max(1,Math.round(file.size/1024))} Ko</div></div><button type="button" onClick={()=>choose(null)} className="p-2 rounded-lg hover:bg-paper" aria-label={t("scan_remove")}><X size={18}/></button></div></div>}
    {file && !result && <button type="button" disabled={busy} onClick={analyze} className="w-full rounded-xl bg-ink text-paper py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">{busy?<><LoaderCircle size={18} className="animate-spin"/>{t("scan_reading")} {progress}%</>:t("scan_analyze")}</button>}
    {error && <div className="rounded-xl border border-border bg-paper p-3 text-sm">{error}</div>}
    {result && <div className="space-y-3 border-t border-border pt-4"><div><div className="font-semibold">{t("scan_understood")}</div><div className="text-xs text-muted">{t("scan_edit_before_confirm")}</div></div>
      {kind!=="list" && <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><input className="rounded-lg border border-border bg-white2 px-3 py-2 text-sm" value={result.merchant} placeholder={t("scan_merchant")} onChange={e=>setResult({...result,merchant:e.target.value})}/><input className="rounded-lg border border-border bg-white2 px-3 py-2 text-sm" value={result.date} placeholder={t("scan_date")} onChange={e=>setResult({...result,date:e.target.value})}/><input className="rounded-lg border border-border bg-white2 px-3 py-2 text-sm" value={result.total} placeholder={t("scan_total")} onChange={e=>setResult({...result,total:e.target.value})}/></div>}
      <div className="space-y-2">{result.lines.map((line,i)=><div key={i} className="grid grid-cols-[1fr_90px] gap-2"><input className="rounded-lg border border-border bg-white2 px-3 py-2 text-sm" value={line.label} onChange={e=>updateLine(i,"label",e.target.value)}/><input className="rounded-lg border border-border bg-white2 px-3 py-2 text-sm" value={line.price||""} placeholder="€" onChange={e=>updateLine(i,"price",e.target.value)}/></div>)}</div>
      <details className="text-xs text-muted"><summary className="cursor-pointer">{t("scan_raw_text")}</summary><textarea className="mt-2 w-full min-h-32 rounded-lg border border-border bg-white2 p-2" readOnly value={result.rawText}/></details>
      <button type="button" onClick={()=>setConfirmed(true)} className="w-full rounded-xl bg-ink text-paper py-3 text-sm font-medium flex items-center justify-center gap-2"><Check size={18}/>{confirmed?t("scan_confirmed"):t("scan_confirm")}</button>{confirmed&&<div className="rounded-xl bg-paper p-3 text-sm">{t("scan_confirmed_note")}</div>}
    </div>}
    <div className="rounded-xl bg-paper p-3 text-xs text-muted leading-relaxed">{t("scan_confirmation_rule")}</div>
  </div></section>;
}
