import type { Task, TaskSubtask } from "@/lib/types";
import {
  computeContributionMemberPoints,
  type TaskContribution,
  type TaskContributionParticipant,
} from "@/lib/task-contributions";

export type FullLoadMemberSnapshot = {
  memberId: string;
  completedPoints: number;
  carriedPoints: number;
  overduePoints: number;
};

export type FullLoadMap = {
  members: FullLoadMemberSnapshot[];
  completedPoints: number;
  carriedPoints: number;
  unassignedPoints: number;
  overduePoints: number;
  unassignedOverduePoints: number;
};

export type FullLoadMapInput = {
  memberIds: string[];
  tasks: Task[];
  subtasks: TaskSubtask[];
  contributions: TaskContribution[];
  participants: TaskContributionParticipant[];
  completedSince: Date;
  today: string;
};

type PendingShare = {
  memberId: string | null;
  ratio: number;
};

function pendingShares(
  task: Task,
  subtasks: TaskSubtask[],
  activeMemberIds: Set<string>
): PendingShare[] {
  const taskSubtasks = subtasks.filter(
    (subtask) => subtask.task_id === task.id
  );

  if (taskSubtasks.length === 0) {
    return [{
      memberId:
        task.assigned_to && activeMemberIds.has(task.assigned_to)
          ? task.assigned_to
          : null,
      ratio: 1,
    }];
  }

  const incompleteSubtasks = taskSubtasks.filter(
    (subtask) => !subtask.completed_at
  );

  const counts = new Map<string | null, number>();

  for (const subtask of incompleteSubtasks) {
    const memberId =
      subtask.assigned_to && activeMemberIds.has(subtask.assigned_to)
        ? subtask.assigned_to
        : null;

    counts.set(memberId, (counts.get(memberId) || 0) + 1);
  }

  const total = taskSubtasks.length;

  return [...counts.entries()].map(([memberId, count]) => ({
    memberId,
    ratio: count / total,
  }));
}

export function computeFullLoadMap(input: FullLoadMapInput): FullLoadMap {
  const activeMemberIds = new Set(input.memberIds);

  const members = new Map<string, FullLoadMemberSnapshot>(
    input.memberIds.map((memberId) => [
      memberId,
      {
        memberId,
        completedPoints: 0,
        carriedPoints: 0,
        overduePoints: 0,
      },
    ])
  );

  let completedPoints = 0;
  let carriedPoints = 0;
  let unassignedPoints = 0;
  let overduePoints = 0;
  let unassignedOverduePoints = 0;

  const completedByMember = computeContributionMemberPoints(
    input.memberIds,
    input.contributions,
    input.participants,
    input.completedSince
  );

  for (const [memberId, points] of completedByMember) {
    const member = members.get(memberId);
    if (!member) continue;

    member.completedPoints = points;
    completedPoints += points;
  }

  const subtasksByTask = new Map<string, TaskSubtask[]>();

  for (const subtask of input.subtasks) {
    const rows = subtasksByTask.get(subtask.task_id) || [];
    rows.push(subtask);
    subtasksByTask.set(subtask.task_id, rows);
  }

  for (const task of input.tasks) {
    if (task.status !== "pending") continue;

    const taskPoints = Math.max(0, Number(task.weight_points) || 0);
    if (taskPoints === 0) continue;

    const taskSubtasks = subtasksByTask.get(task.id) || [];
    const incompleteSubtasks = taskSubtasks.filter(
      (subtask) => !subtask.completed_at
    );

    if (taskSubtasks.length > 0 && incompleteSubtasks.length === 0) {
      continue;
    }

    const shares = pendingShares(task, taskSubtasks, activeMemberIds);
    const isOverdue = Boolean(task.due_date && task.due_date < input.today);

    const remainingRatio = shares.reduce((sum, share) => sum + share.ratio, 0);
    const remainingPoints = taskPoints * remainingRatio;

    carriedPoints += remainingPoints;
    if (isOverdue) overduePoints += remainingPoints;

    for (const share of shares) {
      const points = taskPoints * share.ratio;

      if (share.memberId) {
        const member = members.get(share.memberId);
        if (member) {
          member.carriedPoints += points;
          if (isOverdue) member.overduePoints += points;
        }
      } else {
        unassignedPoints += points;
        if (isOverdue) unassignedOverduePoints += points;
      }
    }
  }

  return {
    members: input.memberIds.map((memberId) => members.get(memberId)!),
    completedPoints,
    carriedPoints,
    unassignedPoints,
    overduePoints,
    unassignedOverduePoints,
  };
}
