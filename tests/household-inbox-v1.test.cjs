const test = require("node:test");
const assert = require("node:assert/strict");

async function loadInbox() {
  return import("../lib/household-inbox.ts");
}

test("Household Inbox propose Courses pour un achat explicite", async () => {
  const { interpretHouseholdInbox } = await loadInbox();
  const result = interpretHouseholdInbox("Acheter du lait");
  assert.equal(result.destination, "shopping");
  assert.equal(result.title, "lait");
});

test("Household Inbox propose Taches pour une action explicite", async () => {
  const { interpretHouseholdInbox } = await loadInbox();
  const result = interpretHouseholdInbox("Nettoyer la salle de bain");
  assert.equal(result.destination, "task");
  assert.equal(result.title, "Nettoyer la salle de bain");
});

test("Household Inbox propose Calendrier pour un rendez-vous date", async () => {
  const { interpretHouseholdInbox } = await loadInbox();
  const result = interpretHouseholdInbox("Dentiste jeudi a 14h");
  assert.equal(result.destination, "calendar");
  assert.equal(result.title, "Dentiste");
});

test("Household Inbox propose Finances pour une facture explicite", async () => {
  const { interpretHouseholdInbox } = await loadInbox();
  const result = interpretHouseholdInbox("Payer la facture internet de 49 euros");
  assert.equal(result.destination, "finance");
  assert.equal(result.financeKind, "bill");
});

test("Household Inbox ne force pas une destination ambigue", async () => {
  const { interpretHouseholdInbox } = await loadInbox();
  const result = interpretHouseholdInbox("Penser au cadeau de maman");
  assert.equal(result.destination, "unknown");
});

test("Household Inbox reconnait plusieurs formulations naturelles de courses", async () => {
  const { interpretHouseholdInbox } = await loadInbox();

  assert.equal(interpretHouseholdInbox("Prendre de la farine").destination, "shopping");
  assert.equal(interpretHouseholdInbox("Racheter des oeufs").destination, "shopping");
  assert.equal(interpretHouseholdInbox("Commander du papier toilette").destination, "shopping");
});

test("Household Inbox reconnait plusieurs taches domestiques explicites", async () => {
  const { interpretHouseholdInbox } = await loadInbox();

  assert.equal(interpretHouseholdInbox("Ranger la cuisine").destination, "task");
  assert.equal(interpretHouseholdInbox("Laver les draps").destination, "task");
  assert.equal(interpretHouseholdInbox("Sortir les poubelles").destination, "task");
});

test("Household Inbox reconnait un rendez-vous avec heure", async () => {
  const { interpretHouseholdInbox } = await loadInbox();

  const result = interpretHouseholdInbox("RDV medecin mardi 9h30");
  assert.equal(result.destination, "calendar");
});

test("Household Inbox ne confond pas un achat avec une facture", async () => {
  const { interpretHouseholdInbox } = await loadInbox();

  const result = interpretHouseholdInbox("Acheter une ampoule");
  assert.equal(result.destination, "shopping");
  assert.equal(result.financeKind, null);
});

test("Household Inbox reste prudent devant des phrases non classables", async () => {
  const { interpretHouseholdInbox } = await loadInbox();

  assert.equal(interpretHouseholdInbox("Maman arrive bientot").destination, "unknown");
  assert.equal(interpretHouseholdInbox("Ne pas oublier").destination, "unknown");
  assert.equal(interpretHouseholdInbox("").destination, "unknown");
});

test("Household Inbox convertit demain en date civile", async () => {
  const { interpretHouseholdInbox } = await loadInbox();

  const result = interpretHouseholdInbox(
    "Acheter du lait demain",
    { referenceDate: "2026-09-27" }
  );

  assert.equal(result.destination, "shopping");
  assert.equal(result.title, "lait");
  assert.equal(result.date, "2026-09-28");
});

