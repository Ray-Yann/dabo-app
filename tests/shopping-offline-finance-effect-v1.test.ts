import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("shopping finance polling is disabled while Courses is offline", () => {
  assert.ok(
    source.includes(
      'if (!household || offlineShoppingMode) return;'
    )
  );
});

test("initial shopping finance prompt load is deferred outside the effect body", () => {
  assert.ok(
    source.includes(
      'const initialFinanceTimer = window.setTimeout(() => void loadShoppingFinancePrompt(), 0);'
    )
  );

  assert.ok(
    source.includes(
      'window.clearTimeout(initialFinanceTimer);'
    )
  );

  assert.ok(
    !source.includes(
      `if (!household) return;
    void loadShoppingFinancePrompt();
    const timer = window.setInterval`
    )
  );
});

test("online shopping finance polling remains active every minute", () => {
  assert.ok(
    source.includes(
      'window.setInterval(() => void loadShoppingFinancePrompt(), 60_000)'
    )
  );
});
