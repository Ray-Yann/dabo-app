import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/app/foyer/page.tsx", "utf8");

test("invite copy success is announced to assistive technology", () => {
  assert.match(source, /role="status" aria-live="polite"/);
  assert.match(source, /copied \? t\("copied"\)/);
});

test("invite copy feedback timer is cleared on close and unmount", () => {
  assert.match(source, /copiedTimerRef = useRef/);
  assert.match(source, /if \(!inviteOpen\) \{/);
  assert.match(source, /clearTimeout\(copiedTimerRef\.current\)/);
  assert.match(source, /useEffect\(\(\) => \(\) =>/);
});

test("copy and share reuse a single feedback mechanism", () => {
  assert.equal((source.match(/markInviteCopied\(\);/g) ?? []).length, 2);
});