test("Household Inbox convertit un prochain jour de semaine pour le calendrier", async () => {
  const { interpretHouseholdInbox } = await loadInbox();

  const result = interpretHouseholdInbox(
    "Dentiste jeudi a 14h",
    { referenceDate: "2026-09-27" }
  );

  assert.equal(result.destination, "calendar");
  assert.equal(result.title, "Dentiste");
  assert.equal(result.date, "2026-10-01");
  assert.equal(result.time, "14:00");
});

test("Household Inbox comprend les minutes dans une heure", async () => {
  const { interpretHouseholdInbox } = await loadInbox();

  const result = interpretHouseholdInbox(
    "RDV medecin mardi 9h30",
    { referenceDate: "2026-09-27" }
  );

  assert.equal(result.destination, "calendar");
  assert.equal(result.date, "2026-09-29");
  assert.equal(result.time, "09:30");
});

test("Household Inbox ne fabrique pas de date absente du texte", async () => {
  const { interpretHouseholdInbox } = await loadInbox();

  const result = interpretHouseholdInbox(
    "Nettoyer la cuisine",
    { referenceDate: "2026-09-27" }
  );

  assert.equal(result.destination, "task");
  assert.equal(result.date, null);
  assert.equal(result.time, null);
});

test("Household Inbox construit le pre-remplissage Courses sans perdre la date", async () => {
  const { buildHouseholdInboxHref } = await loadInbox();

  const href = buildHouseholdInboxHref({
    destination: "shopping",
    title: "lait demi-ecreme",
    financeKind: null,
    date: "2026-09-28",
    time: null,
  });

  assert.equal(
    href,
    "/app/courses?first=1&inbox=1&name=lait+demi-ecreme&date=2026-09-28"
  );
});

test("Household Inbox construit le pre-remplissage Taches", async () => {
  const { buildHouseholdInboxHref } = await loadInbox();

  const href = buildHouseholdInboxHref({
    destination: "task",
    title: "Nettoyer la salle de bain",
    financeKind: null,
    date: "2026-09-29",
    time: null,
  });

  assert.equal(
    href,
    "/app/taches?first=1&inbox=1&name=Nettoyer+la+salle+de+bain&date=2026-09-29"
  );
});

test("Household Inbox construit le pre-remplissage Calendrier avec heure", async () => {
  const { buildHouseholdInboxHref } = await loadInbox();

  const href = buildHouseholdInboxHref({
    destination: "calendar",
    title: "Dentiste",
    financeKind: null,
    date: "2026-10-01",
    time: "14:00",
  });

  assert.equal(
    href,
    "/app/calendrier?first=1&inbox=1&title=Dentiste&date=2026-10-01&time=14%3A00"
  );
});

test("Household Inbox construit le pre-remplissage d'une facture Finance", async () => {
  const { buildHouseholdInboxHref } = await loadInbox();

  const href = buildHouseholdInboxHref({
    destination: "finance",
    title: "Facture internet",
    financeKind: "bill",
    date: "2026-10-05",
    time: null,
  });

  assert.equal(
    href,
    "/app/finances?inbox=1&kind=bill&label=Facture+internet&date=2026-10-05"
  );
});

test("Household Inbox refuse de naviguer quand la destination reste inconnue", async () => {
  const { buildHouseholdInboxHref } = await loadInbox();

  const href = buildHouseholdInboxHref({
    destination: "unknown",
    title: "Penser au cadeau de maman",
    financeKind: null,
    date: null,
    time: null,
  });

  assert.equal(href, null);
});

test("Household Inbox ne choisit pas arbitrairement un type Finance", async () => {
  const { buildHouseholdInboxHref } = await loadInbox();

  const href = buildHouseholdInboxHref({
    destination: "finance",
    title: "Electricite",
    financeKind: null,
    date: null,
    time: null,
  });

  assert.equal(href, null);
});

