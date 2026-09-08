"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileImage, FileText, ReceiptText, ShoppingBasket, Tags, Upload, X } from "lucide-react";
import { useT } from "@/lib/language-context";

type ScanKind = "receipt" | "list" | "promo" | "invoice";

const kinds: { id: ScanKind; icon: typeof ReceiptText; label: string }[] = [
  { id: "receipt", icon: ReceiptText, label: "scan_type_receipt" },
  { id: "list", icon: ShoppingBasket, label: "scan_type_list" },
  { id: "promo", icon: Tags, label: "scan_type_promo" },
  { id: "invoice", icon: FileText, label: "scan_type_invoice" },
];

export function DaboScanView() {
  const t = useT();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<ScanKind>("receipt");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(next: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next && next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
  }

  return (
    <section className="px-5 pb-8">
      <div className="rounded-2xl bg-white2 border border-border p-4 space-y-5">
        <div>
          <div className="text-lg font-semibold text-ink">{t("scan_heading")}</div>
          <p className="text-sm text-muted mt-1">{t("scan_intro")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {kinds.map(({ id, icon: Icon, label }) => (
            <button key={id} type="button" onClick={() => setKind(id)} className={`rounded-xl border p-3 text-left ${kind === id ? "border-ink bg-paper" : "border-border bg-white2"}`}>
              <Icon size={19} className="mb-2" />
              <span className="text-sm font-medium">{t(label)}</span>
            </button>
          ))}
        </div>

        <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(e) => choose(e.target.files?.[0] || null)} />
        <input ref={fileRef} className="hidden" type="file" accept="image/*,application/pdf" onChange={(e) => choose(e.target.files?.[0] || null)} />

        {!file ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => cameraRef.current?.click()} className="rounded-xl bg-ink text-paper py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium"><Camera size={18}/>{t("scan_take_photo")}</button>
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-border py-3 px-4 flex items-center justify-center gap-2 text-sm"><Upload size={18}/>{t("scan_import")}</button>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {preview ? <img src={preview} alt="" className="w-full max-h-80 object-contain bg-paper" /> : <div className="h-36 flex items-center justify-center bg-paper"><FileImage size={36}/></div>}
            <div className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0"><div className="text-sm font-medium truncate">{file.name}</div><div className="text-xs text-muted">{Math.max(1, Math.round(file.size/1024))} Ko</div></div>
              <button type="button" onClick={() => choose(null)} className="p-2 rounded-lg hover:bg-paper" aria-label={t("scan_remove")}><X size={18}/></button>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-paper p-3 text-xs text-muted leading-relaxed">
          {t("scan_confirmation_rule")}
        </div>

        {file && <button type="button" disabled className="w-full rounded-xl bg-ink/40 text-paper py-3 text-sm font-medium cursor-not-allowed">{t("scan_analysis_next")}</button>}
      </div>
    </section>
  );
}
