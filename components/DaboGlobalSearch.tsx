"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Search, X, ListTodo, ShoppingBag, CalendarDays, WalletCards, Scale, UsersRound, ScanLine, Settings, UserPlus, Plus, ReceiptText, ChartNoAxesColumn, ChevronRight } from "lucide-react";
import type { Task, ShoppingItem } from "@/lib/types";

type Language = "fr" | "nl" | "en" | "de" | "es" | "it" | "pt";
type SearchLabels = { search: string; placeholder: string; close: string; features: string; content: string; empty: string; extras: string; task: string; shopping: string; planning: string; finance: string; balance: string; members: string; settings: string; scan: string; addTask: string; invite: string };
const translations: Record<Language, SearchLabels> = {
  fr: { search:"Rechercher", placeholder:"Fonction, tâche, course…", close:"Fermer la recherche", features:"Fonctionnalités", content:"Dans votre foyer", empty:"Aucun résultat dans les données disponibles.", extras:"Autres accès", task:"Tâches", shopping:"Courses", planning:"Planning", finance:"Finances", balance:"Équilibre", members:"Membres", settings:"Réglages", scan:"Scanner un ticket", addTask:"Ajouter une tâche", invite:"Inviter un membre" },
  nl: { search:"Zoeken", placeholder:"Functie, taak, boodschappen…", close:"Zoekvenster sluiten", features:"Functies", content:"In je huishouden", empty:"Geen resultaten in beschikbare gegevens.", extras:"Meer opties", task:"Taken", shopping:"Boodschappen", planning:"Planning", finance:"Financiën", balance:"Balans", members:"Leden", settings:"Instellingen", scan:"Bon scannen", addTask:"Taak toevoegen", invite:"Lid uitnodigen" },
  en: { search:"Search", placeholder:"Feature, task, shopping…", close:"Close search", features:"Features", content:"In your household", empty:"No results in available data.", extras:"More shortcuts", task:"Tasks", shopping:"Shopping", planning:"Planning", finance:"Finances", balance:"Balance", members:"Members", settings:"Settings", scan:"Scan receipt", addTask:"Add a task", invite:"Invite a member" },
  de: { search:"Suchen", placeholder:"Funktion, Aufgabe, Einkauf…", close:"Suche schließen", features:"Funktionen", content:"In deinem Haushalt", empty:"Keine Treffer in verfügbaren Daten.", extras:"Weitere Zugänge", task:"Aufgaben", shopping:"Einkäufe", planning:"Planung", finance:"Finanzen", balance:"Balance", members:"Mitglieder", settings:"Einstellungen", scan:"Beleg scannen", addTask:"Aufgabe hinzufügen", invite:"Mitglied einladen" },
  es: { search:"Buscar", placeholder:"Función, tarea, compra…", close:"Cerrar búsqueda", features:"Funciones", content:"En tu hogar", empty:"Sin resultados en los datos disponibles.", extras:"Más accesos", task:"Tareas", shopping:"Compras", planning:"Planificación", finance:"Finanzas", balance:"Equilibrio", members:"Miembros", settings:"Ajustes", scan:"Escanear recibo", addTask:"Añadir tarea", invite:"Invitar miembro" },
  it: { search:"Cerca", placeholder:"Funzione, attività, spesa…", close:"Chiudi ricerca", features:"Funzioni", content:"Nella tua casa", empty:"Nessun risultato nei dati disponibili.", extras:"Altri accessi", task:"Attività", shopping:"Spesa", planning:"Calendario", finance:"Finanze", balance:"Equilibrio", members:"Membri", settings:"Impostazioni", scan:"Scansiona scontrino", addTask:"Aggiungi attività", invite:"Invita membro" },
  pt: { search:"Pesquisar", placeholder:"Função, tarefa, compras…", close:"Fechar pesquisa", features:"Funcionalidades", content:"No teu lar", empty:"Sem resultados nos dados disponíveis.", extras:"Mais acessos", task:"Tarefas", shopping:"Compras", planning:"Planeamento", finance:"Finanças", balance:"Equilíbrio", members:"Membros", settings:"Definições", scan:"Digitalizar recibo", addTask:"Adicionar tarefa", invite:"Convidar membro" },
};

