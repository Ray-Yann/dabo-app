import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildReadableDaboExport } from "../lib/readable-data-export";

const route = fs.readFileSync("app/api/export-data/route.ts", "utf8");
const migration = fs.readFileSync(
  "supabase/migrations/2026-09-22-p3-3-1-readable-export.sql",
  "utf8"
);

test("P3.3.1 exports pending tasks assigned to the authenticated user's memberships", () => {
  assert.match(route, /\.from\("tasks"\)/);
  assert.match(route, /\.eq\("status", "pending"\)/);
  assert.match(route, /\.in\("assigned_to", memberIds\)/);
  assert.match(route, /assignedPending: pendingTasksResult\.data \|\| \[\]/);
});

test("P3.3.1 uses canonical confirmed non-cancelled task contributions", () => {
  assert.match(route, /\.from\("task_contributions"\)/);
  assert.match(route, /\.eq\("performer_status", "confirmed"\)/);
  assert.match(route, /\.is\("cancelled_at", null\)/);
  assert.match(route, /personalContributionIds/);
  assert.match(route, /completedContributions: personalContributions/);
});

test("P3.3.1 scopes contribution participation to the user's own member ids", () => {
  assert.match(route, /\.from\("task_contribution_participants"\)/);
  assert.match(route, /\.in\("member_id", memberIds\)/);
  assert.match(route, /share_weight/);
});

test("P3.3.1 includes the human task name for completed contributions", () => {
  assert.match(route, /contributionTasksResult/);
  assert.match(route, /\.select\("id, household_id, name"\)/);
  assert.match(route, /task_name:/);
  assert.match(route, /task\.id === row\.task_id/);
});

test("P3.3.1 exports only subtasks assigned to or completed by the user", () => {
  assert.match(route, /\.from\("task_subtasks"\)/);
  assert.match(route, /assigned_to\.in\./);
  assert.match(route, /completed_by\.in\./);
  assert.match(route, /memberIds\.includes\(row\.completed_by\)/);
  assert.match(route, /memberIds\.includes\(row\.assigned_to\)/);
});

test("P3.3.1 separates assigned shopping from purchases actually made by the user", () => {
  assert.match(route, /\.eq\("status", "to_buy"\)/);
  assert.match(route, /\.in\("assigned_to", memberIds\)/);
  assert.match(route, /\.eq\("status", "bought"\)/);
  assert.match(route, /\.in\("bought_by_member_id", memberIds\)/);
  assert.match(route, /assignedToBuy: shoppingToBuyResult\.data \|\| \[\]/);
  assert.match(route, /boughtByMe: shoppingBoughtResult\.data \|\| \[\]/);
});

test("P3.3.1 keeps the export scoped and does not expose invite codes", () => {
  assert.doesNotMatch(route, /\.select\("\*"\)/);
  assert.doesNotMatch(route, /invite_code/);
  assert.match(route, /\.eq\("user_id", userId\)/);
  assert.match(route, /"Cache-Control": "no-store"/);
});

test("P3.3.1 grants service_role only SELECT on task_subtasks", () => {
  assert.match(
    migration,
    /grant select on table public\.task_subtasks to service_role;/i
  );
  assert.doesNotMatch(
    migration,
    /\b(insert|update|delete|truncate|references|trigger|all)\b/i
  );
});

const readablePayload = {
  exportedAt: "2026-09-22T12:00:00.000Z",
  account: {
    email: "ray@example.com",
  },
  households: [
    {
      membership: {
        firstName: "Ray",
        role: "admin",
        joinedAt: "2026-01-01T00:00:00.000Z",
      },
      household: {
        name: "Maison <script>alert(1)</script>",
        type: "family",
        countryCode: "BE",
      },
    },
  ],
  personalData: {
    lifeContexts: [
      {
        context_type: "studies",
        impact: "very_reduced",
        starts_on: "2026-09-20",
        ends_on: "2026-09-30",
      },
    ],
    loadPerceptions: [
      {
        perception: "i_carry_more",
        declared_at: "2026-09-21T12:00:00.000Z",
      },
    ],
    personalCalendarEvents: [
      {
        title: 'Rendez-vous <img src=x onerror="alert(1)">',
        event_date: "2026-09-25",
        event_time: "14:00:00",
      },
    ],
    tasks: {
      assignedPending: [
        {
          name: "Sortir les poubelles",
          due_date: "2026-09-23",
        },
      ],
      completedContributions: [
        {
          task_name: "Faire la vaisselle",
          completed_at: "2026-09-21T18:00:00.000Z",
        },
      ],
      subtasks: [
        {
          name: "Nettoyer la table",
          completed_at: null,
        },
      ],
    },
    shopping: {
      assignedToBuy: [
        {
          name: "Lait",
          quantity: "2",
          store_name: "Marché",
        },
      ],
      boughtByMe: [
        {
          name: "Pain",
          bought_at: "2026-09-21T10:00:00.000Z",
          store_name: "Boulangerie",
        },
      ],
    },
  },
};

