import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("household shopping load is deferred instead of invoked synchronously inside the effect", () => {
  assert.ok(
    source.includes(
      'const timer = window.setTimeout(() => void loadItems(), 0);'
    )
  );

  assert.ok(
    source.includes(
      'return () => window.clearTimeout(timer);'
    )
  );

  assert.ok(
    !source.includes(
      `useEffect(() => {
    if (household) void loadItems();
  }, [household]);`
    )
  );
});
