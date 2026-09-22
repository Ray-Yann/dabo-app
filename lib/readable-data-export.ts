type ReadableExportPayload = {
  exportedAt: string;
  account: {
    email: string | null;
  };
  households: Array<{
    membership: {
      firstName: string | null;
      role: string | null;
      joinedAt: string | null;
    };
    household: {
      name: string | null;
      type: string | null;
      countryCode: string | null;
    } | null;
  }>;
  personalData: {
    lifeContexts: Array<Record<string, unknown>>;
    loadPerceptions: Array<Record<string, unknown>>;
    personalCalendarEvents: Array<Record<string, unknown>>;
    tasks: {
      assignedPending: Array<Record<string, unknown>>;
      completedContributions: Array<Record<string, unknown>>;
      subtasks: Array<Record<string, unknown>>;
    };
    shopping: {
      assignedToBuy: Array<Record<string, unknown>>;
      boughtByMe: Array<Record<string, unknown>>;
    };
  };
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function text(value: unknown, fallback = "—"): string {
  const normalized = String(value ?? "").trim();
  return normalized ? escapeHtml(normalized) : fallback;
}

function formatDate(value: unknown, locale: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return text(raw);

  return escapeHtml(
    new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  );
}

function section(title: string, body: string): string {
  return `
    <section>
      <h2>${escapeHtml(title)}</h2>
      ${body}
    </section>
  `;
}

function empty(label: string): string {
  return `<p class="empty">${escapeHtml(label)}</p>`;
}

function rows(items: Array<Record<string, unknown>>, render: (item: Record<string, unknown>) => string, emptyLabel: string): string {
  if (!items.length) return empty(emptyLabel);
  return `<div class="rows">${items.map(render).join("")}</div>`;
}


type ReadableExportLang = "fr" | "nl" | "en" | "de" | "es" | "it" | "pt";

const READABLE_EXPORT_COPY = {
  fr: {
    locale: "fr-BE",
    title: "Mes données DABO",
    description: "Copie lisible de vos données personnelles enregistrées dans DABO.",
    account: "Compte",
    created: "Export créé le",
    households: "Mes foyers",
    householdFallback: "Foyer",
    noHousehold: "Aucun foyer actif.",
    pendingTasks: "Mes tâches à faire",
    todo: "À faire",
    due: "Échéance",
    noPendingTask: "Aucune tâche à faire ne vous est attribuée.",
    completedTasks: "Mes tâches effectuées",
    taskFallback: "Tâche",
    completed: "Effectuée",
    noCompletedTask: "Aucune tâche effectuée enregistrée.",
    subtasks: "Mes sous-tâches",
    subtaskDone: "Étape terminée",
    subtaskTodo: "Étape à faire",
    noSubtask: "Aucune sous-tâche personnelle enregistrée.",
    shoppingTodo: "Mes courses à acheter",
    quantityUnknown: "Quantité non précisée",
    noShoppingTodo: "Aucun article à acheter ne vous est attribué.",
    shoppingBought: "Mes achats effectués",
    bought: "Acheté",
    noShoppingBought: "Aucun achat effectué enregistré.",
    lifeContexts: "Ma disponibilité",
    noLifeContext: "Aucun contexte de disponibilité enregistré.",
    lifeContextTypes: { busy_period: "Période très chargée", studies: "Études ou examens", travel: "Déplacement", away: "Absence", reduced_availability: "Disponibilité réduite", other: "Autre situation temporaire" },
    lifeContextImpacts: { reduced: "Réduite", very_reduced: "Très réduite" },
    from: "Du",
    to: "Au",
    loadPerceptions: "Mon ressenti",
    noLoadPerception: "Aucun ressenti enregistré.",
    perceptionValues: { balanced: "Elle me semble équilibrée", i_carry_more: "J’ai l’impression d’en porter davantage", other_carries_more: "J’ai l’impression qu’un autre membre en porte davantage", unclear: "Je ne sais pas vraiment" },
    calendar: "Mon calendrier personnel",
    noCalendar: "Aucun événement personnel enregistré.",
    footer: "Ce document est une copie lisible de vos données DABO. Il ne modifie ni votre compte ni vos foyers. L’export JSON disponible dans DABO reste le format destiné à la portabilité technique.",
  },
  nl: {
    locale: "nl-BE",
    title: "Mijn DABO-gegevens",
    description: "Leesbare kopie van uw persoonlijke gegevens die in DABO zijn opgeslagen.",
    account: "Account",
    created: "Export aangemaakt op",
    households: "Mijn huishoudens",
    householdFallback: "Huishouden",
    noHousehold: "Geen actief huishouden.",
    pendingTasks: "Mijn openstaande taken",
    todo: "Te doen",
    due: "Deadline",
    noPendingTask: "Er zijn geen openstaande taken aan u toegewezen.",
    completedTasks: "Mijn uitgevoerde taken",
    taskFallback: "Taak",
    completed: "Uitgevoerd",
    noCompletedTask: "Geen uitgevoerde taken geregistreerd.",
    subtasks: "Mijn subtaken",
    subtaskDone: "Stap voltooid",
    subtaskTodo: "Stap te doen",
    noSubtask: "Geen persoonlijke subtaken geregistreerd.",
    shoppingTodo: "Mijn boodschappen",
    quantityUnknown: "Hoeveelheid niet opgegeven",
    noShoppingTodo: "Er zijn geen boodschappen aan u toegewezen.",
    shoppingBought: "Mijn aankopen",
    bought: "Gekocht",
    noShoppingBought: "Geen aankopen geregistreerd.",
    lifeContexts: "Mijn beschikbaarheid",
    noLifeContext: "Geen beschikbaarheidscontext geregistreerd.",
    lifeContextTypes: { busy_period: "Zeer drukke periode", studies: "Studie of examens", travel: "Reis", away: "Afwezigheid", reduced_availability: "Beperkte beschikbaarheid", other: "Andere tijdelijke situatie" },
    lifeContextImpacts: { reduced: "Beperkt", very_reduced: "Sterk beperkt" },
    from: "Van",
    to: "Tot",
    loadPerceptions: "Mijn gevoel",
    noLoadPerception: "Geen gevoel over de verdeling geregistreerd.",
    perceptionValues: { balanced: "Ze voelt evenwichtig aan", i_carry_more: "Ik heb het gevoel dat ik meer draag", other_carries_more: "Ik heb het gevoel dat een ander lid meer draagt", unclear: "Ik weet het niet echt" },
    calendar: "Mijn persoonlijke agenda",
    noCalendar: "Geen persoonlijke afspraken geregistreerd.",
    footer: "Dit document is een leesbare kopie van uw DABO-gegevens. Het wijzigt uw account of huishoudens niet. De JSON-export in DABO blijft het formaat voor technische gegevensoverdracht.",
  },
  en: {
    locale: "en-GB",
    title: "My DABO data",
    description: "Readable copy of your personal data stored in DABO.",
    account: "Account",
    created: "Export created on",
    households: "My households",
    householdFallback: "Household",
    noHousehold: "No active household.",
    pendingTasks: "My tasks to do",
    todo: "To do",
    due: "Due",
    noPendingTask: "No pending task is assigned to you.",
    completedTasks: "My completed tasks",
    taskFallback: "Task",
    completed: "Completed",
    noCompletedTask: "No completed task recorded.",
    subtasks: "My subtasks",
    subtaskDone: "Step completed",
    subtaskTodo: "Step to do",
    noSubtask: "No personal subtask recorded.",
    shoppingTodo: "My shopping to buy",
    quantityUnknown: "Quantity not specified",
    noShoppingTodo: "No shopping item is assigned to you.",
    shoppingBought: "My purchases",
    bought: "Bought",
    noShoppingBought: "No purchase recorded.",
    lifeContexts: "My availability",
    noLifeContext: "No availability context recorded.",
    lifeContextTypes: { busy_period: "Very busy period", studies: "Studies or exams", travel: "Travel", away: "Away", reduced_availability: "Reduced availability", other: "Other temporary situation" },
    lifeContextImpacts: { reduced: "Reduced", very_reduced: "Very reduced" },
    from: "From",
    to: "To",
    loadPerceptions: "How it feels to me",
    noLoadPerception: "No perception of the distribution recorded.",
    perceptionValues: { balanced: "It feels balanced to me", i_carry_more: "I feel like I’m carrying more", other_carries_more: "I feel like another member is carrying more", unclear: "I’m not really sure" },
    calendar: "My personal calendar",
    noCalendar: "No personal event recorded.",
    footer: "This document is a readable copy of your DABO data. It does not change your account or households. The JSON export available in DABO remains the format intended for technical data portability.",
  },
  de: {
    locale: "de-DE",
    title: "Meine DABO-Daten",
    description: "Lesbare Kopie Ihrer in DABO gespeicherten persönlichen Daten.",
    account: "Konto",
    created: "Export erstellt am",
    households: "Meine Haushalte",
    householdFallback: "Haushalt",
    noHousehold: "Kein aktiver Haushalt.",
    pendingTasks: "Meine offenen Aufgaben",
    todo: "Zu erledigen",
    due: "Fällig",
    noPendingTask: "Ihnen ist keine offene Aufgabe zugewiesen.",
    completedTasks: "Meine erledigten Aufgaben",
    taskFallback: "Aufgabe",
    completed: "Erledigt",
    noCompletedTask: "Keine erledigte Aufgabe gespeichert.",
    subtasks: "Meine Teilaufgaben",
    subtaskDone: "Schritt erledigt",
    subtaskTodo: "Schritt zu erledigen",
    noSubtask: "Keine persönliche Teilaufgabe gespeichert.",
    shoppingTodo: "Meine Einkäufe",
    quantityUnknown: "Menge nicht angegeben",
    noShoppingTodo: "Ihnen ist kein Einkaufsartikel zugewiesen.",
    shoppingBought: "Meine getätigten Einkäufe",
    bought: "Gekauft",
    noShoppingBought: "Kein Einkauf gespeichert.",
    lifeContexts: "Meine Verfügbarkeit",
    noLifeContext: "Kein Verfügbarkeitskontext gespeichert.",
    lifeContextTypes: { busy_period: "Sehr arbeitsreiche Zeit", studies: "Studium oder Prüfungen", travel: "Reise", away: "Abwesenheit", reduced_availability: "Eingeschränkte Verfügbarkeit", other: "Andere vorübergehende Situation" },
    lifeContextImpacts: { reduced: "Eingeschränkt", very_reduced: "Stark eingeschränkt" },
    from: "Von",
    to: "Bis",
    loadPerceptions: "Mein Empfinden",
    noLoadPerception: "Kein Empfinden zur Verteilung gespeichert.",
    perceptionValues: { balanced: "Sie fühlt sich für mich ausgewogen an", i_carry_more: "Ich habe das Gefühl, mehr zu tragen", other_carries_more: "Ich habe das Gefühl, dass ein anderes Mitglied mehr trägt", unclear: "Ich bin mir nicht wirklich sicher" },
    calendar: "Mein persönlicher Kalender",
    noCalendar: "Kein persönlicher Termin gespeichert.",
    footer: "Dieses Dokument ist eine lesbare Kopie Ihrer DABO-Daten. Es ändert weder Ihr Konto noch Ihre Haushalte. Der JSON-Export in DABO bleibt das Format für die technische Datenübertragbarkeit.",
  },
  es: {
    locale: "es-ES",
    title: "Mis datos de DABO",
    description: "Copia legible de tus datos personales almacenados en DABO.",
    account: "Cuenta",
    created: "Exportación creada el",
    households: "Mis hogares",
    householdFallback: "Hogar",
    noHousehold: "No hay ningún hogar activo.",
    pendingTasks: "Mis tareas pendientes",
    todo: "Pendiente",
    due: "Fecha límite",
    noPendingTask: "No tienes ninguna tarea pendiente asignada.",
    completedTasks: "Mis tareas realizadas",
    taskFallback: "Tarea",
    completed: "Realizada",
    noCompletedTask: "No hay tareas realizadas registradas.",
    subtasks: "Mis subtareas",
    subtaskDone: "Paso completado",
    subtaskTodo: "Paso pendiente",
    noSubtask: "No hay subtareas personales registradas.",
    shoppingTodo: "Mis compras pendientes",
    quantityUnknown: "Cantidad no especificada",
    noShoppingTodo: "No tienes ningún artículo de compra asignado.",
    shoppingBought: "Mis compras realizadas",
    bought: "Comprado",
    noShoppingBought: "No hay compras realizadas registradas.",
    lifeContexts: "Mi disponibilidad",
    noLifeContext: "No hay ningún contexto de disponibilidad registrado.",
    lifeContextTypes: { busy_period: "Período muy ocupado", studies: "Estudios o exámenes", travel: "Viaje", away: "Ausencia", reduced_availability: "Disponibilidad reducida", other: "Otra situación temporal" },
    lifeContextImpacts: { reduced: "Reducida", very_reduced: "Muy reducida" },
    from: "Desde",
    to: "Hasta",
    loadPerceptions: "Cómo siento la distribución",
    noLoadPerception: "No hay ninguna percepción de la distribución registrada.",
    perceptionValues: { balanced: "Me parece equilibrado", i_carry_more: "Siento que llevo una mayor carga", other_carries_more: "Siento que otro miembro lleva una mayor carga", unclear: "No lo tengo muy claro" },
    calendar: "Mi calendario personal",
    noCalendar: "No hay eventos personales registrados.",
    footer: "Este documento es una copia legible de tus datos de DABO. No modifica tu cuenta ni tus hogares. La exportación JSON disponible en DABO sigue siendo el formato destinado a la portabilidad técnica.",
  },
  it: {
    locale: "it-IT",
    title: "I miei dati DABO",
    description: "Copia leggibile dei tuoi dati personali memorizzati in DABO.",
    account: "Account",
    created: "Esportazione creata il",
    households: "Le mie famiglie",
    householdFallback: "Famiglia",
    noHousehold: "Nessuna famiglia attiva.",
    pendingTasks: "Le mie attività da fare",
    todo: "Da fare",
    due: "Scadenza",
    noPendingTask: "Non ti è assegnata alcuna attività da fare.",
    completedTasks: "Le mie attività completate",
    taskFallback: "Attività",
    completed: "Completata",
    noCompletedTask: "Nessuna attività completata registrata.",
    subtasks: "Le mie sottoattività",
    subtaskDone: "Passaggio completato",
    subtaskTodo: "Passaggio da fare",
    noSubtask: "Nessuna sottoattività personale registrata.",
    shoppingTodo: "La mia spesa da fare",
    quantityUnknown: "Quantità non specificata",
    noShoppingTodo: "Non ti è assegnato alcun articolo da acquistare.",
    shoppingBought: "I miei acquisti",
    bought: "Acquistato",
    noShoppingBought: "Nessun acquisto registrato.",
    lifeContexts: "La mia disponibilità",
    noLifeContext: "Nessun contesto di disponibilità registrato.",
    lifeContextTypes: { busy_period: "Periodo molto intenso", studies: "Studio o esami", travel: "Viaggio", away: "Assenza", reduced_availability: "Disponibilità ridotta", other: "Altra situazione temporanea" },
    lifeContextImpacts: { reduced: "Ridotta", very_reduced: "Molto ridotta" },
    from: "Dal",
    to: "Al",
    loadPerceptions: "Come percepisco la distribuzione",
    noLoadPerception: "Nessuna percezione della distribuzione registrata.",
    perceptionValues: { balanced: "Mi sembra equilibrata", i_carry_more: "Ho la sensazione di sostenere un carico maggiore", other_carries_more: "Ho la sensazione che un altro membro sostenga un carico maggiore", unclear: "Non ne sono davvero sicuro" },
    calendar: "Il mio calendario personale",
    noCalendar: "Nessun evento personale registrato.",
    footer: "Questo documento è una copia leggibile dei tuoi dati DABO. Non modifica il tuo account né le tue famiglie. L’esportazione JSON disponibile in DABO rimane il formato destinato alla portabilità tecnica.",
  },
  pt: {
    locale: "pt-PT",
    title: "Os meus dados DABO",
    description: "Cópia legível dos seus dados pessoais guardados no DABO.",
    account: "Conta",
    created: "Exportação criada em",
    households: "Os meus agregados familiares",
    householdFallback: "Agregado familiar",
    noHousehold: "Nenhum agregado familiar ativo.",
    pendingTasks: "As minhas tarefas por fazer",
    todo: "Por fazer",
    due: "Prazo",
    noPendingTask: "Não lhe está atribuída nenhuma tarefa por fazer.",
    completedTasks: "As minhas tarefas realizadas",
    taskFallback: "Tarefa",
    completed: "Realizada",
    noCompletedTask: "Nenhuma tarefa realizada registada.",
    subtasks: "As minhas subtarefas",
    subtaskDone: "Etapa concluída",
    subtaskTodo: "Etapa por fazer",
    noSubtask: "Nenhuma subtarefa pessoal registada.",
    shoppingTodo: "As minhas compras por fazer",
    quantityUnknown: "Quantidade não especificada",
    noShoppingTodo: "Não lhe está atribuído nenhum artigo para comprar.",
    shoppingBought: "As minhas compras realizadas",
    bought: "Comprado",
    noShoppingBought: "Nenhuma compra realizada registada.",
    lifeContexts: "A minha disponibilidade",
    noLifeContext: "Nenhum contexto de disponibilidade registado.",
    lifeContextTypes: { busy_period: "Período muito ocupado", studies: "Estudos ou exames", travel: "Viagem", away: "Ausência", reduced_availability: "Disponibilidade reduzida", other: "Outra situação temporária" },
    lifeContextImpacts: { reduced: "Reduzida", very_reduced: "Muito reduzida" },
    from: "De",
    to: "Até",
    loadPerceptions: "Como sinto a distribuição",
    noLoadPerception: "Nenhuma perceção da distribuição registada.",
    perceptionValues: { balanced: "Parece-me equilibrada", i_carry_more: "Sinto que estou a assumir uma carga maior", other_carries_more: "Sinto que outro membro está a assumir uma carga maior", unclear: "Não tenho a certeza" },
    calendar: "O meu calendário pessoal",
    noCalendar: "Nenhum evento pessoal registado.",
    footer: "Este documento é uma cópia legível dos seus dados DABO. Não altera a sua conta nem os seus agregados familiares. A exportação JSON disponível no DABO continua a ser o formato destinado à portabilidade técnica.",
  },
} as const;

export function buildReadableDaboExport(
  payload: ReadableExportPayload,
  lang: ReadableExportLang = "fr"
): string {
  const copy = READABLE_EXPORT_COPY[lang] || READABLE_EXPORT_COPY.fr;
  const locale = copy.locale;
  const households = payload.households || [];
  const personal = payload.personalData;

  const householdHtml = households.length
    ? `<div class="rows">${households
        .map(
          (entry) => `
            <article class="row">
              <strong>${text(entry.household?.name, copy.householdFallback)}</strong>
              <span>${text(entry.membership?.firstName)} · ${text(entry.household?.type)}</span>
              <small>${text(entry.household?.countryCode)}</small>
            </article>
          `
        )
        .join("")}</div>`
    : empty(copy.noHousehold);

  const pendingTasks = rows(
    personal.tasks.assignedPending,
    (item) => `
      <article class="row">
        <strong>${text(item.name)}</strong>
        <span>${escapeHtml(copy.todo)}${item.due_date ? ` · ${escapeHtml(copy.due)} : ${formatDate(item.due_date, locale)}` : ""}</span>
      </article>
    `,
    copy.noPendingTask
  );

  const completedTasks = rows(
    personal.tasks.completedContributions,
    (item) => `
      <article class="row">
        <strong>${text(item.task_name, copy.taskFallback)}</strong>
        <span>${escapeHtml(copy.completed)}${item.completed_at ? ` · ${formatDate(item.completed_at, locale)}` : ""}</span>
      </article>
    `,
    copy.noCompletedTask
  );

  const subtasks = rows(
    personal.tasks.subtasks,
    (item) => `
      <article class="row">
        <strong>${text(item.name)}</strong>
        <span>${escapeHtml(item.completed_at ? copy.subtaskDone : copy.subtaskTodo)}</span>
      </article>
    `,
    copy.noSubtask
  );

  const toBuy = rows(
    personal.shopping.assignedToBuy,
    (item) => `
      <article class="row">
        <strong>${text(item.name)}</strong>
        <span>${text(item.quantity, copy.quantityUnknown)}${item.store_name ? ` · ${text(item.store_name)}` : ""}</span>
      </article>
    `,
    copy.noShoppingTodo
  );

  const bought = rows(
    personal.shopping.boughtByMe,
    (item) => `
      <article class="row">
        <strong>${text(item.name)}</strong>
        <span>${escapeHtml(copy.bought)}${item.bought_at ? ` · ${formatDate(item.bought_at, locale)}` : ""}${item.store_name ? ` · ${text(item.store_name)}` : ""}</span>
      </article>
    `,
    copy.noShoppingBought
  );

  const lifeContexts = rows(
    personal.lifeContexts,
    (item) => {
      const contextType = String(item.context_type ?? "");
      const impact = String(item.impact ?? "");
      const contextLabel =
        copy.lifeContextTypes[
          contextType as keyof typeof copy.lifeContextTypes
        ] || contextType;
      const impactLabel =
        copy.lifeContextImpacts[
          impact as keyof typeof copy.lifeContextImpacts
        ] || impact;

      const dates = [
        item.starts_on
          ? `${escapeHtml(copy.from)} ${formatDate(item.starts_on, locale)}`
          : "",
        item.ends_on
          ? `${escapeHtml(copy.to)} ${formatDate(item.ends_on, locale)}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ");

      return `
        <article class="row">
          <strong>${text(contextLabel)}</strong>
          <span>${text(impactLabel)}${dates ? ` · ${dates}` : ""}</span>
        </article>
      `;
    },
    copy.noLifeContext
  );

  const loadPerceptions = rows(
    personal.loadPerceptions,
    (item) => {
      const perception = String(item.perception ?? "");
      const perceptionLabel =
        copy.perceptionValues[
          perception as keyof typeof copy.perceptionValues
        ] || perception;

      return `
        <article class="row">
          <strong>${text(perceptionLabel)}</strong>
          <span>${item.declared_at ? formatDate(item.declared_at, locale) : ""}</span>
        </article>
      `;
    },
    copy.noLoadPerception
  );

  const calendar = rows(
    personal.personalCalendarEvents,
    (item) => `
      <article class="row">
        <strong>${text(item.title)}</strong>
        <span>${formatDate(item.event_date, locale)}${item.event_time ? ` · ${text(item.event_time)}` : ""}</span>
      </article>
    `,
    copy.noCalendar
  );

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(copy.title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f6f5f1;
    color: #20201d;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.5;
  }
  main {
    width: min(860px, calc(100% - 32px));
    margin: 32px auto;
    background: white;
    border: 1px solid #e7e4dc;
    border-radius: 24px;
    padding: 32px;
  }
  header { margin-bottom: 32px; }
  h1 { margin: 0 0 8px; font-size: 30px; }
  h2 { margin: 0 0 14px; font-size: 18px; }
  section { padding: 22px 0; border-top: 1px solid #ece9e2; }
  .meta, .empty, small { color: #6f6d66; }
  .rows { display: grid; gap: 10px; }
  .row {
    display: grid;
    gap: 3px;
    padding: 13px 15px;
    border: 1px solid #ece9e2;
    border-radius: 14px;
    break-inside: avoid;
  }
  .row span { font-size: 14px; color: #5f5d57; }
  footer { margin-top: 28px; font-size: 12px; color: #77746c; }
  @media print {
    body { background: white; }
    main { width: 100%; margin: 0; border: 0; border-radius: 0; padding: 0; }
  }
</style>
</head>
<body>
<main>
  <header>
    <h1>${escapeHtml(copy.title)}</h1>
    <p class="meta">${escapeHtml(copy.description)}</p>
    <p class="meta">${escapeHtml(copy.account)} : ${text(payload.account.email)}</p>
    <p class="meta">${escapeHtml(copy.created)} ${formatDate(payload.exportedAt, locale)}</p>
  </header>

  ${section(copy.households, householdHtml)}
  ${section(copy.pendingTasks, pendingTasks)}
  ${section(copy.completedTasks, completedTasks)}
  ${section(copy.subtasks, subtasks)}
  ${section(copy.shoppingTodo, toBuy)}
  ${section(copy.shoppingBought, bought)}
  ${section(copy.lifeContexts, lifeContexts)}
  ${section(copy.loadPerceptions, loadPerceptions)}
  ${section(copy.calendar, calendar)}

  <footer>${escapeHtml(copy.footer)}</footer>
</main>
</body>
</html>`;
}
