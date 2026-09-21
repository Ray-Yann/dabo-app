import assert from "node:assert/strict";
import test from "node:test";
import type { Task, TaskSubtask } from "../lib/types";
import type {
  TaskContribution,
  TaskContributionParticipant,
} from "../lib/task-contributions";
import { computeFullLoadMap } from "../lib/full-load-map";

const memberIds = ["alice", "bob"];

function task(
  overrides: Partial<Task> & Pick<Task, "id" | "weight_points">
): Task {
  return {
    household_id: "household",
    routine_id: null,
    name: overrides.id,
    duration_key: null,
    effort_level: null,
    assigned_to: null,
    status: "pending",
    urgent: false,
    due_date: null,
    completed_at: null,
    created_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function subtask(
  overrides: Partial<TaskSubtask> & Pick<TaskSubtask, "id" | "task_id">
): TaskSubtask {
  return {
    household_id: "household",
    name: overrides.id,
    assigned_to: null,
    position: 0,
    completed_at: null,
    completed_by: null,
    created_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function contribution(
  overrides: Partial<TaskContribution> &
    Pick<TaskContribution, "id" | "weight_points">
): TaskContribution {
  return {
    task_id: overrides.id,
    household_id: "household",
    completed_at: "2026-09-20T12:00:00.000Z",
    duration_key: null,
    effort_level: null,
    performer_status: "confirmed",
    cancelled_at: null,
    ...overrides,
  };
}

function participant(
  contributionId: string,
  memberId: string,
  shareWeight = 1
): TaskContributionParticipant {
  return {
    contribution_id: contributionId,
    member_id: memberId,
    share_weight: shareWeight,
  };
}

function compute(input: {
  tasks?: Task[];
  subtasks?: TaskSubtask[];
  contributions?: TaskContribution[];
  participants?: TaskContributionParticipant[];
}) {
  return computeFullLoadMap({
    memberIds,
    tasks: input.tasks || [],
    subtasks: input.subtasks || [],
    contributions: input.contributions || [],
    participants: input.participants || [],
    completedSince: new Date("2026-09-15T00:00:00.000Z"),
    today: "2026-09-21",
  });
}

test("assigns a simple pending task entirely to its member", () => {
  const result = compute({
    tasks: [task({ id: "t1", weight_points: 20, assigned_to: "alice" })],
  });

  assert.equal(result.carriedPoints, 20);
  assert.equal(result.members[0].carriedPoints, 20);
  assert.equal(result.members[1].carriedPoints, 0);
  assert.equal(result.unassignedPoints, 0);
});

test("keeps an unassigned pending task in household load", () => {
  const result = compute({
    tasks: [task({ id: "t1", weight_points: 20 })],
  });

  assert.equal(result.carriedPoints, 20);
  assert.equal(result.unassignedPoints, 20);
});

test("splits pending load by incomplete subtask count", () => {
  const result = compute({
    tasks: [task({ id: "t1", weight_points: 30 })],
    subtasks: [
      subtask({ id: "s1", task_id: "t1", assigned_to: "alice" }),
      subtask({ id: "s2", task_id: "t1", assigned_to: "alice" }),
      subtask({ id: "s3", task_id: "t1", assigned_to: "bob" }),
    ],
  });

  assert.equal(result.carriedPoints, 30);
  assert.equal(result.members[0].carriedPoints, 20);
  assert.equal(result.members[1].carriedPoints, 10);
});

test("puts an unassigned subtask share in unassigned load", () => {
  const result = compute({
    tasks: [task({ id: "t1", weight_points: 30 })],
    subtasks: [
      subtask({ id: "s1", task_id: "t1", assigned_to: "alice" }),
      subtask({ id: "s2", task_id: "t1", assigned_to: "bob" }),
      subtask({ id: "s3", task_id: "t1" }),
    ],
  });

  assert.equal(result.members[0].carriedPoints, 10);
  assert.equal(result.members[1].carriedPoints, 10);
  assert.equal(result.unassignedPoints, 10);
});

test("uses only incomplete subtasks for remaining load", () => {
  const result = compute({
    tasks: [task({ id: "t1", weight_points: 30 })],
    subtasks: [
      subtask({
        id: "s1",
        task_id: "t1",
        assigned_to: "alice",
        completed_at: "2026-09-20T10:00:00.000Z",
        completed_by: "alice",
      }),
      subtask({ id: "s2", task_id: "t1", assigned_to: "bob" }),
      subtask({ id: "s3", task_id: "t1", assigned_to: "bob" }),
    ],
  });

  assert.equal(result.carriedPoints, 20);
  assert.equal(result.members[0].carriedPoints, 0);
  assert.equal(result.members[1].carriedPoints, 20);
});

test("does not count a pending task whose subtasks are all complete", () => {
  const result = compute({
    tasks: [task({ id: "t1", weight_points: 30 })],
    subtasks: [
      subtask({
        id: "s1",
        task_id: "t1",
        assigned_to: "alice",
        completed_at: "2026-09-20T10:00:00.000Z",
      }),
    ],
  });

  assert.equal(result.carriedPoints, 0);
});

test("treats an inactive assignee as unassigned", () => {
  const result = compute({
    tasks: [
      task({
        id: "t1",
        weight_points: 15,
        assigned_to: "former-member",
      }),
    ],
  });

  assert.equal(result.unassignedPoints, 15);
});

test("tracks overdue load without double counting it", () => {
  const result = compute({
    tasks: [
      task({
        id: "t1",
        weight_points: 20,
        assigned_to: "alice",
        due_date: "2026-09-20",
      }),
    ],
  });

  assert.equal(result.carriedPoints, 20);
  assert.equal(result.overduePoints, 20);
  assert.equal(result.members[0].carriedPoints, 20);
  assert.equal(result.members[0].overduePoints, 20);
});

test("today is not overdue", () => {
  const result = compute({
    tasks: [
      task({
        id: "t1",
        weight_points: 20,
        assigned_to: "alice",
        due_date: "2026-09-21",
      }),
    ],
  });

  assert.equal(result.overduePoints, 0);
});

test("tracks unassigned overdue load separately", () => {
  const result = compute({
    tasks: [
      task({
        id: "t1",
        weight_points: 25,
        due_date: "2026-09-19",
      }),
    ],
  });

  assert.equal(result.unassignedPoints, 25);
  assert.equal(result.overduePoints, 25);
  assert.equal(result.unassignedOverduePoints, 25);
});

test("ignores done tasks in current carried load", () => {
  const result = compute({
    tasks: [
      task({
        id: "t1",
        weight_points: 20,
        assigned_to: "alice",
        status: "done",
      }),
    ],
  });

  assert.equal(result.carriedPoints, 0);
});

test("counts confirmed recent contributions as completed load", () => {
  const result = compute({
    contributions: [contribution({ id: "c1", weight_points: 30 })],
    participants: [participant("c1", "alice")],
  });

  assert.equal(result.completedPoints, 30);
  assert.equal(result.members[0].completedPoints, 30);
});

test("splits completed load using canonical share weights", () => {
  const result = compute({
    contributions: [contribution({ id: "c1", weight_points: 30 })],
    participants: [
      participant("c1", "alice", 2),
      participant("c1", "bob", 1),
    ],
  });

  assert.equal(result.completedPoints, 30);
  assert.equal(result.members[0].completedPoints, 20);
  assert.equal(result.members[1].completedPoints, 10);
});

test("ignores unknown and cancelled contributions", () => {
  const result = compute({
    contributions: [
      contribution({
        id: "c1",
        weight_points: 20,
        performer_status: "unknown",
      }),
      contribution({
        id: "c2",
        weight_points: 20,
        cancelled_at: "2026-09-20T13:00:00.000Z",
      }),
    ],
    participants: [
      participant("c1", "alice"),
      participant("c2", "alice"),
    ],
  });

  assert.equal(result.completedPoints, 0);
});

test("ignores contributions before the requested period", () => {
  const result = compute({
    contributions: [
      contribution({
        id: "c1",
        weight_points: 20,
        completed_at: "2026-09-14T23:59:59.000Z",
      }),
    ],
    participants: [participant("c1", "alice")],
  });

  assert.equal(result.completedPoints, 0);
});

test("does not attribute completed load to former household members", () => {
  const result = compute({
    contributions: [contribution({ id: "c1", weight_points: 20 })],
    participants: [participant("c1", "former-member")],
  });

  assert.equal(result.completedPoints, 0);
  assert.equal(result.members[0].completedPoints, 0);
  assert.equal(result.members[1].completedPoints, 0);
});

test("does not multiply task points when several subtasks exist", () => {
  const result = compute({
    tasks: [task({ id: "t1", weight_points: 40 })],
    subtasks: [
      subtask({ id: "s1", task_id: "t1", assigned_to: "alice" }),
      subtask({ id: "s2", task_id: "t1", assigned_to: "bob" }),
      subtask({ id: "s3", task_id: "t1" }),
      subtask({ id: "s4", task_id: "t1", assigned_to: "alice" }),
    ],
  });

  const distributed =
    result.members.reduce((sum, member) => sum + member.carriedPoints, 0) +
    result.unassignedPoints;

  assert.equal(result.carriedPoints, 40);
  assert.equal(distributed, 40);
});
