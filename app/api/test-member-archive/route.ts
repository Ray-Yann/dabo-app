import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient, transferCreatorAndArchive, verifyUserToken } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userData = await verifyUserToken(token);
  if (!userData) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const admin = createAdminClient();
  const { data: caller, error: callerError } = await admin
    .from("members")
    .select("id, household_id")
    .eq("user_id", userData.id)
    .is("left_at", null)
    .maybeSingle();

  if (callerError || !caller) {
    return NextResponse.json({ error: "Membre actif introuvable" }, { status: 403 });
  }

  const marker = randomUUID();
  const email = `dabo.archive.test.${marker}@example.com`;
  let authUserId: string | null = null;
  let testMemberId: string | null = null;
  let taskId: string | null = null;
  let shoppingId: string | null = null;

  try {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: `Dabo-Test-${marker}!aA9`,
      email_confirm: true,
    });
    if (authError || !authData.user) throw authError || new Error("Création du compte test impossible");
    authUserId = authData.user.id;

    const testColor = "#6F7F72";
    const { data: member, error: memberError } = await admin
      .from("members")
      .insert({
        household_id: caller.household_id,
        user_id: authUserId,
        first_name: `Test archivage ${marker.slice(0, 6)}`,
        role: "member",
        rotation_order: 999999,
        avatar_color: testColor,
        language: "fr",
      })
      .select("id")
      .single();
    if (memberError || !member) throw memberError || new Error("Création du membre test impossible");
    testMemberId = member.id;

    const { data: task, error: taskError } = await admin
      .from("tasks")
      .insert({
        household_id: caller.household_id,
        name: `Test archivage tâche ${marker.slice(0, 6)}`,
        weight_points: 5,
        duration_key: "5min",
        effort_level: "faible",
        assigned_to: testMemberId,
        status: "pending",
        urgent: false,
      })
      .select("id")
      .single();
    if (taskError || !task) throw taskError || new Error("Création de la tâche test impossible");
    taskId = task.id;

    const { data: shopping, error: shoppingError } = await admin
      .from("shopping_items")
      .insert({
        household_id: caller.household_id,
        name: `Test archivage course ${marker.slice(0, 6)}`,
        assigned_to: testMemberId,
        status: "to_buy",
        urgent: false,
      })
      .select("id")
      .single();
    if (shoppingError || !shopping) throw shoppingError || new Error("Création de la course test impossible");
    shoppingId = shopping.id;

    await transferCreatorAndArchive(admin, testMemberId);

    const [{ data: archivedMember }, { data: archivedTask }, { data: archivedShopping }, { count: activeCount }, { count: historicalCount }] = await Promise.all([
      admin.from("members").select("id, user_id, left_at, avatar_color, archived_avatar_color").eq("id", testMemberId).single(),
      admin.from("tasks").select("id, assigned_to").eq("id", taskId).single(),
      admin.from("shopping_items").select("id, assigned_to").eq("id", shoppingId).single(),
      admin.from("members").select("id", { count: "exact", head: true }).eq("id", testMemberId).is("left_at", null).not("user_id", "is", null),
      admin.from("members").select("id", { count: "exact", head: true }).eq("id", testMemberId),
    ]);

    const checks = {
      left_at_enregistre: Boolean(archivedMember?.left_at),
      couleur_archivee: archivedMember?.archived_avatar_color === testColor,
      user_id_detache: archivedMember?.user_id === null,
      tache_future_desassignee: archivedTask?.assigned_to === null,
      course_future_desassignee: archivedShopping?.assigned_to === null,
      exclu_des_membres_actifs: activeCount === 0,
      conserve_dans_historique: historicalCount === 1,
    };

    const success = Object.values(checks).every(Boolean);
    return NextResponse.json({ success, checks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Échec du test contrôlé" },
      { status: 500 }
    );
  } finally {
    // Nettoyage systématique : aucune donnée de test ne doit rester dans le foyer.
    if (taskId) await admin.from("tasks").delete().eq("id", taskId);
    if (shoppingId) await admin.from("shopping_items").delete().eq("id", shoppingId);
    if (testMemberId) await admin.from("members").delete().eq("id", testMemberId);
    if (authUserId) await admin.auth.admin.deleteUser(authUserId);
  }
}
