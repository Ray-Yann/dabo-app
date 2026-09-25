import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("shopping data is scoped to the currently loaded household", () => {
  assert.ok(
    source.includes(
      "const shoppingDataMatchesHousehold = loadedShoppingHouseholdId === household?.id;"
    )
  );

  assert.ok(
    source.includes(
      "const visibleItems = shoppingDataMatchesHousehold ? items : [];"
    )
  );
});

test("to-buy rendering derives from household-scoped items", () => {
  assert.ok(
    source.includes(
      'const toBuy = [...visibleItems.filter((i) => i.status === "to_buy")]'
    )
  );
});

test("bought-item state derives from household-scoped items", () => {
  assert.ok(
    source.includes(
      'const hasBoughtItems = visibleItems.some((i) => i.status === "bought");'
    )
  );

  assert.ok(
    source.includes(
      "const allBought = visibleItems"
    )
  );
});

test("shopping suggestions never use stale items from another household", () => {
  assert.ok(
    source.includes(
      "generateShoppingSuggestions({ items: visibleItems, preferences: suggestionPreferences, today: todayCivilDate() })"
    )
  );
});

test("household scoping is established before visible shopping lists are derived", () => {
  const scopePosition = source.indexOf(
    "const shoppingDataMatchesHousehold = loadedShoppingHouseholdId === household?.id;"
  );

  const visiblePosition = source.indexOf(
    "const visibleItems = shoppingDataMatchesHousehold ? items : [];"
  );

  const toBuyPosition = source.indexOf(
    'const toBuy = [...visibleItems.filter((i) => i.status === "to_buy")]'
  );

  assert.ok(scopePosition >= 0);
  assert.ok(visiblePosition > scopePosition);
  assert.ok(toBuyPosition > visiblePosition);
});
