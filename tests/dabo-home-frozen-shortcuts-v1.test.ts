import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const home = fs.readFileSync("app/app/page.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");

// Product decision (17 October 2026): Aujourd'hui is a frozen visual reference.
// Adding a module elsewhere must not silently replace the six primary shortcuts.
test("Aujourd'hui retains the six validated primary shortcuts in order", () => {
  const section = home.match(/const shortcutItems = \[([\s\S]*?)\n  \];/);
  assert.ok(section, "The primary shortcut list must exist");
  const ids = [...section[1].matchAll(/\{ id: "([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids, ["tasks", "planning", "shopping", "finance", "balance", "loba"]);
});

test("Primary shortcuts use recognizable, distinct functional pictograms", () => {
  const section = home.match(/const shortcutItems = \[([\s\S]*?)\n  \];/);
  assert.ok(section);
  const expected: Record<string, string> = {
    tasks: "ListTodo", planning: "CalendarDays", shopping: "ShoppingBag",
    finance: "WalletCards", balance: "Scale", loba: "Sparkles",
  };
  for (const [id, icon] of Object.entries(expected)) {
    assert.match(section[1], new RegExp(`id: "${id}"[^\\n]*icon: ${icon}`));
  }
  assert.doesNotMatch(section[1], /id: "(?:contacts?|meals?)"/);
});

test("Aujourd'hui preserves its editorial structure and bottom navigation", () => {
  for (const marker of ["dabo-premium-topbar", "dabo-v3-hero", "dabo-v32-shortcuts", "dabo-v3-insight"]) {
    assert.ok(home.includes(marker), `Missing validated home marker: ${marker}`);
  }
  assert.match(css, /\.dabo-today-v2 \.dabo-v32-shortcuts\{display:grid/);
  const layout = fs.readFileSync("app/app/layout.tsx", "utf8");
  assert.match(layout, /AppShell/);
});
