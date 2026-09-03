"use client";

import { useEffect, useState } from "react";
import { useHousehold } from "@/lib/use-household";
import { EmptyState } from "@/components/EmptyState";
import { Task, DURATION_PRESETS } from "@/lib/types";
import { relativeDate } from "@/lib/utils";
import { Check, Trash2, Repeat } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function TasksPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(DURATION_PRESETS[1]);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [recurrence, setRecurrence] = useState<"none" | "weekly" | "monthly">("none");
  const [cutoff, setCutoff] = useState<number>(0);

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
    if (!name.trim() || !household) return;
    let routineId: string | null = null;
    const finalAssignee = assignedTo || null;

    if (recurrence !== "none") {
      const { data: routine } = await supabase
        .from("routines")
        .insert({
          household_id: household.id,
          name: name.trim(),
          weight_points: duration.points,
          frequency: recurrence,
          last_assigned_member: finalAssignee,
        })
        .select()
        .single();
      routineId = routine?.id || null;
    }

    await supabase.from("tasks").insert({
      household_id: household.id,
      routine_id: routineId,
      name: name.trim(),
      weight_points: duration.points,
      assigned_to: finalAssignee,
    });
    setName("");
    setAssignedTo("");
    setRecurrence("none");
    setShowAdd(false);
    loadTasks();
  }

  async function completeTask(task: Task) {
    await supabase.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", task.id);

    if (task.routine_id) {
      const { data: routine } = await supabase.from("routines").select("*").eq("id", task.routine_id).maybeSingle();
      if (routine && routine.active) {
        const sortedMembers = [...members].sort((a, b) => a.rotation_order - b.rotation_order);
        const currentIdx = sortedMembers.findIndex((m) => m.id === routine.last_assigned_member);
        const next = sortedMembers[(currentIdx + 1) % sortedMembers.length] || sortedMembers[0];
        await supabase.from("routines").update({ last_assigned_member: next?.id }).eq("id", routine.id);
        await supabase.from("tasks").insert({
          household_id: household!.id,
          routine_id: routine.id,
          name: routine.name,
          weight_points: routine.weight_points,
          assigned_to: next?.id || null,
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

  if (loading || !household) return <div className="p-8 text-center text-muted">Chargement…</div>;

  const pending = tasks.filter((t) => t.status === "pending");
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
        <button onClick={() => setShowAdd(true)} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium">
          Ajouter
        </button>
      </div>

      <IntroTip id="tasks" text="Créez des tâches, assignez-les, et activez une récurrence pour qu'elles reviennent automatiquement chaque semaine ou mois." />

      {showAdd && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4 space-y-2">
          <input autoFocus placeholder="Nom de la tâche" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
          <select value={duration.label} onChange={(e) => setDuration(DURATION_PRESETS.find((d) => d.label === e.target.value)!)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink">
            {DURATION_PRESETS.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
          </select>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink">
            <option value="">Non assigné</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.first_name}</option>)}
          </select>
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as "none" | "weekly" | "monthly")} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink">
            <option value="none">Aucune récurrence</option>
            <option value="weekly">Chaque semaine (rotation automatique)</option>
            <option value="monthly">Chaque mois (rotation automatique)</option>
          </select>
          <div className="flex gap-2">
            <button onClick={addTask} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">Ajouter</button>
            <button onClick={() => setShowAdd(false)} className="px-4 text-sm text-muted">Annuler</button>
          </div>
        </div>
      )}

      <div className="px-5">
        {pending.length === 0 && !showAdd && <EmptyState message="Aucune tâche en attente." actionLabel="Créer une tâche" onAction={() => setShowAdd(true)} />}
        <div className="space-y-1 mb-6">
          {pending.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-3 border-b border-borderLight">
              <div onClick={() => completeTask(t)} className="w-5 h-5 rounded-full border-2 border-border shrink-0 cursor-pointer" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink">{t.name}</div>
                <div className="text-[11px] text-muted flex items-center gap-1">
                  {t.routine_id && <Repeat size={10} />} {memberName(t.assigned_to)}
                </div>
              </div>
              <span className="text-[11px] text-mustard bg-mustardBg rounded-full px-2 py-0.5 font-mono">{t.weight_points} pts</span>
              <button onClick={() => remove(t.id)} className="text-muted"><Trash2 size={16} /></button>
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
