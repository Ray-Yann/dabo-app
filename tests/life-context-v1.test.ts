import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveLifeContext,
  hasReducedAvailability,
  isLifeContextActive,
  type MemberLifeContext,
} from "../lib/life-context";

function context(
  overrides: Partial<MemberLifeContext> = {}
): MemberLifeContext {
  return {
    id: "context-1",
    household_id: "household-1",
    member_id: "member-1",
    context_type: "busy_period",
    impact: "reduced",
    starts_on: "2026-09-20",
    ends_on: "2026-09-25",
    created_at: "2026-09-20T08:00:00Z",
    updated_at: "2026-09-20T08:00:00Z",
    ...overrides,
  };
}

test("context is active inside its declared period", () => {
  assert.equal(
    isLifeContextActive(context(), "2026-09-21"),
    true
  );
});

test("start date is inclusive", () => {
  assert.equal(
    isLifeContextActive(context(), "2026-09-20"),
    true
  );
});

test("end date is inclusive", () => {
  assert.equal(
    isLifeContextActive(context(), "2026-09-25"),
    true
  );
});

test("future context is not active", () => {
  assert.equal(
    isLifeContextActive(context(), "2026-09-19"),
    false
  );
});

test("expired context is not active", () => {
  assert.equal(
    isLifeContextActive(context(), "2026-09-26"),
    false
  );
});

test("active context is resolved only for the requested member", () => {
  const contexts = [
    context({
      id: "context-2",
      member_id: "member-2",
    }),
    context(),
  ];

  assert.equal(
    getActiveLifeContext(
      contexts,
      "member-1",
      "2026-09-21"
    )?.id,
    "context-1"
  );
});

test("no active context returns null", () => {
  assert.equal(
    getActiveLifeContext(
      [context()],
      "member-1",
      "2026-10-01"
    ),
    null
  );
});

test("active life context means temporarily reduced availability", () => {
  assert.equal(
    hasReducedAvailability(
      [context({ impact: "very_reduced" })],
      "member-1",
      "2026-09-21"
    ),
    true
  );
});

test("expired life context does not reduce current availability", () => {
  assert.equal(
    hasReducedAvailability(
      [context()],
      "member-1",
      "2026-09-30"
    ),
    false
  );
});