test("Household Inbox lit le pre-remplissage Courses depuis les parametres URL", async () => {
  const { readShoppingInboxPrefill } = await loadInbox();

  const params = new URLSearchParams(
    "first=1&inbox=1&name=lait+demi-ecreme&date=2026-09-28"
  );

  assert.deepEqual(readShoppingInboxPrefill(params), {
    name: "lait demi-ecreme",
    dueDate: "2026-09-28",
  });
});

test("Courses ignore les parametres de pre-remplissage hors Household Inbox", async () => {
  const { readShoppingInboxPrefill } = await loadInbox();

  const params = new URLSearchParams(
    "first=1&name=ne+doit+pas+etre+injecte&date=2026-09-28"
  );

  assert.equal(readShoppingInboxPrefill(params), null);
});

test("Courses conserve la Quick Action classique sans pre-remplissage Inbox", async () => {
  const { readShoppingInboxPrefill } = await loadInbox();

  const params = new URLSearchParams("first=1");

  assert.equal(readShoppingInboxPrefill(params), null);
});
const fs = require("node:fs");

test("Courses branche le Household Inbox sur le formulaire existant", () => {
  const source = fs.readFileSync("app/app/courses/page.tsx", "utf8");

  assert.match(
    source,
    /readShoppingInboxPrefill/,
    "Courses doit utiliser le lecteur Household Inbox"
  );

  assert.match(
    source,
    /setAddForm/,
    "Courses doit pre-remplir le formulaire existant"
  );
});

test("Household Inbox lit le pre-remplissage Taches depuis les parametres URL", async () => {
  const { readTaskInboxPrefill } = await loadInbox();
  const params = new URLSearchParams(
    "first=1&inbox=1&name=Nettoyer+la+salle+de+bain&date=2026-09-29"
  );

  assert.deepEqual(readTaskInboxPrefill(params), {
    name: "Nettoyer la salle de bain",
    dueDate: "2026-09-29",
  });
});

test("Taches ignore les parametres de pre-remplissage hors Household Inbox", async () => {
  const { readTaskInboxPrefill } = await loadInbox();
  const params = new URLSearchParams(
    "first=1&name=ne+doit+pas+etre+injecte&date=2026-09-29"
  );

  assert.equal(readTaskInboxPrefill(params), null);
});

test("Taches conserve la Quick Action classique sans pre-remplissage Inbox", async () => {
  const { readTaskInboxPrefill } = await loadInbox();
  const params = new URLSearchParams("first=1");

  assert.equal(readTaskInboxPrefill(params), null);
});

test("Taches branche le Household Inbox sur le formulaire existant", () => {
  const source = fs.readFileSync("app/app/taches/page.tsx", "utf8");

  assert.match(
    source,
    /readTaskInboxPrefill/,
    "Taches doit utiliser le lecteur Household Inbox"
  );

  assert.match(
    source,
    /setAddForm/,
    "Taches doit pre-remplir le formulaire existant"
  );
});

test("Household Inbox lit le pre-remplissage Calendrier depuis les parametres URL", async () => {
  const { readCalendarInboxPrefill } = await loadInbox();
  const params = new URLSearchParams(
    "first=1&inbox=1&title=Dentiste&date=2026-10-01&time=14%3A00"
  );

  assert.deepEqual(readCalendarInboxPrefill(params), {
    title: "Dentiste",
    eventDate: "2026-10-01",
    eventTime: "14:00",
  });
});

test("Calendrier ignore les parametres de pre-remplissage hors Household Inbox", async () => {
  const { readCalendarInboxPrefill } = await loadInbox();
  const params = new URLSearchParams(
    "first=1&title=Ne+pas+injecter&date=2026-10-01&time=14%3A00"
  );

  assert.equal(readCalendarInboxPrefill(params), null);
});

