"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { EmptyState } from "@/components/EmptyState";
import { Task, Comment, Routine, RoutineFrequency, DURATION_OPTIONS, EFFORT_OPTIONS, computeTaskPoints } from "@/lib/types";
import { todayCivilDate } from "@/lib/utils";
import { notifyHousehold } from "@/lib/notifications";
import { completeHouseholdTask, insertNextRecurringOccurrence } from "@/lib/task-completion";
import { Check, Trash2, Repeat, MessageCircle, X, Pencil, Search } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { useT } from "@/lib/language-context";


type TaskForm = { name: string; durationKey: string; effortKey: string; assignedTo: string; recurrence: "none" | RoutineFrequency; customDays: number[]; urgent: boolean; dueDate: string };
const EMPTY_FORM: TaskForm = { name: "", durationKey: DURATION_OPTIONS[2].key, effortKey: "moyen", assignedTo: "", recurrence: "none", customDays: [], urgent: false, dueDate: "" };
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function TaskFormFields({
  form,
  setForm,
  members,
  editingRecurring,
  t,
}: {
  form: TaskForm;
  setForm: (f: TaskForm) => void;
  members: { id: string; first_name: string }[];
  editingRecurring?: boolean;
  t: (key: string) => string;
}) {
  return (
    <>
      <div>
        <label className="text-sm font-medium text-ink block mb-1.5">{t("task_form_main_label")}</label>
        <input autoFocus placeholder={t("task_name_placeholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-ink" />
      </div>

      <div className="pt-1">
        <div className="text-[11px] uppercase tracking-wide text-muted font-semibold mb-2">{t("task_form_for_task")}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink">
            <option value="">{t("unassigned")}</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.first_name}</option>)}
          </select>
          <div>
            <input aria-label={form.recurrence !== "none" ? t("due_date_required") : t("due_date_optional")} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
            <div className="text-[10px] text-muted mt-1 px-1">{form.recurrence !== "none" ? t("due_date_required") : t("due_date_optional")}</div>
          </div>
        </div>
      </div>

      <div className="pt-1">
        <div className="text-[11px] uppercase tracking-wide text-muted font-semibold mb-2">{t("task_form_if_needed")}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select value={form.durationKey} onChange={(e) => setForm({ ...form, durationKey: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink">
            {DURATION_OPTIONS.map((d) => <option key={d.key} value={d.key}>{t("task_duration")} · {d.label}</option>)}
          </select>
          <select value={form.effortKey} onChange={(e) => setForm({ ...form, effortKey: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink">
            {EFFORT_OPTIONS.map((e) => <option key={e.key} value={e.key}>{t("effort_label")} · {e.label}</option>)}
          </select>
          <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as TaskForm["recurrence"], customDays: e.target.value === "custom" ? form.customDays : [] })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink">
            {!editingRecurring && <option value="none">{t("recurrence_none")}</option>}
            <option value="daily">{t("recurrence_daily")}</option>
            <option value="weekly">{t("recurrence_weekly")}</option>
            <option value="biweekly">{t("recurrence_biweekly")}</option>
            <option value="monthly">{t("recurrence_monthly")}</option>
            <option value="yearly">{t("recurrence_yearly")}</option>
            <option value="custom">{t("recurrence_custom")}</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-ink border border-border rounded-xl px-3 py-2">
            <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} />
            {t("mark_urgent_f")}
          </label>
        </div>
      </div>

      {form.recurrence === "custom" && (
        <div>
          <div className="text-xs text-muted mb-2">{t("recurrence_choose_days")}</div>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day, index) => {
              const selected = form.customDays.includes(index);
              return <button key={day} type="button" onClick={() => setForm({ ...form, customDays: selected ? form.customDays.filter((d) => d !== index) : [...form.customDays, index].sort() })} className={`px-2.5 py-1.5 rounded-lg text-xs border ${selected ? "bg-ink text-paper border-ink" : "border-border text-ink"}`}>{t(`weekday_${day}`)}</button>;
            })}
          </div>
        </div>
      )}
    </>
  );
}

