"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ListChecks, PenLine, PiggyBank, ShoppingBag, X } from "lucide-react";
import { useT } from "@/lib/language-context";
import { buildHouseholdInboxHref, interpretHouseholdInbox, type HouseholdInboxDestination, type HouseholdInboxFinanceKind, type HouseholdInboxInterpretation } from "@/lib/household-inbox";

type Props = { onClose: () => void; onGo: (href: string) => void };

function todayCivilDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

export function UniversalAddSheet({ onClose, onGo }: Props) {
  const t = useT();
  const [mode, setMode] = useState<"menu"|"write">("menu");
  const [input, setInput] = useState("");
  const [interpretation, setInterpretation] = useState<HouseholdInboxInterpretation|null>(null);
  const [financeChoice, setFinanceChoice] = useState(false);
  const destinationLabel = useMemo(() => interpretation ? t(`household_inbox_destination_${interpretation.destination}` as any) : "", [interpretation,t]);

  const analyse = () => setInterpretation(interpretHouseholdInbox(input,{referenceDate:todayCivilDate()}));
  const choose = (destination: HouseholdInboxDestination, financeKind: HouseholdInboxFinanceKind = null) => {
    setFinanceChoice(false);
    setInterpretation(prev => ({ destination, title: prev?.title || input.trim(), financeKind, date: prev?.date || null, time: prev?.time || null, amount: prev?.amount || null, recurrence: prev?.recurrence || null }));
  };
  const continueToForm = () => {
    if (!interpretation) return;
    const href = buildHouseholdInboxHref(interpretation);
    if (href) onGo(href);
  };

  return <div className="dabo-sheet-backdrop" onClick={onClose}>
    <section className="dabo-sheet dabo-universal-add-sheet" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="universal-add-title">
      <div className="dabo-sheet-handle" />
      <div className="flex items-start justify-between gap-4">
        <div><p className="dabo-kicker">DABO</p><h2 id="universal-add-title" className="font-serif text-2xl font-semibold text-ink">{mode === "menu" ? t("add_sheet_title") : t("household_inbox_title")}</h2></div>
        <button type="button" onClick={onClose} className="dabo-icon-button" aria-label={t("nav_close")}><X size={19}/></button>
      </div>

      {mode === "menu" ? <>
        <p className="dabo-universal-section-label">{t("universal_add_quick_title")}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={()=>onGo("/app/taches?first=1")} className="dabo-action-tile"><ListChecks/><span>{t("quick_action_task")}</span></button>
          <button onClick={()=>onGo("/app/courses?first=1")} className="dabo-action-tile"><ShoppingBag/><span>{t("quick_action_shopping")}</span></button>
          <button onClick={()=>onGo("/app/calendrier?first=1")} className="dabo-action-tile"><CalendarDays/><span>{t("quick_action_calendar")}</span></button>
          <button onClick={()=>onGo("/app/finances?first=1")} className="dabo-action-tile"><PiggyBank/><span>{t("universal_add_expense")}</span></button>
        </div>
        <p className="dabo-universal-section-label">{t("universal_add_delegate_title")}</p>
        <button type="button" onClick={()=>setMode("write")} className="dabo-delegate-card">
          <span className="dabo-delegate-icon"><PenLine size={21}/></span><span><strong>{t("universal_add_write")}</strong><small>{t("universal_add_write_hint")}</small></span><span aria-hidden="true">→</span>
        </button>
      </> : <div className="mt-5">
        <p className="text-sm text-muted">{t("household_inbox_description")}</p>
        <label className="dabo-field-label mt-4 block" htmlFor="universal-inbox">{t("household_inbox_input_label")}</label>
        <textarea id="universal-inbox" value={input} onChange={e=>{setInput(e.target.value);setInterpretation(null)}} placeholder={t("household_inbox_placeholder")} rows={3} className="dabo-universal-textarea" autoFocus />
        <div className="mt-3 flex gap-2">
          <button type="button" className="dabo-secondary-action" onClick={()=>{setMode("menu");setInterpretation(null)}}>{t("planning_undo")}</button>
          <button type="button" className="dabo-primary-action flex-1" disabled={!input.trim()} onClick={analyse}>{t("household_inbox_analyze")}</button>
        </div>
        {interpretation && <div className="dabo-inbox-proposal" aria-live="polite">
          <p className="dabo-universal-section-label !mt-0">{t("household_inbox_proposal")}</p>
          {interpretation.destination !== "unknown" ? <>
            <div className="dabo-inbox-result"><strong>{destinationLabel}</strong><span>{interpretation.title}</span>{interpretation.date && <small>{interpretation.date}{interpretation.time ? ` · ${interpretation.time}`:""}</small>}</div>
            <div className="mt-3 flex gap-2"><button className="dabo-secondary-action" onClick={()=>choose("unknown")}>{t("household_inbox_change_destination")}</button><button className="dabo-primary-action flex-1" onClick={continueToForm}>{t("household_inbox_continue")}</button></div>
          </> : <>
            <p className="text-sm text-muted">{t("household_inbox_unknown")}</p>
            <p className="mt-3 text-sm font-semibold">{t("household_inbox_choose_destination")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="dabo-choice-chip" onClick={()=>choose("shopping")}>{t("household_inbox_destination_shopping")}</button>
              <button className="dabo-choice-chip" onClick={()=>choose("task")}>{t("household_inbox_destination_task")}</button>
              <button className="dabo-choice-chip" onClick={()=>choose("calendar")}>{t("household_inbox_destination_calendar")}</button>
              <button className="dabo-choice-chip" onClick={()=>setFinanceChoice(true)}>{t("household_inbox_destination_finance")}</button>
            </div>
            {financeChoice && <div className="mt-3 grid grid-cols-3 gap-2">
              <button className="dabo-choice-chip" onClick={()=>choose("finance","expense")}>{t("household_inbox_finance_expense")}</button>
              <button className="dabo-choice-chip" onClick={()=>choose("finance","bill")}>{t("household_inbox_finance_bill")}</button>
              <button className="dabo-choice-chip" onClick={()=>choose("finance","reference")}>{t("household_inbox_finance_reference")}</button>
            </div>}
          </>}
        </div>}
      </div>}
    </section>
  </div>;
}



