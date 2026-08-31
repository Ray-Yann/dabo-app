"use client";

import { useEffect, useState } from "react";
import { useHousehold } from "@/lib/use-household";
import { EmptyState } from "@/components/EmptyState";
import { Task, Comment, DURATION_PRESETS } from "@/lib/types";
import { relativeDate, dueDateLabel } from "@/lib/utils";
import { notifyHousehold } from "@/lib/notifications";
import { Check, Trash2, Repeat, MessageCircle, X, Pencil } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { Avatar } from "@/components/Avatar";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type TaskForm = { name: string; durationLabel: string; assignedTo: string; recurrence: "none" | "weekly" | "monthly"; urgent: boolean; dueDate: string };
const EMPTY_FORM: TaskForm = { name: "", durationLabel: DURATION_PRESETS[1].label, assignedTo: "", recurrence: "none", urgent: false, dueDate: "" };

function TaskFormFields({
  form,
  setForm,
  members,
  lockRecurrence,
}: {
  form: TaskForm;
  setForm: (f: TaskForm) => void;
  members: { id: string; first_name: string }[];
  lockRecurrence?: boolean;
}) {
  return (
    <>
      <input autoFocus placeholder="Nom de la tâche" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
      <select value={form.durationLabel} onChange={(e) => setForm({ ...form, durationLabel: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink">
        {DURATION_PRESETS.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
      </select>
      <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink">
        <option value="">Non assigné</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.first_name}</option>)}
      </select>
      {!lockRecurrence && (
        <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as TaskForm["recurrence"] })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink">
          <option value="none">Aucune récurrence</option>
          <option value="weekly">Chaque semaine (rotation automatique)</option>
          <option value="monthly">Chaque mois (rotation automatique)</option>
        </select>
      )}
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} />
        Marquer comme urgente
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<TaskForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(EMPTY_FORM);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [cutoff, setCutoff] = useState<number>(0);
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
    const duration = DURATION_PRESETS.find((d) => d.label === addForm.durationLabel) || DURATION_PRESETS[1];
    let routineId: string | null = null;
    const finalAssignee = addForm.assignedTo || members[0]?.id || null;

    if (addForm.recurrence !== "none") {
      const { data: routine } = await supabase
        .from("routines")
        .insert({
          household_id: household.id,
          name: addForm.name.trim(),
          weight_points: duration.points,
          frequency: addForm.recurrence,
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
      weight_points: duration.points,
      assigned_to: finalAssignee,
      urgent: addForm.urgent,
      due_date: addForm.dueDate || null,
    });
    setAddForm(EMPTY_FORM);
    setShowAdd(false);
    loadTasks();
  }

  function startEdit(task: Task) {
    setOpenComments(null);
    setEditingId(task.id);
    const preset = DURATION_PRESETS.find((d) => d.points === task.weight_points) || DURATION_PRESETS[1];
    setEditForm({
      name: task.name,
      durationLabel: preset.label,
      assignedTo: task.assigned_to || "",
      recurrence: "none",
      urgent: task.urgent,
      dueDate: task.due_date || "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) return;
    const duration = DURATION_PRESETS.find((d) => d.label === editForm.durationLabel) || DURATION_PRESETS[1];
    await supabase.from("tasks").update({
      name: editForm.name.trim(),
      weight_points: duration.points,
      assigned_to: editForm.assignedTo || null,
      urgent: editForm.urgent,
      due_date: editForm.dueDate || null,
    }).eq("id", id);
    setEditingId(null);
    loadTasks();
  }

  async function completeTask(task: Task) {
    setAnimatingId(task.id);
    await new Promise((r) => setTimeout(r, 260));
    await supabase.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", task.id);
    setAnimatingId(null);
    if (household && me) {
      notifyHousehold(household.id, me.id, "Dabo", `${me.first_name} a terminé « ${task.name} »`);
    }

    if (task.routine_id) {
      const { data: routine } = await supabase.from("routines").select("*").eq("id", task.routine_id).maybeSingle();
      if (routine && routine.active) {
        const sortedMembers = [...members].sort((a, b) => a.rotation_order - b.rotation_order);
        const currentIdx = sortedMembers.findIndex((m) => m.id === routine.last_assigned_member);
        const next = sortedMembers[(currentIdx + 1) % sortedMembers.length] || sortedMembers[0];
        await supabase.from("routines").update({ last_assigned_member: next?.id }).eq("id", routine.id);
        const nextDue = new Date();
        if (routine.frequency === "monthly") nextDue.setMonth(nextDue.getMonth() + 1);
        else nextDue.setDate(nextDue.getDate() + 7);
        await supabase.from("tasks").insert({
          household_id: household!.id,
          routine_id: routine.id,
          name: routine.name,
          weight_points: routine.weight_points,
          assigned_to: next?.id || null,
          due_date: nextDue.toISOString().slice(0, 10),
        });
      }
    }
    loadTasks();
  }

  async function uncompleteTask(id: string) {
    await supabase.from("tasks").update({ status: "pending", completed_at: null }).eq("id", id);
    loadTasks();
  }
  async function remove(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
  }
  async function openTaskComments(id: string) {
    setEditingId(null);
    setOpenComments(id);
    const { data } = await supabase.from("comments").select("*").eq("task_id", id).order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
  }
  async function addComment() {
    if (!newComment.trim() || !openComments || !me) return;
    await supabase.from("comments").insert({ household_id: household!.id, author_id: me.id, task_id: openComments, text: newComment.trim() });
    setNewComment("");
    const { data } = await supabase.from("comments").select("*").eq("task_id", openComments).order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
  }

  if (loading || !household) return <div className="p-8 text-center text-muted">Chargement…</div>;

  const pending = [...tasks.filter((t) => t.status === "pending")].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  const doneRecent = tasks.filter(
    (t) => t.status === "done" && t.completed_at && new Date(t.completed_at).getTime() > cutoff && cutoff > 0
  );

  function memberName(id: string | null) {
    return members.find((m) => m.id === id)?.first_name || "Non assigné";
  }

  return (
    <div>
      <div className="flex items-start justify-between px-5 pt-8 pb-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{pending.length} tâches en cours</div>
          <h1 className="font-serif text-2xl text-ink">Tâches</h1>
        </div>
        <button onClick={() => { setEditingId(null); setShowAdd(true); }} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium">
          Ajouter
        </button>
      </div>

      <IntroTip id="tasks" text="Créez des tâches, assignez-les, marquez-les urgentes si besoin, et activez une récurrence pour qu'elles reviennent automatiquement." />

      {showAdd && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4 space-y-2">
          <TaskFormFields form={addForm} setForm={setAddForm} members={members} />
          <div className="flex gap-2">
            <button onClick={addTask} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">Ajouter</button>
            <button onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }} className="px-4 text-sm text-muted">Annuler</button>
          </div>
        </div>
      )}

      <div className="px-5">
        {pending.length === 0 && !showAdd && <EmptyState message="Aucune tâche en attente." actionLabel="Créer une tâche" onAction={() => setShowAdd(true)} />}
        <div className="space-y-1 mb-6">
          {pending.map((t) => (
            <div key={t.id} className="border-b border-borderLight py-3">
              {editingId === t.id ? (
                <div className="bg-white2 rounded-xl p-3 space-y-2">
                  <TaskFormFields form={editForm} setForm={setEditForm} members={members} lockRecurrence />
                  {t.routine_id && <p className="text-[11px] text-muted italic">La récurrence ne se change pas ici — supprime et recrée la tâche pour ça.</p>}
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(t.id)} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">Enregistrer</button>
                    <button onClick={() => setEditingId(null)} className="px-4 text-sm text-muted">Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div onClick={() => completeTask(t)} className={`w-5 h-5 rounded-full border-2 border-border shrink-0 cursor-pointer ${animatingId === t.id ? "bg-ink border-ink animate-check-pop" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink flex items-center gap-1.5">
                      {t.urgent && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title="Urgente" />}
                      {t.name}
                    </div>
                    <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                      <span className="flex items-center gap-1">{t.routine_id && <Repeat size={10} />} {t.due_date ? dueDateLabel(t.due_date) : null}</span>
                      {t.assigned_to && <Avatar member={members.find((m) => m.id === t.assigned_to) || null} members={members} size={16} />}
                    </div>
                  </div>
                  <span className="text-[11px] text-mustard bg-mustardBg rounded-full px-2 py-0.5 font-mono">{t.weight_points} pts</span>
                  <button onClick={() => startEdit(t)} className="text-muted"><Pencil size={16} /></button>
                  <button onClick={() => openTaskComments(t.id)} className="text-muted"><MessageCircle size={16} /></button>
                  <button onClick={() => remove(t.id)} className="text-muted"><Trash2 size={16} /></button>
                </div>
              )}
              {openComments === t.id && (
                <div className="mt-2 ml-8 bg-white2 rounded-xl p-3">
                  {comments.length === 0 && <p className="text-xs text-muted italic">Aucun commentaire.</p>}
                  {comments.map((c) => (
                    <div key={c.id} className="text-xs mb-1"><span className="font-medium text-ink">{memberName(members.find((m) => m.id === c.author_id)?.id || null)}</span> <span className="text-muted">{c.text}</span></div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ajouter un commentaire…" className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs outline-none" />
                    <button onClick={addComment} className="text-xs bg-ink text-paper rounded-lg px-3">OK</button>
                    <button onClick={() => setOpenComments(null)} className="text-muted"><X size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {doneRecent.length > 0 && (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Terminées récemment</div>
            <div className="space-y-1">
              {doneRecent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-3 border-b border-borderLight">
                  <div onClick={() => uncompleteTask(t.id)} className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-paper shrink-0 cursor-pointer"><Check size={12} strokeWidth={3} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-border line-through">{t.name}</div>
                    <div className="text-[11px] text-muted">{t.completed_at && relativeDate(t.completed_at)}</div>
                  </div>
                  <button onClick={() => remove(t.id)} className="text-muted"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