export default function TasksPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<TaskForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(EMPTY_FORM);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [showAllDone, setShowAllDone] = useState(false);
  const [doneSearch, setDoneSearch] = useState("");
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [recurrenceDeleteTarget, setRecurrenceDeleteTarget] = useState<Task | null>(null);
  const [showFloatingAdd, setShowFloatingAdd] = useState(false);
  const [addedConfirmation, setAddedConfirmation] = useState(false);
  const topAddRef = useRef<HTMLButtonElement | null>(null);

  async function loadTasks() {
    if (!household) return;
    const [{ data }, { data: routineData }] = await Promise.all([
      supabase.from("tasks").select("*").eq("household_id", household.id).order("created_at", { ascending: false }),
      supabase.from("routines").select("*").eq("household_id", household.id),
    ]);
    setTasks((data as Task[]) || []);
    setRoutines((routineData as Routine[]) || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (household) loadTasks();
  }, [household]);

  useEffect(() => {
    const button = topAddRef.current;
    if (!button || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setShowFloatingAdd(!entry.isIntersecting), { threshold: 0 });
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  async function addTask() {
    if (!addForm.name.trim() || !household) return;
    if (addForm.recurrence !== "none" && !addForm.dueDate) { alert(t("recurrence_due_required")); return; }
    if (addForm.recurrence === "custom" && addForm.customDays.length === 0) { alert(t("recurrence_days_required")); return; }
    const points = computeTaskPoints(addForm.durationKey, addForm.effortKey);
    let routineId: string | null = null;
    const finalAssignee = addForm.assignedTo || null;

    if (addForm.recurrence !== "none") {
      const { data: routine } = await supabase
        .from("routines")
        .insert({
          household_id: household.id,
          name: addForm.name.trim(),
          weight_points: points,
          frequency: addForm.recurrence,
          custom_days: addForm.recurrence === "custom" ? addForm.customDays : null,
          duration_key: addForm.durationKey,
          effort_level: addForm.effortKey,
          anchor_date: addForm.dueDate,
          last_assigned_member: finalAssignee,
        })
        .select()
        .single();
      routineId = routine?.id || null;
    }

    await supabase.from("tasks").insert({
      household_id: household.id,
      routine_id: routineId,
      name: addForm.name.trim(),
      weight_points: points,
      duration_key: addForm.durationKey,
      effort_level: addForm.effortKey,
      assigned_to: finalAssignee,
      urgent: addForm.urgent,
      due_date: addForm.dueDate || null,
    });
    if (addForm.urgent && me) {
      notifyHousehold(supabase, household.id, me.id, "notif_task_urgent", { name: me.first_name, task: addForm.name.trim() });
    }
    setAddForm(EMPTY_FORM);
    setShowAdd(false);
    setAddedConfirmation(true);
    window.setTimeout(() => setAddedConfirmation(false), 2200);
    loadTasks();
  }

  function startEdit(task: Task) {
    setOpenComments(null);
    setEditingId(task.id);
    // Si la tâche a été créée avant ce changement (pas de durée/effort
    // enregistrés), on estime la durée la plus proche pour ne pas repartir
    // de zéro à l'édition — sans jamais toucher au poids déjà existant tant
    // que la personne n'a pas explicitement enregistré une modification.
    const fallbackDuration = DURATION_OPTIONS.reduce((closest, d) =>
      Math.abs(d.points - task.weight_points) < Math.abs(closest.points - task.weight_points) ? d : closest
    );
    const routine = task.routine_id ? routines.find((item) => item.id === task.routine_id) : null;
    setEditForm({
      name: task.name,
      durationKey: task.duration_key || fallbackDuration.key,
      effortKey: task.effort_level || "faible",
      assignedTo: task.assigned_to || "",
      recurrence: routine?.frequency || "none",
      customDays: routine?.custom_days || [],
      urgent: task.urgent,
      dueDate: task.due_date || "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) return;
    const editedTask = tasks.find((task) => task.id === id);
    const existingRoutine = editedTask?.routine_id ? routines.find((routine) => routine.id === editedTask.routine_id) : null;
    if (existingRoutine && editForm.recurrence === "custom" && editForm.customDays.length === 0) {
      alert(t("recurrence_days_required"));
      return;
    }
    const points = computeTaskPoints(editForm.durationKey, editForm.effortKey);
    const wasUrgent = editedTask?.urgent || false;
    await supabase.from("tasks").update({
      name: editForm.name.trim(),
      weight_points: points,
      duration_key: editForm.durationKey,
      effort_level: editForm.effortKey,
      assigned_to: editForm.assignedTo || null,
      urgent: editForm.urgent,
      due_date: editForm.dueDate || null,
    }).eq("id", id);
    if (editedTask?.routine_id && existingRoutine) {
      const recurrenceChanged = existingRoutine.frequency !== editForm.recurrence
        || JSON.stringify(existingRoutine.custom_days || []) !== JSON.stringify(editForm.recurrence === "custom" ? editForm.customDays : []);
      await supabase.from("routines").update({
        name: editForm.name.trim(),
        weight_points: points,
        duration_key: editForm.durationKey,
        effort_level: editForm.effortKey,
        frequency: editForm.recurrence,
        custom_days: editForm.recurrence === "custom" ? editForm.customDays : null,
        // The current occurrence keeps its due date. When the rhythm changes,
        // that occurrence becomes the anchor for the next cadence.
        anchor_date: recurrenceChanged ? (editForm.dueDate || editedTask.due_date || existingRoutine.anchor_date) : (editForm.dueDate || existingRoutine.anchor_date),
        last_assigned_member: editForm.assignedTo || null,
      }).eq("id", editedTask.routine_id);
    }
    if (editForm.urgent && !wasUrgent && household && me) {
      notifyHousehold(supabase, household.id, me.id, "notif_task_urgent", { name: me.first_name, task: editForm.name.trim() });
    }
    setEditingId(null);
    loadTasks();
  }

  async function insertNextOccurrence(task: Task, routine: Routine, referenceDate: string) {
    if (!household) return;
    await insertNextRecurringOccurrence(
      { supabase, householdId: household.id, members },
      task,
      routine,
      referenceDate
    );
  }

  async function completeTask(task: Task) {
    if (animatingId || !household || !me) return;
    setAnimatingId(task.id);
    await new Promise((r) => setTimeout(r, 260));
    try {
      await completeHouseholdTask(
        { supabase, householdId: household.id, members, me },
        task
      );
    } finally {
      setAnimatingId(null);
      loadTasks();
    }
  }

  async function uncompleteTask(task: Task) {
    if (!task.routine_id) {
      await supabase.from("tasks").update({ status: "pending", completed_at: null }).eq("id", task.id);
      loadTasks();
      return;
    }

    // Undoing a recurring completion must also roll back the future occurrence
    // it generated. It is only safe when no later occurrence has already been
    // completed.
    const { data: laterDone } = await supabase
      .from("tasks")
      .select("id")
      .eq("routine_id", task.routine_id)
      .eq("status", "done")
      .gt("completed_at", task.completed_at || "")
      .limit(1);
    if (laterDone && laterDone.length > 0) {
      alert(t("recurrence_undo_blocked"));
      return;
    }

    await supabase.from("tasks").delete().eq("routine_id", task.routine_id).eq("status", "pending");
    await supabase.from("tasks").update({ status: "pending", completed_at: null }).eq("id", task.id).eq("status", "done");
    await supabase.from("routines").update({ last_assigned_member: task.assigned_to }).eq("id", task.routine_id);
    loadTasks();
  }
  async function remove(task: Task) {
    if (task.status === "done" || !task.routine_id) {
      if (!confirm(t("confirm_delete_task"))) return;
      await supabase.from("tasks").delete().eq("id", task.id);
      loadTasks();
      return;
    }
    setRecurrenceDeleteTarget(task);
  }

  async function handleRecurringDelete(action: "occurrence" | "stop") {
    const task = recurrenceDeleteTarget;
    if (!task?.routine_id) return;
    setRecurrenceDeleteTarget(null);
    const { data } = await supabase.from("routines").select("*").eq("id", task.routine_id).maybeSingle();
    const routine = data as Routine | null;
    if (!routine) return;
    if (action === "occurrence") {
      await supabase.from("tasks").delete().eq("id", task.id);
      await insertNextOccurrence(task, routine, todayCivilDate());
    } else {
      await supabase.from("routines").update({ active: false, ended_at: new Date().toISOString() }).eq("id", routine.id);
      await supabase.from("tasks").delete().eq("id", task.id).eq("status", "pending");
    }
    loadTasks();
  }
  async function reloadComments(taskId: string) {
    const { data } = await supabase.from("comments").select("*").eq("task_id", taskId).order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
  }
  async function openTaskComments(id: string) {
    setEditingId(null);
    setOpenComments(id);
    reloadComments(id);
  }
  async function addComment() {
    if (!newComment.trim() || !openComments || !me) return;
    await supabase.from("comments").insert({ household_id: household!.id, author_id: me.id, task_id: openComments, text: newComment.trim() });
    setNewComment("");
    reloadComments(openComments);
  }
  async function saveEditComment(id: string) {
    if (!editCommentText.trim() || !openComments) return;
    await supabase.from("comments").update({ text: editCommentText.trim() }).eq("id", id);
    setEditingCommentId(null);
    reloadComments(openComments);
  }
  async function deleteComment(id: string) {
    if (!confirm(t("confirm_delete_comment")) || !openComments) return;
    await supabase.from("comments").delete().eq("id", id);
    reloadComments(openComments);
  }

  if (loading || !household) return <LoadingState />;

  const today = todayCivilDate();
  const civilDayNumber = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return Date.UTC(year, month - 1, day) / 86400000;
  };
  const dayDiff = (value: string) => civilDayNumber(value) - civilDayNumber(today);
  const pending = [...tasks.filter((task) => task.status === "pending")].sort((a, b) => {
    const aLate = a.due_date && a.due_date < today ? 1 : 0;
    const bLate = b.due_date && b.due_date < today ? 1 : 0;
    if (aLate !== bLate) return bLate - aLate;
    if (a.urgent !== b.urgent) return b.urgent ? 1 : -1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    return a.due_date ? -1 : b.due_date ? 1 : 0;
  });
  const allDone = tasks
    .filter((task) => task.status === "done" && task.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());
  const hasDoneTasks = allDone.length > 0;
  const filteredDone = allDone.filter((task) => task.name.toLowerCase().includes(doneSearch.trim().toLowerCase()));
  const doneRecent = showAllDone ? filteredDone : allDone.slice(0, 3);

  function memberName(id: string | null) {
    return members.find((m) => m.id === id)?.first_name || t("unassigned");
  }

  function taskDateLabel(dateStr: string | null) {
    if (!dateStr) return null;
    const diff = dayDiff(dateStr);
    if (diff === -1) return t("task_due_yesterday");
    if (diff < -1) return t("task_due_resume");
    if (diff === 0) return t("date_today");
    if (diff === 1) return t("date_tomorrow");
    if (diff > 1 && diff <= 6) {
      const [y,m,d] = dateStr.split("-").map(Number);
      const weekday = new Date(Date.UTC(y,m-1,d)).getUTCDay();
      return t(`weekday_long_${WEEKDAYS[weekday]}`);
    }
    return dateStr.split("-").reverse().join("/");
  }

  function routineLabel(task: Task) {
    if (!task.routine_id) return null;
    const routine = routines.find((r) => r.id === task.routine_id);
    if (!routine) return t("task_recurring");
    if (routine.frequency === "custom") {
      const days = (routine.custom_days || []).map((day) => t(`weekday_${WEEKDAYS[day]}`)).join(", ");
      return days || t("task_recurring");
    }
    return t(`task_rhythm_${routine.frequency}`);
  }

  function completedLabel(task: Task) {
    if (!task.completed_at) return "";
    const d = new Date(task.completed_at);
    const completedCivil = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const diff = -dayDiff(completedCivil);
    if (diff === 0) return t("history_today").toLowerCase();
    if (diff === 1) return t("history_yesterday").toLowerCase();
    if (diff < 7) {
      const weekday = d.getDay();
      return t(`weekday_long_${WEEKDAYS[weekday]}`).toLowerCase();
    }
    return t("history_older").toLowerCase();
  }

  function completionGroup(task: Task): "today" | "yesterday" | "week" | "older" {
    if (!task.completed_at) return "older";
    const d = new Date(task.completed_at);
    const completedCivil = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const diff = -dayDiff(completedCivil);
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 7) return "week";
    return "older";
  }

  const doneGroups = (["today", "yesterday", "week", "older"] as const)
    .map((key) => ({ key, tasks: doneRecent.filter((task) => completionGroup(task) === key) }))
    .filter((group) => group.tasks.length > 0);

  return (
    <div>
      {recurrenceDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4" onClick={() => setRecurrenceDeleteTarget(null)}>
          <div className="w-full sm:max-w-md bg-paper rounded-t-3xl sm:rounded-3xl p-5 pb-7 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5 sm:hidden" />
            <h2 className="font-serif text-xl text-ink mb-1">{t("recurrence_delete_title")}</h2>
            <p className="text-sm text-muted mb-5">{t("recurrence_delete_intro")}</p>
            <div className="space-y-2">
              <button type="button" onClick={() => handleRecurringDelete("occurrence")} className="w-full text-left border border-border rounded-2xl p-4 hover:bg-white2 transition-colors">
                <div className="text-sm font-medium text-ink">{t("recurrence_delete_occurrence")}</div>
                <div className="text-xs text-muted mt-1">{t("recurrence_delete_occurrence_help")}</div>
              </button>
              <button type="button" onClick={() => handleRecurringDelete("stop")} className="w-full text-left border border-border rounded-2xl p-4 hover:bg-white2 transition-colors">
                <div className="text-sm font-medium text-red-700">{t("recurrence_stop")}</div>
                <div className="text-xs text-muted mt-1">{t("recurrence_stop_help")}</div>
              </button>
              <button type="button" onClick={() => setRecurrenceDeleteTarget(null)} className="w-full py-3 text-sm text-muted font-medium">{t("cancel")}</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between px-5 pt-8 pb-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{pending.length} {t("tasks_in_progress")}</div>
          <h1 className="font-serif text-2xl text-ink">{t("tasks_title")}</h1>
        </div>
        <button ref={topAddRef} onClick={() => { setEditingId(null); setShowAdd(true); }} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium">
          {t("add")}
        </button>
      </div>

      <IntroTip id="tasks-v2" title={t("intro_tasks_title")} text={t("intro_tasks")} />

      {addedConfirmation && (
        <div className="mx-5 mb-3 text-xs text-ink bg-mustardBg rounded-xl px-3 py-2" role="status">✓ {t("task_added_confirmation")}</div>
      )}

      {showAdd && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4 space-y-2">
          <TaskFormFields form={addForm} setForm={setAddForm} members={members} t={t} />
          <div className="flex gap-2">
            <button onClick={addTask} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">{t("add")}</button>
            <button onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }} className="px-4 text-sm text-muted">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="px-5">
        {pending.length === 0 && !showAdd && <EmptyState message={`${t("tasks_empty_title")} ${t("tasks_empty")}`} actionLabel={t("tasks_create_first")} onAction={() => setShowAdd(true)} />}
        <div className="space-y-1 mb-6">
          {pending.map((task) => (
            <div key={task.id} className="border-b border-borderLight py-3">
              {editingId === task.id ? (
                <div className="bg-white2 rounded-xl p-3 space-y-2">
                  <TaskFormFields form={editForm} setForm={setEditForm} members={members} editingRecurring={Boolean(task.routine_id)} t={t} />
                  {task.routine_id && <p className="text-[11px] text-muted italic">{t("recurrence_edit_future_note")}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(task.id)} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">{t("save")}</button>
                    <button onClick={() => setEditingId(null)} className="px-4 text-sm text-muted">{t("cancel")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div onClick={() => completeTask(task)} className={`w-5 h-5 rounded-full border-2 border-border shrink-0 cursor-pointer ${animatingId === task.id ? "bg-ink border-ink animate-check-pop" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink flex items-center gap-2 flex-wrap">
                      <span>{task.name}</span>
                      {task.urgent && <span className="text-[10px] text-mustard bg-mustardBg rounded-full px-2 py-0.5 font-medium">{t("urgent_label")}</span>}
                    </div>
                    <div className="text-[11px] text-muted flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                      {task.due_date && <span className={task.due_date < today ? "text-mustard font-medium" : ""}>{taskDateLabel(task.due_date)}</span>}
                      {task.assigned_to && <span>{t("task_for")} {memberName(task.assigned_to)}</span>}
                      {task.routine_id && <span className="flex items-center gap-1"><Repeat size={10} /> {routineLabel(task)}</span>}
                      {!task.assigned_to && !task.due_date && !task.routine_id && <span>{t("unassigned")}</span>}
                    </div>
                  </div>
                  <button onClick={() => startEdit(task)} className="text-muted"><Pencil size={16} /></button>
                  <button onClick={() => openTaskComments(task.id)} className="text-muted"><MessageCircle size={16} /></button>
                  <button onClick={() => remove(task)} className="text-muted"><Trash2 size={16} /></button>
                </div>
              )}
              {openComments === task.id && (
                <div className="mt-2 ml-8 bg-white2 rounded-xl p-3">
                  {comments.length === 0 && <p className="text-xs text-muted italic">{t("comments_none")}</p>}
                  {comments.map((c) => (
                    <div key={c.id} className="text-xs mb-1.5">
                      {editingCommentId === c.id ? (
                        <div className="flex gap-1.5">
                          <input value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} className="flex-1 border border-border rounded-lg px-2 py-1 text-xs outline-none" />
                          <button onClick={() => saveEditComment(c.id)} className="text-ink font-medium">{t("save")}</button>
                          <button onClick={() => setEditingCommentId(null)} className="text-muted">{t("cancel")}</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-ink">{memberName(members.find((m) => m.id === c.author_id)?.id || null)}</span>
                          <span className="text-muted flex-1">{c.text}</span>
                          {c.author_id === me?.id && (
                            <>
                              <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.text); }} className="text-muted"><Pencil size={11} /></button>
                              <button onClick={() => deleteComment(c.id)} className="text-muted"><Trash2 size={11} /></button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={t("comment_placeholder")} className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs outline-none" />
                    <button onClick={addComment} className="text-xs bg-ink text-paper rounded-lg px-3">OK</button>
                    <button onClick={() => setOpenComments(null)} className="text-muted"><X size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {hasDoneTasks && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">{showAllDone ? t("tasks_history") : t("tasks_done_recent")}</div>
              <button onClick={() => { setShowAllDone(!showAllDone); setDoneSearch(""); }} className="text-xs text-mustard font-medium">
                {showAllDone ? t("tasks_show_recent") : t("tasks_show_history")}
              </button>
            </div>
            {showAllDone && (
              <div className="relative mb-4">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={doneSearch}
                  onChange={(e) => setDoneSearch(e.target.value)}
                  placeholder={t("tasks_history_search")}
                  className="w-full border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-ink"
                />
              </div>
            )}
            {showAllDone ? (
              <div className="space-y-5">
                {doneGroups.map((group) => (
                  <div key={group.key}>
                    <div className="text-[11px] uppercase tracking-wide text-muted font-semibold mb-1">{t(`history_${group.key}`)}</div>
                    <div className="space-y-1">
                      {group.tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 py-3 border-b border-borderLight">
                          <div onClick={() => uncompleteTask(task)} className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-paper shrink-0 cursor-pointer"><Check size={12} strokeWidth={3} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-border line-through">{task.name}</div>
                            <div className="text-[11px] text-muted">{completedLabel(task)}</div>
                          </div>
                          <button onClick={() => remove(task)} className="text-muted"><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {doneGroups.length === 0 && <div className="text-sm text-muted py-4">{t("tasks_history_no_results")}</div>}
              </div>
            ) : (
              <div className="space-y-1">
                {doneRecent.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-3 border-b border-borderLight">
                    <div onClick={() => uncompleteTask(task)} className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-paper shrink-0 cursor-pointer"><Check size={12} strokeWidth={3} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-border line-through">{task.name}</div>
                      <div className="text-[11px] text-muted">{completedLabel(task)}</div>
                    </div>
                    <button onClick={() => remove(task)} className="text-muted"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {showFloatingAdd && !showAdd && (
          <button
            onClick={() => { setEditingId(null); setShowAdd(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="sm:hidden fixed right-5 bottom-24 z-30 bg-ink text-paper rounded-full px-5 py-3 text-sm font-medium shadow-lg"
          >
            {t("add")}
          </button>
        )}
      </div>
    </div>
  );
}
