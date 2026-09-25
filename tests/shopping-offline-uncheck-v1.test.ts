import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("offline Courses exposes bought items for correction", () => {
  assert.ok(
    source.includes(
      '{offlineShoppingMode && hasCurrentOfflineSnapshot && allBought.length > 0 && ('
    )
  );

  assert.ok(
    source.includes(
      '{allBought.map((item) => ('
    )
  );
});

test("offline bought item can be restored through canonical toggle logic", () => {
  assert.ok(
    source.includes(
      'onClick={() => toggle(item)}'
    )
  );

  assert.ok(
    source.includes(
      'aria-label={t("courses_restore_to_buy")}'
    )
  );
});

test("offline bought correction does not expose online-only item actions", () => {
  assert.ok(
    source.includes(
      'data-offline-bought-items="true"'
    )
  );

  const offlineSectionStart = source.indexOf(
    'data-offline-bought-items="true"'
  );

  assert.ok(offlineSectionStart >= 0);

  const offlineSection = source.slice(
    offlineSectionStart,
    source.indexOf("</section>", offlineSectionStart) + "</section>".length
  );

  assert.ok(!offlineSection.includes("setActionItemId"));
  assert.ok(!offlineSection.includes("startEdit"));
  assert.ok(!offlineSection.includes("openComments"));
});

test("offline bought correction has a dedicated translated label", () => {
  assert.ok(source.includes('t("courses_offline_bought")'));
  assert.ok(source.includes('t("courses_restore_to_buy")'));
});