export function DaboGlobalSearch({ language, tasks, shopping }: { language: string; tasks: Task[]; shopping: ShoppingItem[] }) {
  const router = useRouter();
  const labels = translations[language as Language] ?? translations.fr;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? []);
      if (!controls.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); triggerRef.current?.focus(); };
  }, [open]);
  const destinations = [
    { label: labels.task, icon: ListTodo, href: "/app/taches", keywords: "tasks tâches taken aufgaben tareas attività tarefas" },
    { label: labels.addTask, icon: Plus, href: "/app/taches?first=1", keywords: "create créer ajouter add task tâche" },
    { label: labels.shopping, icon: ShoppingBag, href: "/app/courses", keywords: "shopping courses achats boodschappen groceries" },
    { label: labels.planning, icon: CalendarDays, href: "/app/calendrier", keywords: "calendar agenda event événement rendez-vous" },
    { label: labels.finance, icon: WalletCards, href: "/app/finances", keywords: "bill facture budget expense dépense" },
    { label: labels.balance, icon: Scale, href: "/app/equilibre", keywords: "balance répartition contributions" },
    { label: labels.members, icon: UsersRound, href: "/app/foyer", keywords: "foyer famille household members" },
    { label: labels.invite, icon: UserPlus, href: "/app/foyer", keywords: "invite invitation inviter membre" },
    { label: labels.scan, icon: ScanLine, href: "/app/courses", keywords: "scan scanner ticket receipt reçu" },
    { label: labels.settings, icon: Settings, href: "/app/reglages", keywords: "settings paramètres preferences notifications" },
  ];
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
  const needle = normalize(query);
  const features = destinations.filter(item => !needle || normalize(item.label + " " + item.keywords).includes(needle));
  // Only search records already loaded for the active household; no cross-household queries.
  const records = needle ? [
    ...tasks.filter(item => normalize(item.name).includes(needle)).slice(0, 8).map(item => ({ label: item.name, category: labels.task, href: "/app/taches", icon: ListTodo, id: "task-" + item.id })),
    ...shopping.filter(item => normalize(item.name).includes(needle)).slice(0, 8).map(item => ({ label: item.name, category: labels.shopping, href: "/app/courses", icon: ShoppingBag, id: "shopping-" + item.id })),
  ] : [];
  const navigate = (href: string) => { setOpen(false); setQuery(""); router.push(href); };
  return <>
    <button ref={triggerRef} type="button" className="dabo-premium-bell" aria-label={labels.search} title={labels.search} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Search size={21} aria-hidden="true" /></button>
    {open && <div className="dabo-search-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={labels.search} className="dabo-search-dialog">
        <div className="dabo-search-head"><h2>{labels.search}</h2><button type="button" className="dabo-search-close" aria-label={labels.close} onClick={() => setOpen(false)}><X size={21}/></button></div>
        <div className="dabo-search-field"><Search size={20} aria-hidden="true"/><input ref={inputRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={labels.placeholder} aria-label={labels.search}/></div>
        <div className="dabo-search-results">
          {features.length > 0 && <><h3>{labels.features}</h3>{features.map(item => <button key={item.href + item.label} type="button" className="dabo-search-result" onClick={() => navigate(item.href)}><item.icon size={19} aria-hidden="true"/><span>{item.label}</span><ChevronRight size={17} aria-hidden="true"/></button>)}</>}
          {records.length > 0 && <><h3>{labels.content}</h3>{records.map(item => <button key={item.id} type="button" className="dabo-search-result" onClick={() => navigate(item.href)}><item.icon size={19} aria-hidden="true"/><span>{item.label}<small>{item.category}</small></span><ChevronRight size={17} aria-hidden="true"/></button>)}</>}
          {!features.length && !records.length && <p className="dabo-search-empty">{labels.empty}</p>}
        </div>
      </section>
    </div>}
  </>;
}

