"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { EmptyState } from "@/components/EmptyState";
import { Task, Comment, Routine, RoutineFrequency, DURATION_OPTIONS, EFFORT_OPTIONS, computeTaskPoints } from "@/lib/types";
import { relativeDate, dueDateLabel, computeNextDueDate, todayCivilDate } from "@/lib/utils";
import { notifyHousehold } from "@/lib/notifications";
import { Check, Trash2, Repeat, MessageCircle, X, Pencil } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/lib/language-context";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type TaskForm = { name: string; durationKey: string; effortKey: string; assignedTo: string; recurrence: "none" | RoutineFrequency; customDays: number[]; urgent: boolean; dueDate: string };
const EMPTY_FORM: TaskForm = { name: "", durationKey: DURATION_OPTIONS[2].key, effortKey: "moyen", assignedTo: "", recurrence: "none", customDays: [], urgent: false, dueDate: "" };
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function TaskFormFields({
  form,
  setForm,
  members,
  lockRecurrence,
  t,
}: {
  form: TaskForm;
  setForm: (f: TaskForm) => void;
  members: { id: string; first_name: string }[];
  lockRecurrence?: boolean;
  t: (key: string) => string;
}) {
  return (
    <>
      <input autoFocus placeholder={t("task_name_placeholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
      <select value={form.durationKey} onChange={(e) => setForm({ ...form, durationKey: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink">
        {DURATION_OPTIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
      </select>
      <select value={form.effortKey} onChange={(e) => setForm({ ...form, effortKey: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink">
        {EFFORT_OPTIONS.map((e) => <option key={e.key} value={e.key}>{t("effort_label")} : {e.label}</option>)}
      </select>
      <p className="text-[11px] text-muted -mt-1">{t("points_explain")} {computeTaskPoints(form.durationKey, form.effortKey)} pts</p>
      <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink">
        <option value="">{t("unassigned")}</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.first_name}</option>)}
      </select>
      {!lockRecurrence && (
        <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as TaskForm["recurrence"] })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink">
          <option value="none">{t("recurrence_none")}</option>
          <option value="daily">{t("recurrence_daily")}</option>
          <option value="weekly">{t("recurrence_weekly")}</option>
          <option value="biweekly">{t("recurrence_biweekly")}</option>
          <option value="monthly">{t("recurrence_monthly")}</option>
          <option value="yearly">{t("recurrence_yearly")}</option>
          <option value="custom">{t("recurrence_custom")}</option>
        </select>
      )}
      {!lockRecurrence && form.recurrence === "custom" && (
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
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} />
        {t("mark_urgent_f")}
      </label>
      <div>
        <label className="text-xs text-muted block mb-1">Échéance (facultatif)</label>
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
      </div>
    </>
  );
}

export default function TasksPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<TaskForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(EMPTY_FORM);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [cutoff, setCutoff] = useState<number>(0);
  const [showAllDone, setShowAllDone] = useState(false);
  const [doneSearch, setDoneSearch] = useState("");
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCutoff(Date.now() - SEVEN_DAYS_MS);
  }, []);

  async function loadTasks() {
    if (!household) return;
    const { data } = await supabase.from("tasks").select("*").eq("household_id", household.id).order("created_at", { ascending: false });
    setTasks((data as Task[]) || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (household) loadTasks();
  }, [household]);

  async function addTask() {
    if (!addForm.name.trim() || !household) return;
    if (addForm.recurrence !== "none" && !addForm.dueDate) { alert(t("recurrence_due_required")); return; }
    if (addForm.recurrence === "custom" && addForm.customDays.length === 0) { alert(t("recurrence_days_required")); return; }
    const points = computeTaskPoints(addForm.durationKey, addForm.effortKey);
    let routineId: string | null = null;
    const finalAssignee = addForm.assignedTo || members[0]?.id || null;

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
    setEditForm({
      name: task.name,
      durationKey: task.duration_key || fallbackDuration.key,
      effortKey: task.effort_level || "faible",
      assignedTo: task.assigned_to || "",
      recurrence: "none",
      customDays: [],
      urgent: task.urgent,
      dueDate: task.due_date || "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) return;
    const points = computeTaskPoints(editForm.durationKey, editForm.effortKey);
    const wasUrgent = tasks.find((t) => t.id === id)?.urgent || false;
    await supabase.from("tasks").update({
      name: editForm.name.trim(),
      weight_points: points,
      duration_key: editForm.durationKey,
      effort_level: editForm.effortKey,
      assigned_to: editForm.assignedTo || null,
      urgent: editForm.urgent,
      due_date: editForm.dueDate || null,
    }).eq("id", id);
    const editedTask = tasks.find((t) => t.id === id);
    if (editedTask?.routine_id) {
      await supabase.from("routines").update({
        name: editForm.name.trim(),
        weight_points: points,
        duration_key: editForm.durationKey,
        effort_level: editForm.effortKey,
        anchor_date: editForm.dueDate || null,
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
    if (!household || !routine.active) return;
    const sortedMembers = [...members].sort((a, b) => a.rotation_order - b.rotation_order);
    const currentIdx = sortedMembers.findIndex((m) => m.id === routine.last_assigned_member);
    const nextMember = sortedMembers.length ? sortedMembers[(currentIdx + 1 + sortedMembers.length) % sortedMembers.length] : undefined;
    const baseDue = task.due_date || routine.anchor_date || referenceDate;
    const nextDue = computeNextDueDate(baseDue, referenceDate, routine.frequency, routine.custom_days || [], routine.anchor_date || baseDue);
    const { error } = await supabase.from("tasks").insert({
      household_id: household.id,
      routine_id: routine.id,
      name: routine.name,
      weight_points: routine.weight_points,
      duration_key: routine.duration_key ?? task.duration_key,
      effort_level: routine.effort_level ?? task.effort_level,
      assigned_to: nextMember?.id || null,
      due_date: nextDue,
    });
    // 23505 = unique_violation: another device already created this occurrence.
    if (error && error.code !== "23505") throw error;
    if (!error && nextMember) await supabase.from("routines").update({ last_assigned_member: nextMember.id }).eq("id", routine.id);
  }

  async function completeTask(task: Task) {
    if (animatingId) return;
    setAnimatingId(task.id);
    await new Promise((r) => setTimeout(r, 260));
    try {
      const completedAt = new Date().toISOString();
      const { data: updated, error: completeError } = await supabase
        .from("tasks")
        .update({ status: "done", completed_at: completedAt })
        .eq("id", task.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      // If another device already completed it, do nothing: no duplicate
      // notification, rotation or next occurrence.
      if (completeError || !updated) return;
      if (household && me) notifyHousehold(supabase, household.id, me.id, "notif_task_done", { name: me.first_name, task: task.name });

      if (task.routine_id) {
        const { data } = await supabase.from("routines").select("*").eq("id", task.routine_id).maybeSingle();
        const routine = data as Routine | null;
        if (routine?.active) await insertNextOccurrence(task, routine, todayCivilDate());
      }
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
    const choice = prompt(`${t("recurrence_delete_prompt")}\n1 — ${t("recurrence_delete_occurrence")}\n2 — ${t("recurrence_stop")}\n${t("recurrence_cancel_hint")}`);
    if (choice !== "1" && choice !== "2") return;
    const { data } = await supabase.from("routines").select("*").eq("id", task.routine_id).maybeSingle();
    const routine = data as Routine | null;
    if (!routine) return;
    if (choice === "1") {
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

  const pending = [...tasks.filter((task) => task.status === "pending")].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  const hasDoneTasks = tasks.some((task) => task.status === "done");
  const doneRecent = tasks
    .filter((task) => task.status === "done" && task.completed_at)
    .filter((task) => showAllDone || (new Date(task.completed_at!).getTime() > cutoff && cutoff > 0))
    .filter((task) => task.name.toLowerCase().includes(doneSearch.toLowerCase()))
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  function memberName(id: string | null) {
    return members.find((m) => m.id === id)?.first_name || t("unassigned");
  }

  return (
    <div>
      <div className="flex items-start justify-between px-5 pt-8 pb-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{pending.length} {t("tasks_in_progress")}</div>
          <h1 className="font-serif text-2xl text-ink">{t("tasks_title")}</h1>
        </div>
        <button onClick={() => { setEditingId(null); setShowAdd(true); }} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium">
          {t("add")}
        </button>
      </div>

      <IntroTip id="tasks" text={t("intro_tasks")} />

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
        {pending.length === 0 && !showAdd && <EmptyState message={t("tasks_empty")} actionLabel={t("tasks_create_first")} onAction={() => setShowAdd(true)} />}
        <div className="space-y-1 mb-6">
          {pending.map((task) => (
            <div key={task.id} className="border-b border-borderLight py-3">
              {editingId === task.id ? (
                <div className="bg-white2 rounded-xl p-3 space-y-2">
                  <TaskFormFields form={editForm} setForm={setEditForm} members={members} lockRecurrence t={t} />
                  {task.routine_id && <p className="text-[11px] text-muted italic">{t("recurrence_lock_note")}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(task.id)} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">{t("save")}</button>
                    <button onClick={() => setEditingId(null)} className="px-4 text-sm text-muted">{t("cancel")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div onClick={() => completeTask(task)} className={`w-5 h-5 rounded-full border-2 border-border shrink-0 cursor-pointer ${animatingId === task.id ? "bg-ink border-ink animate-check-pop" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink flex items-center gap-1.5">
                      {task.urgent && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title={t("urgent_label")} />}
                      {task.name}
                    </div>
                    <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                      <span className="flex items-center gap-1">{task.routine_id && <Repeat size={10} />} {task.due_date ? dueDateLabel(task.due_date, t) : null}</span>
                      {task.assigned_to && <Avatar member={members.find((m) => m.id === task.assigned_to) || null} members={members} size={16} />}
                    </div>
                  </div>
                  <span className="text-[11px] text-mustard bg-mustardBg rounded-full px-2 py-0.5 font-mono">{task.weight_points} pts</span>
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
              <input
                value={doneSearch}
                onChange={(e) => setDoneSearch(e.target.value)}
                placeholder={t("search_placeholder")}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink mb-2"
              />
            )}
            <div className="space-y-1">
              {doneRecent.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3 border-b border-borderLight">
                  <div onClick={() => uncompleteTask(task)} className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-paper shrink-0 cursor-pointer"><Check size={12} strokeWidth={3} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-border line-through">{task.name}</div>
                    <div className="text-[11px] text-muted">{task.completed_at && relativeDate(task.completed_at)}</div>
                  </div>
                  <button onClick={() => remove(task)} className="text-muted"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