test("Calendrier conserve la Quick Action classique sans pre-remplissage Inbox", async () => {
  const { readCalendarInboxPrefill } = await loadInbox();
  const params = new URLSearchParams("first=1");

  assert.equal(readCalendarInboxPrefill(params), null);
});

test("Calendrier branche le Household Inbox sur le formulaire existant", () => {
  const source = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");

  assert.match(
    source,
    /readCalendarInboxPrefill/,
    "Calendrier doit utiliser le lecteur Household Inbox"
  );

  assert.match(
    source,
    /setTitle/,
    "Calendrier doit pre-remplir le titre existant"
  );

  assert.match(
    source,
    /setEventDate/,
    "Calendrier doit pre-remplir la date existante"
  );

  assert.match(
    source,
    /setEventTime/,
    "Calendrier doit pre-remplir l'heure existante"
  );
});

test("Household Inbox lit le pre-remplissage Finances depuis les parametres URL", async () => {
  const { readFinanceInboxPrefill } = await loadInbox();
  const params = new URLSearchParams(
    "inbox=1&kind=bill&label=Facture+internet&date=2026-10-05"
  );

  assert.deepEqual(readFinanceInboxPrefill(params), {
    kind: "bill",
    label: "Facture internet",
    date: "2026-10-05",
  });
});

test("Finances ignore les parametres de pre-remplissage hors Household Inbox", async () => {
  const { readFinanceInboxPrefill } = await loadInbox();
  const params = new URLSearchParams(
    "kind=bill&label=Ne+pas+injecter&date=2026-10-05"
  );

  assert.equal(readFinanceInboxPrefill(params), null);
});

test("Finances refuse un type Household Inbox inconnu", async () => {
  const { readFinanceInboxPrefill } = await loadInbox();
  const params = new URLSearchParams(
    "inbox=1&kind=unknown&label=Facture+internet&date=2026-10-05"
  );

  assert.equal(readFinanceInboxPrefill(params), null);
});

test("Finances refuse un Household Inbox sans libelle", async () => {
  const { readFinanceInboxPrefill } = await loadInbox();
  const params = new URLSearchParams(
    "inbox=1&kind=bill&date=2026-10-05"
  );

  assert.equal(readFinanceInboxPrefill(params), null);
});

test("Finances branche le Household Inbox sur le formulaire existant", () => {
  const source = fs.readFileSync("app/app/finances/page.tsx", "utf8");

  assert.match(
    source,
    /readFinanceInboxPrefill/,
    "Finances doit utiliser le lecteur Household Inbox"
  );

  assert.match(
    source,
    /setForm/,
    "Finances doit ouvrir le formulaire existant"
  );

  assert.match(
    source,
    /setLabel/,
    "Finances doit pre-remplir le libelle existant"
  );

  assert.match(
    source,
    /setDate/,
    "Finances doit pre-remplir la date existante"
  );
});

test("Aujourd'hui branche Donne-le a DABO sur le moteur Household Inbox", () => {
  const source = fs.readFileSync("app/app/page.tsx", "utf8");

  assert.match(
    source,
    /interpretHouseholdInbox/,
    "Aujourd'hui doit interpreter la saisie Household Inbox"
  );

  assert.match(
    source,
    /buildHouseholdInboxHref/,
    "Aujourd'hui doit construire la navigation vers le module propose"
  );

  assert.match(
    source,
    /todayCivilDate/,
    "Aujourd'hui doit interpreter les dates depuis la date civile locale"
  );

  assert.match(
    source,
    /router\.push/,
    "Aujourd'hui doit reutiliser la navigation existante"
  );
});

test("Universal + affiche Donne-le a DABO avec confirmation", () => {
  const source = fs.readFileSync("components/UniversalAddSheet.tsx", "utf8");

  assert.match(
    source,
    /role="dialog"/,
    "Universal + doit rester un dialogue accessible"
  );

  assert.match(
    source,
    /interpretHouseholdInbox/,
    "Universal + doit interpreter la saisie avant navigation"
  );

  assert.match(
    source,
    /continueToForm/,
    "Universal + doit demander une continuation explicite avant navigation"
  );

  assert.match(
    source,
    /household_inbox_continue/,
    "L'utilisateur doit disposer d'une action explicite pour continuer"
  );
});