export function DaboQuickAccessCarousel({ language, primary, onLoba }: { language: string; primary: { id: string; label: string; icon: LucideIcon; href: string }[]; onLoba: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canBack, setCanBack] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const updateArrows = () => { const el = trackRef.current; if (!el) return; setCanBack(el.scrollLeft > 3); setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 3); };
  useEffect(() => { updateArrows(); const el = trackRef.current; if (!el) return; const observer = new ResizeObserver(updateArrows); observer.observe(el); return () => observer.disconnect(); }, []);
  const move = (direction: -1 | 1) => { const el = trackRef.current; if (!el) return; const item = el.querySelector<HTMLElement>(".dabo-v32-shortcut"); const step = item ? item.offsetWidth + 12 : 100; el.scrollBy({ left: direction * step * 3, behavior: "smooth" }); };
  const router = useRouter();
  const labels = translations[language as Language] ?? translations.fr;
  const secondaryLabels: Record<Language, { bills: string; overview: string; scroll: string }> = {
    fr: { bills: "Factures", overview: "Bilan du foyer", scroll: "Faire défiler les accès rapides" },
    nl: { bills: "Facturen", overview: "Huishoudoverzicht", scroll: "Snelle toegang horizontaal scrollen" },
    en: { bills: "Bills", overview: "Household overview", scroll: "Scroll quick links horizontally" },
    de: { bills: "Rechnungen", overview: "Haushaltsübersicht", scroll: "Schnellzugriffe horizontal scrollen" },
    es: { bills: "Facturas", overview: "Resumen del hogar", scroll: "Desplazar accesos horizontalmente" },
    it: { bills: "Fatture", overview: "Riepilogo della casa", scroll: "Scorri i collegamenti orizzontalmente" },
    pt: { bills: "Faturas", overview: "Resumo do lar", scroll: "Deslizar atalhos horizontalmente" },
  };
  const extra = secondaryLabels[language as Language] ?? secondaryLabels.fr;
  const items = [
    ...primary,
    { id: "scan", label: labels.scan, icon: ScanLine, href: "/app/courses" },
    { id: "members", label: labels.members, icon: UsersRound, href: "/app/foyer" },
    { id: "bills", label: extra.bills, icon: ReceiptText, href: "/app/finances" },
    { id: "overview", label: extra.overview, icon: ChartNoAxesColumn, href: "/app/bilan" },
    { id: "settings", label: labels.settings, icon: Settings, href: "/app/reglages" },
  ];
  const navigationLabels: Record<Language, { previous: string; next: string }> = {
    fr: { previous: "Raccourcis précédents", next: "Raccourcis suivants" },
    nl: { previous: "Vorige snelkoppelingen", next: "Volgende snelkoppelingen" },
    en: { previous: "Previous shortcuts", next: "Next shortcuts" },
    de: { previous: "Vorherige Schnellzugriffe", next: "Nächste Schnellzugriffe" },
    es: { previous: "Accesos anteriores", next: "Accesos siguientes" },
    it: { previous: "Collegamenti precedenti", next: "Collegamenti successivi" },
    pt: { previous: "Atalhos anteriores", next: "Próximos atalhos" },
  };
  const nav = navigationLabels[language as Language] ?? navigationLabels.fr;
  return <section className="dabo-quick-carousel" aria-label={extra.scroll}>
    <div className="dabo-quick-carousel-controls">
      <button type="button" className="dabo-quick-arrow" aria-label={nav.previous} disabled={!canBack} onClick={() => move(-1)}><ChevronRight className="dabo-quick-arrow-left" size={19} aria-hidden="true"/></button>
      <button type="button" className="dabo-quick-arrow" aria-label={nav.next} disabled={!canNext} onClick={() => move(1)}><ChevronRight size={19} aria-hidden="true"/></button>
    </div>
    <div ref={trackRef} className="dabo-quick-track" role="group" aria-label={extra.scroll} tabIndex={0} onScroll={updateArrows}>
      {items.map(item => <button key={item.id} type="button" className="dabo-v32-shortcut" onClick={() => item.id === "loba" ? onLoba() : router.push(item.href)}><span className={`dabo-v32-shortcut-icon dabo-v32-shortcut-${item.id}`}><item.icon size={22} aria-hidden="true"/></span><span>{item.label}</span></button>)}
    </div>
  </section>;
}
