import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("online state is initialized from the browser without a synchronous effect update", () => {
  assert.ok(
    source.includes(
      'const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);'
    )
  );

  assert.ok(
    !source.includes("setIsOnline(navigator.onLine);")
  );
});

test("network effect keeps event-driven online and offline updates", () => {
  assert.ok(source.includes('window.addEventListener("online", handleOnline)'));
  assert.ok(source.includes('window.addEventListener("offline", handleOffline)'));
  assert.ok(source.includes("setIsOnline(true);"));
  assert.ok(source.includes("setIsOnline(false);"));
});
