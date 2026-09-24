import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("lib/server-event-notifications.ts", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Event Notifications V1 n'utilise plus le titre historique Dabo", () => {
  assert.doesNotMatch(source, /title:\s*"Dabo"/);
});

test("Event Notifications V1 utilise un titre événementiel traduit", () => {
  assert.match(
    source,
    /translateWithParams\([^\n]*"notif_event_title"/
  );
  assert.match(source, /JSON\.stringify\(\{ title, body, url \}\)/);
});

test("Event Notifications V1 traduit son titre dans les sept catalogues", () => {
  const matches = i18n.match(/notif_event_title:/g) || [];
  assert.equal(matches.length, 7);
});
