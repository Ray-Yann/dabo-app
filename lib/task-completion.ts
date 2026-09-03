import { SupabaseClient } from "@supabase/supabase-js";
import { Member, Routine, Task } from "@/lib/types";
import { computeNextDueDate, todayCivilDate } from "@/lib/utils";
import { notifyHousehold } from "@/lib/notifications";

type RecurrenceContext = {
  supabase: SupabaseClient;
  householdId: string;
  members: Member[];
};

type CompleteTaskContext = RecurrenceContext & {
  me: Member;
};

export type TaskCompletionResult =
  | { ok: true }
  | { ok: false; reason: "already_completed" | "contribution_error" };

export async function insertNextRecurringOccurrence(
  { supabase, householdId, members }: RecurrenceContext,
  task: Task,
  routine: Routine,
  referenceDate: string = todayCivilDate()
): Promise<void> {
  if (!routine.active) return;

  const sortedMembers = [...members].sort((a, b) => a.rotation_order - b.rotation_order);
  const currentIdx = sortedMembers.findIndex((member) => member.id === routine.last_assigned_member);
  const nextMember = sortedMembers.length
    ? sortedMembers[(currentIdx + 1 + sortedMembers.length) % sortedMembers.length]
    : undefined;

  const baseDue = task.due_date || routine.anchor_date || referenceDate;
  const nextDue = computeNextDueDate(
    baseDue,
    referenceDate,
    routine.frequency,
    routine.custom_days || [],
    routine.anchor_date || baseDue
  );

  const { error } = await supabase.from("tasks").insert({
    household_id: householdId,
    routine_id: routine.id,
    name: routine.name,
    weight_points: routine.weight_points,
    duration_key: routine.duration_key ?? task.duration_key,
    effort_level: routine.effort_level ?? task.effort_level,
    assigned_to: nextMember?.id || null,
    due_date: nextDue,
  });

  // 23505 = another device already created the same pending occurrence.
  if (error && error.code !== "23505") throw error;

  if (!error && nextMember) {
    await supabase
      .from("routines")
      .update({ last_assigned_member: nextMember.id })
      .eq("id", routine.id);
  }
}

export async function completeHouseholdTask(
  { supabase, householdId, members, me }: CompleteTaskContext,
  task: Task,
  performerMemberIds: string[] = [me.id]
): Promise<TaskCompletionResult> {
  const completedAt = new Date().toISOString();
  const uniquePerformerIds = [...new Set(performerMemberIds)].filter(Boolean);

  if (uniquePerformerIds.length === 0) {
    return { ok: false, reason: "contribution_error" };
  }

  const { data: updated, error: completeError } = await supabase
    .from("tasks")
    .update({ status: "done", completed_at: completedAt })
    .eq("id", task.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  // A second click/device must not generate another notification or occurrence.
  if (completeError || !updated) return { ok: false, reason: "already_completed" };

  // Contribution writes happen before notifications/recurrence. If one of them
  // fails, put the task back to pending. An unfinished contribution remains
  // "unknown" and can be resumed safely on a later attempt.
  try {
    let contributionId: string | null = null;

    const { data: existingContribution } = await supabase
      .from("task_contributions")
      .select("id, performer_status")
      .eq("task_id", task.id)
      .maybeSingle();

    if (existingContribution?.id) {
      contributionId = existingContribution.id;
      const { error: refreshError } = await supabase
        .from("task_contributions")
        .update({
          completed_at: completedAt,
          duration_key: task.duration_key,
          effort_level: task.effort_level,
          weight_points: task.weight_points,
          performer_status: "unknown",
          cancelled_at: null,
          updated_by: me.id,
        })
        .eq("id", contributionId);
      if (refreshError) throw refreshError;
    } else {
      const { data: contribution, error: contributionError } = await supabase
        .from("task_contributions")
        .insert({
          task_id: task.id,
          household_id: householdId,
          completed_at: completedAt,
          duration_key: task.duration_key,
          effort_level: task.effort_level,
          weight_points: task.weight_points,
          performer_status: "unknown",
          created_by: me.id,
          updated_by: me.id,
        })
        .select("id")
        .single();
      if (contributionError || !contribution) throw contributionError || new Error("Contribution non créée");
      contributionId = contribution.id;
    }

    const { data: existingParticipants, error: participantReadError } = await supabase
      .from("task_contribution_participants")
      .select("member_id")
      .eq("contribution_id", contributionId);
    if (participantReadError) throw participantReadError;

    const existingIds = new Set((existingParticipants || []).map((row: { member_id: string }) => row.member_id));
    const missingIds = uniquePerformerIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      const { error: participantError } = await supabase
        .from("task_contribution_participants")
        .insert(missingIds.map((memberId) => ({
          contribution_id: contributionId,
          member_id: memberId,
          share_weight: 1,
        })));
      if (participantError) throw participantError;
    }

    const { error: confirmError } = await supabase
      .from("task_contributions")
      .update({ performer_status: "confirmed", updated_by: me.id })
      .eq("id", contributionId);
    if (confirmError) throw confirmError;
  } catch (error) {
    console.error("DABO contribution completion failed", error);
    await supabase
      .from("tasks")
      .update({ status: "pending", completed_at: null })
      .eq("id", task.id)
      .eq("completed_at", completedAt);
    return { ok: false, reason: "contribution_error" };
  }

  void notifyHousehold(supabase, householdId, me.id, "notif_task_done", {
    name: me.first_name,
    task: task.name,
  });

  if (task.routine_id) {
    const { data } = await supabase
      .from("routines")
      .select("*")
      .eq("id", task.routine_id)
      .maybeSingle();
    const routine = data as Routine | null;

    if (routine?.active) {
      await insertNextRecurringOccurrence(
        { supabase, householdId, members },
        task,
        routine,
        todayCivilDate()
      );
    }
  }

  return { ok: true };
}