test("Donne-le a DABO reste mobile-first et accessible au toucher dans Universal +", () => {
  const source = fs.readFileSync("components/UniversalAddSheet.tsx", "utf8");

  assert.match(
    source,
    /htmlFor="universal-inbox"/,
    "Le champ Universal Inbox doit avoir un label associe"
  );

  assert.match(
    source,
    /id="universal-inbox"/,
    "Le textarea doit etre relie a son label"
  );

  assert.match(
    source,
    /dabo-universal-textarea/,
    "Universal + doit reutiliser son composant visuel responsive"
  );

  assert.match(
    source,
    /aria-live="polite"/,
    "La proposition doit etre annoncee sans interrompre brutalement l'utilisateur"
  );
});

test("Donne-le a DABO permet de corriger la destination avant de continuer", () => {
  const source = fs.readFileSync("components/UniversalAddSheet.tsx", "utf8");

  assert.match(
    source,
    /choose\("shopping"\)/,
    "Courses doit etre une destination disponible"
  );

  assert.match(
    source,
    /choose\("task"\)/,
    "Taches doit etre une destination disponible"
  );

  assert.match(
    source,
    /choose\("calendar"\)/,
    "Calendrier doit etre une destination disponible"
  );

  assert.match(
    source,
    /choose\("finance","expense"\)/,
    "Finances doit etre une destination disponible"
  );

  assert.match(
    source,
    /household_inbox_change_destination/,
    "Une proposition doit pouvoir etre corrigee avant navigation"
  );
});

test("Universal + ne pretend pas demander un type Finance qu'il ne propose pas encore", () => {
  const source = fs.readFileSync("components/UniversalAddSheet.tsx", "utf8");

  assert.match(
    source,
    /choose\("finance","expense"\)/,
    "Le choix manuel Finances utilise actuellement le type Depense"
  );

  assert.doesNotMatch(
    source,
    /household_inbox_finance_kind_label/,
    "Universal + ne doit pas laisser croire qu'un selecteur de type Finance est affiche"
  );
});

test("Finances respecte le type explicitement choisi depuis Household Inbox", () => {
  const source = fs.readFileSync("app/app/finances/page.tsx", "utf8");

  assert.doesNotMatch(
    source,
    /inboxPrefill\.kind !== "bill"/,
    "Finances ne doit pas limiter Household Inbox aux seules factures"
  );

  assert.match(
    source,
    /setForm\(inboxPrefill\.kind\)/,
    "Finances doit ouvrir le formulaire explicitement choisi par l'utilisateur"
  );
});

test("Calendrier garde une date utilisable quand Household Inbox n'en fournit pas", () => {
  const source = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");

  assert.match(
    source,
    /setEventDate\(inboxPrefill\.eventDate \|\| todayCivilDate\(\)\)/,
    "Le formulaire Calendrier doit utiliser aujourd'hui si Household Inbox n'a detecte aucune date"
  );
});

test("Universal + garde un choix Finance explicite et non ambigu", () => {
  const source = fs.readFileSync("components/UniversalAddSheet.tsx", "utf8");

  assert.match(
    source,
    /choose\("finance","expense"\)/,
    "Le choix manuel Finances doit transmettre explicitement le type Depense"
  );

  assert.doesNotMatch(
    source,
    /household_inbox_finance_kind_label/,
    "Universal + ne doit pas pretendre afficher un selecteur Finance absent"
  );
});
test("Household Inbox retire demain ponctue du titre d'une tache et conserve l'echeance", async () => {
  const { interpretHouseholdInbox } = await loadInbox();
  const result = interpretHouseholdInbox("Nettoyer la salle de bain demain.", {
    referenceDate: "2026-09-28",
  });

  assert.equal(result.destination, "task");
  assert.equal(result.title, "Nettoyer la salle de bain");
  assert.equal(result.date, "2026-09-29");
});

