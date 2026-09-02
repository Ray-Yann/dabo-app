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
  task: Task
): Promise<boolean> {
  const completedAt = new Date().toISOString();
  const { data: updated, error: completeError } = await supabase
    .from("tasks")
    .update({ status: "done", completed_at: completedAt })
    .eq("id", task.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  // A second click/device must not generate another notification or occurrence.
  if (completeError || !updated) return false;

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

  return true;
}
