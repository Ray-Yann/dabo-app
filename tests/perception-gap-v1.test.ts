import assert from "node:assert/strict";
import test from "node:test";

import {
  computePerceptionGap,
  type PerceptionGapInput,
} from "../lib/perception-gap";

function input(
  overrides: Partial<PerceptionGapInput> = {}
): PerceptionGapInput {
  return {
    perception: "balanced",
    memberId: "member-1",
    memberShares: [
      { memberId: "member-1", percentage: 50 },
      { memberId: "member-2", percentage: 50 },
    ],
    balanceLevel: "healthy",
    ...overrides,
  };
}

test("missing perception is not comparable", () => {
  assert.equal(
    computePerceptionGap(input({ perception: null })),
    "not_comparable"
  );
});

test("unclear perception is not comparable", () => {
  assert.equal(
    computePerceptionGap(input({ perception: "unclear" })),
    "not_comparable"
  );
});

test("building factual state is not comparable", () => {
  assert.equal(
    computePerceptionGap(input({ balanceLevel: "building" })),
    "not_comparable"
  );
});

test("solo household is not comparable", () => {
  assert.equal(
    computePerceptionGap(
      input({
        memberShares: [
          { memberId: "member-1", percentage: 100 },
        ],
      })
    ),
    "not_comparable"
  );
});

test("balanced perception aligns with healthy observed balance", () => {
  assert.equal(
    computePerceptionGap(input()),
    "aligned"
  );
});

test("balanced perception is more balanced than concentrated observed load", () => {
  assert.equal(
    computePerceptionGap(
      input({
        memberShares: [
          { memberId: "member-1", percentage: 70 },
          { memberId: "member-2", percentage: 30 },
        ],
        balanceLevel: "marked",
      })
    ),
    "perceives_more_balanced"
  );
});

test("feeling that I carry more aligns when my observed share is highest", () => {
  assert.equal(
    computePerceptionGap(
      input({
        perception: "i_carry_more",
        memberShares: [
          { memberId: "member-1", percentage: 70 },
          { memberId: "member-2", percentage: 30 },
        ],
        balanceLevel: "marked",
      })
    ),
    "aligned"
  );
});

test("feeling that I carry more is more concentrated than healthy observed balance", () => {
  assert.equal(
    computePerceptionGap(
      input({
        perception: "i_carry_more",
      })
    ),
    "perceives_more_concentrated"
  );
});

test("feeling that another carries more aligns when another observed share is highest", () => {
  assert.equal(
    computePerceptionGap(
      input({
        perception: "other_carries_more",
        memberShares: [
          { memberId: "member-1", percentage: 30 },
          { memberId: "member-2", percentage: 70 },
        ],
        balanceLevel: "marked",
      })
    ),
    "aligned"
  );
});

test("opposite perception and observed concentration remain descriptively different", () => {
  assert.equal(
    computePerceptionGap(
      input({
        perception: "i_carry_more",
        memberShares: [
          { memberId: "member-1", percentage: 30 },
          { memberId: "member-2", percentage: 70 },
        ],
        balanceLevel: "marked",
      })
    ),
    "different"
  );
});

test("missing current member in factual shares is not comparable", () => {
  assert.equal(
    computePerceptionGap(
      input({
        memberId: "member-3",
      })
    ),
    "not_comparable"
  );
});