test("P3.3.1 readable export escapes user-controlled HTML", () => {
  const html = buildReadableDaboExport(readablePayload, "fr");

  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<img src=x onerror=/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
});

test("P3.3.1 readable export contains useful task, shopping and calendar data", () => {
  const html = buildReadableDaboExport(readablePayload, "fr");

  assert.match(html, /Sortir les poubelles/);
  assert.match(html, /Faire la vaisselle/);
  assert.match(html, /Nettoyer la table/);
  assert.match(html, /Lait/);
  assert.match(html, /Pain/);
  assert.match(html, /Rendez-vous/);
});

test("P3.3.1 readable export supports every available DABO language", () => {
  const expectations = [
    ["fr", "Mes données DABO"],
    ["nl", "Mijn DABO-gegevens"],
    ["en", "My DABO data"],
    ["de", "Meine DABO-Daten"],
    ["es", "Mis datos de DABO"],
    ["it", "I miei dati DABO"],
    ["pt", "Os meus dados DABO"],
  ] as const;

  for (const [lang, title] of expectations) {
    const html = buildReadableDaboExport(readablePayload, lang);
    assert.ok(html.includes(title));
    assert.ok(html.includes(`<html lang="${lang}">`));
  }
});

test("P3.3.1 readable export is an autonomous printable HTML document", () => {
  const html = buildReadableDaboExport(readablePayload, "fr");

  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /@media print/);
  assert.match(html, /Mes tâches à faire/);
  assert.match(html, /Mes tâches effectuées/);
  assert.match(html, /Mes courses à acheter/);
  assert.match(html, /Mes achats effectués/);
  assert.match(html, /Mon calendrier personnel/);
});

test("P3.3.1 route exposes readable HTML while preserving JSON as default", () => {
  assert.match(route, /req\.nextUrl\.searchParams\.get\("format"\)/);
  assert.match(route, /req\.nextUrl\.searchParams\.get\("lang"\)/);
  assert.match(route, /requestedFormat === "readable"/);
  assert.match(route, /buildReadableDaboExport\(payload, readableLang\)/);
  assert.match(route, /"Content-Type": "text\/html; charset=utf-8"/);
  assert.match(route, /\.html"/);
  assert.match(route, /"Content-Type": "application\/json; charset=utf-8"/);
  assert.match(route, /\.json"/);
  assert.match(route, /"X-Content-Type-Options": "nosniff"/);
});

test("P3.3.1 settings exposes readable and JSON downloads in the active language", () => {
  const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
  const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

  assert.ok(settings.includes('/api/export-data?format=readable&lang=${encodeURIComponent(lang)}'));
  assert.match(settings, /exportMyData\("readable"\)/);
  assert.match(settings, /exportMyData\("json"\)/);
  assert.match(settings, /settings_export_readable_action/);

  const readableActionCount =
    i18n.match(/settings_export_readable_action:/g)?.length ?? 0;

  assert.equal(readableActionCount, 7);
});


test("P3.3.1 readable export renders life context and load perception", () => {
  const html = buildReadableDaboExport(readablePayload, "fr");

  assert.match(html, /Ma disponibilité/);
  assert.match(html, /Études ou examens/);
  assert.match(html, /Très réduite/);
  assert.match(html, /Mon ressenti/);
  assert.match(html, /J’ai l’impression d’en porter davantage/);
});

test("P3.3.1 readable export translates life context and perception in every supported language", () => {
  const expectations = [
    ["fr", "Études ou examens", "Très réduite", "J’ai l’impression d’en porter davantage"],
    ["nl", "Studie of examens", "Sterk beperkt", "Ik heb het gevoel dat ik meer draag"],
    ["en", "Studies or exams", "Very reduced", "I feel like I’m carrying more"],
    ["de", "Studium oder Prüfungen", "Stark eingeschränkt", "Ich habe das Gefühl, mehr zu tragen"],
    ["es", "Estudios o exámenes", "Muy reducida", "Siento que llevo una mayor carga"],
    ["it", "Studio o esami", "Molto ridotta", "Ho la sensazione di sostenere un carico maggiore"],
    ["pt", "Estudos ou exames", "Muito reduzida", "Sinto que estou a assumir uma carga maior"],
  ] as const;

  for (const [lang, context, impact, perception] of expectations) {
    const html = buildReadableDaboExport(readablePayload, lang);

    assert.ok(html.includes(context), `${lang}: contexte absent`);
    assert.ok(html.includes(impact), `${lang}: impact absent`);
    assert.ok(html.includes(perception), `${lang}: perception absente`);
  }
});
