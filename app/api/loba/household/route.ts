import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyUserToken } from "@/lib/supabase-admin";
import { buildHouseholdPrompt, sanitizeHouseholdHistory, type LobaHouseholdContext } from "@/lib/loba-household-ai";
import { normalizeHouseholdAction, parseLobaHouseholdEnvelope, taskActionPoints } from "@/lib/loba-household-actions";
import { LOBA_DEFAULT_MODEL, type LobaAiMessage } from "@/lib/loba-ai";
import { computeContributionMemberPoints } from "@/lib/task-contributions";

export const dynamic = "force-dynamic";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const user = await verifyUserToken(token);
  if (!user) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  let body: { question?: unknown; history?: unknown; householdId?: unknown; confirmAction?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requête invalide" }, { status: 400 }); }
  const householdId = typeof body.householdId === "string" ? body.householdId : "";
  if (!householdId) return NextResponse.json({ error: "Foyer manquant" }, { status: 400 });

  const db = createAdminClient();
  const { data: membership } = await db.from("members")
    .select("id,household_id,first_name,language,left_at")
    .eq("user_id", user.id).eq("household_id", householdId).is("left_at", null).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Accès à ce foyer refusé" }, { status: 403 });

  // Écriture volontairement séparée de l'IA : seul un clic explicite de confirmation arrive ici.
  if (body.confirmAction !== undefined) {
    const action = normalizeHouseholdAction(body.confirmAction);
    if (!action) return NextResponse.json({ error: "Action LOBA invalide" }, { status: 400 });
    if (action.type === "shopping.add") {
      const { data: inserted, error } = await db.from("shopping_items").insert({
        household_id: householdId, name: action.item, quantity: action.quantity, urgent: false, status: "to_buy",
      }).select("id,name,quantity,status").single();
      if (error || !inserted) return NextResponse.json({ error: "DABO n'a pas pu ajouter cet article." }, { status: 500 });
      return NextResponse.json({ ok: true, action: "shopping.add", item: inserted, mode: "household-confirmed-action" });
    }

    if (action.type === "task.update") {
      const { data: currentTask } = await db.from("tasks")
        .select("id,name,assigned_to,status")
        .eq("id", action.taskId).eq("household_id", householdId).eq("status", "pending").maybeSingle();
      if (!currentTask) return NextResponse.json({ error: "Cette tâche n’est plus disponible dans ce foyer." }, { status: 404 });
      if ((currentTask.assigned_to || null) !== action.expectedAssignedTo) {
        return NextResponse.json({ error: "Cette tâche a changé depuis la proposition de LOBA. Demande-lui de vérifier à nouveau avant de modifier." }, { status: 409 });
      }
      if (action.assignedTo) {
        const { data: targetMember } = await db.from("members").select("id").eq("id", action.assignedTo).eq("household_id", householdId).is("left_at", null).maybeSingle();
        if (!targetMember) return NextResponse.json({ error: "Le membre choisi n’appartient plus à ce foyer." }, { status: 400 });
      }
      const { data: updated, error } = await db.from("tasks").update({ assigned_to: action.assignedTo }).eq("id", currentTask.id).eq("household_id", householdId).select("id,name,assigned_to,status").single();
      if (error || !updated) return NextResponse.json({ error: "DABO n’a pas pu modifier cette tâche." }, { status: 500 });
      return NextResponse.json({ ok: true, action: "task.update", task: updated, mode: "household-confirmed-action" });
    }

    if (action.type === "calendar.add") {
      const { data: inserted, error } = await db.from("calendar_events").insert({
        household_id: householdId,
        created_by: membership.id,
        title: action.title,
        event_date: action.eventDate,
        recurring: false,
        reminder_days_before: 7,
        visibility: action.visibility,
        private_owner_id: action.visibility === "personal" ? membership.id : null,
      }).select("id,title,event_date,recurring,visibility,private_owner_id,created_by").single();
      if (error || !inserted) return NextResponse.json({ error: "DABO n'a pas pu ajouter cet événement." }, { status: 500 });
      return NextResponse.json({ ok: true, action: "calendar.add", event: inserted, mode: "household-confirmed-action" });
    }

    const memberIds = new Set((await db.from("members").select("id").eq("household_id", householdId).is("left_at", null)).data?.map((m) => m.id) || []);
    if (action.assignedTo && !memberIds.has(action.assignedTo)) return NextResponse.json({ error: "Le membre choisi n'appartient plus à ce foyer." }, { status: 400 });
    const { data: inserted, error } = await db.from("tasks").insert({
      household_id: householdId, name: action.name, weight_points: taskActionPoints(action), duration_key: action.durationKey,
      effort_level: action.effortLevel, assigned_to: action.assignedTo, urgent: action.urgent, due_date: action.dueDate, status: "pending",
    }).select("id,name,due_date,assigned_to,urgent,duration_key,effort_level,weight_points,status").single();
    if (error || !inserted) return NextResponse.json({ error: "DABO n'a pas pu ajouter cette tâche." }, { status: 500 });
    return NextResponse.json({ ok: true, action: "task.add", task: inserted, mode: "household-confirmed-action" });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 3000) : "";
  if (!question) return NextResponse.json({ error: "Question manquante" }, { status: 400 });
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "LOBA IA n'est pas configurée." }, { status: 503 });

  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
  const [householdRes, membersRes, tasksRes, shoppingRes, sharedEventsRes, personalEventsRes, contributionsRes] = await Promise.all([
    db.from("households").select("id,name").eq("id", householdId).single(),
    db.from("members").select("id,first_name,user_id,left_at").eq("household_id", householdId).is("left_at", null).not("user_id", "is", null),
    db.from("tasks").select("id,name,status,urgent,due_date,assigned_to").eq("household_id", householdId).eq("status", "pending").limit(100),
    db.from("shopping_items").select("id,name,quantity,urgent,due_date,assigned_to").eq("household_id", householdId).eq("status", "to_buy").limit(100),
    db.from("calendar_events").select("id,title,event_date,recurring,visibility").eq("household_id", householdId).eq("visibility", "household").limit(100),
    db.from("calendar_events").select("id,title,event_date,recurring,visibility").eq("household_id", householdId).eq("visibility", "personal").eq("private_owner_id", membership.id).limit(100),
    db.from("task_contributions").select("id,task_id,household_id,completed_at,duration_key,effort_level,weight_points,performer_status,cancelled_at").eq("household_id", householdId).gte("completed_at", since30d).is("cancelled_at", null),
  ]);
  if (householdRes.error || !householdRes.data) return NextResponse.json({ error: "Foyer introuvable" }, { status: 404 });

  const members = membersRes.data || [];
  const contributions = contributionsRes.data || [];
  let participantRows: Array<{ contribution_id: string; member_id: string; share_weight: number }> = [];
  if (contributions.length) {
    const { data } = await db.from("task_contribution_participants").select("contribution_id,member_id,share_weight").in("contribution_id", contributions.map((x) => x.id));
    participantRows = data || [];
  }
  const points = computeContributionMemberPoints(members.map((m) => m.id), contributions, participantRows, new Date(since30d));
  const context: LobaHouseholdContext = {
    household: { id: householdRes.data.id, name: householdRes.data.name },
    currentMember: { id: membership.id, firstName: membership.first_name, language: membership.language || "fr" },
    members: members.map((m) => ({ id: m.id, firstName: m.first_name })),
    tasks: (tasksRes.data || []).map((x) => ({ id:x.id,name:x.name,status:x.status,urgent:x.urgent,dueDate:x.due_date,assignedTo:x.assigned_to })),
    shopping: (shoppingRes.data || []).map((x) => ({ id:x.id,name:x.name,quantity:x.quantity,urgent:x.urgent,dueDate:x.due_date,assignedTo:x.assigned_to })),
    events: [...(sharedEventsRes.data || []), ...(personalEventsRes.data || [])].map((x) => ({ id:x.id,title:x.title,eventDate:x.event_date,recurring:x.recurring,visibility:x.visibility as "household"|"personal" })),
    balance: members.map((m) => ({ memberId:m.id, firstName:m.first_name, points30d: Math.round((points.get(m.id) || 0) * 10) / 10 })),
    generatedAt: new Date().toISOString(),
  };

  const history = sanitizeHouseholdHistory(Array.isArray(body.history) ? body.history as LobaAiMessage[] : []);
  const model = process.env.LOBA_AI_MODEL?.trim() || LOBA_DEFAULT_MODEL;
  try {
    const response = await fetch(GROQ_ENDPOINT, { method:"POST", headers:{ Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json" }, body:JSON.stringify({ model, messages:[{role:"system",content:buildHouseholdPrompt(context)},...history,{role:"user",content:question}], temperature:0.2, max_completion_tokens:500, response_format:{type:"json_object"} }), signal:AbortSignal.timeout(25000) });
    if (!response.ok) return NextResponse.json({ error: response.status === 429 ? "LOBA a atteint sa limite gratuite temporaire." : "Le moteur IA de LOBA est momentanément indisponible." }, { status: response.status === 429 ? 429 : 502 });
    const data = await response.json() as { choices?: Array<{message?:{content?:string}}> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return NextResponse.json({ error:"LOBA n'a pas produit de réponse." }, { status:502 });
    const envelope = parseLobaHouseholdEnvelope(raw);
    if (envelope.proposedAction?.type === "task.update") {
      const proposed = envelope.proposedAction;
      const task = context.tasks.find((x) => x.id === proposed.taskId);
      const target = proposed.assignedTo ? context.members.find((x) => x.id === proposed.assignedTo) : null;
      const previous = task?.assignedTo ? context.members.find((x) => x.id === task.assignedTo) : null;
      if (!task || proposed.expectedAssignedTo !== task.assignedTo || (proposed.assignedTo && !target)) {
        return NextResponse.json({ answer:"Je n’ai pas pu identifier cette modification avec assez de certitude. Peux-tu préciser la tâche et la personne concernée ?", proposedAction:null, engine:"ai", mode:"household-confirm-before-write" });
      }
      envelope.proposedAction = { ...proposed, taskName:task.name, previousAssignedToName:previous?.firstName || null, assignedToName:target?.firstName || null };
    }
    return NextResponse.json({ ...envelope, engine:"ai", mode:"household-confirm-before-write" });
  } catch { return NextResponse.json({ error:"Le moteur IA de LOBA est momentanément indisponible." }, { status:502 }); }
}