test("Household Inbox retire demain ponctue du libelle d'une facture et conserve l'echeance", async () => {
  const { interpretHouseholdInbox } = await loadInbox();
  const result = interpretHouseholdInbox("Payer la facture d'Ã©lectricitÃ© demain.", {
    referenceDate: "2026-09-28",
  });

  assert.equal(result.destination, "finance");
  assert.equal(result.financeKind, "bill");
  assert.equal(result.title, "Payer la facture d'Ã©lectricitÃ©");
  assert.equal(result.date, "2026-09-29");
});


test("Household Inbox comprend une date civile numerique explicite pour Calendrier", async () => {
  const { interpretHouseholdInbox, buildHouseholdInboxHref } = await loadInbox();

  const result = interpretHouseholdInbox(
    "Permis de conduire B théorique le 15/10/2026 à 15h.",
    { referenceDate: "2026-10-05" }
  );

  assert.equal(result.destination, "calendar");
  assert.equal(result.title, "Permis de conduire B théorique");
  assert.equal(result.date, "2026-10-15");
  assert.equal(result.time, "15:00");

  assert.equal(
    buildHouseholdInboxHref(result),
    "/app/calendrier?first=1&inbox=1&title=Permis+de+conduire+B+th%C3%A9orique&date=2026-10-15&time=15%3A00"
  );
});

test("Household Inbox structure une facture mensuelle avec montant et prochaine echeance", async () => {
  const { interpretHouseholdInbox, buildHouseholdInboxHref, readFinanceInboxPrefill } = await loadInbox();

  const result = interpretHouseholdInbox(
    "Facture de Proximus 53 € chaque 11 du mois.",
    { referenceDate: "2026-10-05" }
  );

  assert.equal(result.destination, "finance");
  assert.equal(result.financeKind, "bill");
  assert.equal(result.title, "Proximus");
  assert.equal(result.amount, "53");
  assert.equal(result.date, "2026-10-11");
  assert.equal(result.recurrence, "monthly");

  const href = buildHouseholdInboxHref(result);

  assert.equal(
    href,
    "/app/finances?inbox=1&kind=bill&label=Proximus&date=2026-10-11&amount=53&recurrence=monthly"
  );

  assert.deepEqual(
    readFinanceInboxPrefill(new URLSearchParams(href.split("?")[1])),
    {
      kind: "bill",
      label: "Proximus",
      date: "2026-10-11",
      amount: "53",
      recurrence: "monthly",
    }
  );
});

test("Finances applique le montant et la recurrence proposes par Household Inbox", () => {
  const source = fs.readFileSync("app/app/finances/page.tsx", "utf8");

  assert.match(
    source,
    /setAmount\(inboxPrefill\.amount \|\| ""\)/,
    "Finances doit pre-remplir le montant transmis par Household Inbox"
  );

  assert.match(
    source,
    /inboxPrefill\.kind === "bill" && inboxPrefill\.recurrence/,
    "La recurrence Household Inbox ne doit s'appliquer qu'aux factures"
  );

  assert.match(
    source,
    /setBillRecurrence\([\s\S]*?inboxPrefill\.recurrence[\s\S]*?: "once"[\s\S]*?\)/,
    "Finances doit utiliser la recurrence proposee et conserver once comme repli"
  );

  assert.match(
    source,
    /url\.searchParams\.delete\("amount"\)/,
    "Le parametre amount doit etre retire de l'URL apres consommation"
  );

  assert.match(
    source,
    /url\.searchParams\.delete\("recurrence"\)/,
    "Le parametre recurrence doit etre retire de l'URL apres consommation"
  );
});
