import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireDaboAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const isoAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const currentAdmin = await requireDaboAdmin(token);
  if (!currentAdmin) return NextResponse.json({ error: "Accès administrateur refusé" }, { status: 403 });

  const db = createAdminClient();
  const since7 = isoAgo(7), since30 = isoAgo(30);
  const [households, members, tasks, shopping, events, contributions] = await Promise.all([
    db.from("households").select("id,name,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(8),
    db.from("members").select("id,user_id,household_id,first_name,role,created_at,left_at"),
    db.from("tasks").select("id,household_id,status,created_at,completed_at"),
    db.from("shopping_items").select("id,household_id,status,created_at,bought_at"),
    db.from("calendar_events").select("id,household_id,created_at"),
    db.from("task_contributions").select("id,household_id,completed_at,cancelled_at"),
  ]);
  const errors = [households.error,members.error,tasks.error,shopping.error,events.error,contributions.error].filter(Boolean);
  if (errors.length) return NextResponse.json({ error: "Impossible de charger les indicateurs" }, { status: 500 });

  const memberRows = members.data || [], taskRows = tasks.data || [], shoppingRows = shopping.data || [], eventRows = events.data || [], contributionRows = contributions.data || [];
  const activeMembers = memberRows.filter(m => !m.left_at && m.user_id);
  const users = new Set(activeMembers.map(m => m.user_id));
  const multi = new Map<string, number>();
  activeMembers.forEach(m => multi.set(m.user_id!, (multi.get(m.user_id!) || 0) + 1));
  const activityHouseholds = (since: string) => new Set([
    ...taskRows.filter(x => x.created_at >= since || (x.completed_at && x.completed_at >= since)).map(x => x.household_id),
    ...shoppingRows.filter(x => x.created_at >= since || (x.bought_at && x.bought_at >= since)).map(x => x.household_id),
    ...eventRows.filter(x => x.created_at >= since).map(x => x.household_id),
    ...contributionRows.filter(x => !x.cancelled_at && x.completed_at >= since).map(x => x.household_id),
  ]).size;
  const newUsers = (since: string) => new Set(activeMembers.filter(m => m.created_at >= since).map(m => m.user_id)).size;

  return NextResponse.json({
    generatedAt: new Date().toISOString(), admin: currentAdmin.email,
    kpis: {
      users: users.size, households: households.count || 0, activeMemberships: activeMembers.length,
      multiHouseholdUsers: [...multi.values()].filter(n => n > 1).length,
      newUsers7: newUsers(since7), newUsers30: newUsers(since30),
      activeHouseholds7: activityHouseholds(since7), activeHouseholds30: activityHouseholds(since30),
      tasksCreated30: taskRows.filter(x => x.created_at >= since30).length,
      tasksCompleted30: taskRows.filter(x => x.completed_at && x.completed_at >= since30).length,
      shoppingBought30: shoppingRows.filter(x => x.bought_at && x.bought_at >= since30).length,
      eventsCreated30: eventRows.filter(x => x.created_at >= since30).length,
    },
    recentHouseholds: (households.data || []).map(h => ({ ...h, members: activeMembers.filter(m => m.household_id === h.id).length })),
  });
}
