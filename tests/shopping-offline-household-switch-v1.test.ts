import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("shopping data is scoped to the household that actually loaded it", () => {
  assert.ok(
    source.includes(
      'const [loadedShoppingHouseholdId, setLoadedShoppingHouseholdId] = useState<string | null>(null);'
    )
  );

  assert.ok(
    source.includes(
      'const shoppingDataMatchesHousehold = loadedShoppingHouseholdId === household?.id;'
    )
  );

  assert.ok(
    source.includes(
      'const hasCurrentOfflineSnapshot = shoppingDataMatchesHousehold && hasOfflineSnapshot;'
    )
  );

  assert.ok(
    !source.includes("setHasOfflineSnapshot(false);")
  );

  assert.ok(
    !source.includes("setItems([]);")
  );
});
