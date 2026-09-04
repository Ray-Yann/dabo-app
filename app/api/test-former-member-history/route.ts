import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient, transferCreatorAndArchive, verifyUserToken } from "@/lib/supabase-admin";

const TEST_PREFIX = "DABO Test ancien";

function daysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userData = await verifyUserToken(token);
  if (!userData) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

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

  // Empêche de créer plusieurs jeux de données temporaires dans le même foyer.
  const { data: existingTest, error: existingError } = await admin
    .from("members")
    .select("id")
    .eq("household_id", caller.household_id)
    .like("first_name", `${TEST_PREFIX}%`)
    .limit(1);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existingTest && existingTest.length > 0) {
    return NextResponse.json({
      success: true,
      alreadyExists: true,
      message: "Le membre de test historique existe déjà.",
    });
  }

  const marker = randomUUID().slice(0, 6);
  const email = `dabo.former.test.${randomUUID()}@example.com`;

  let authUserId: string | null = null;
  let memberId: string | null = null;
  let taskId: string | null = null;
  let contributionId: string | null = null;

  try {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: `Dabo-Test-${randomUUID()}!aA9`,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw authError || new Error("Création du compte temporaire impossible");
    }

    authUserId = authData.user.id;

    const joinedAt = daysAgo(20);
    const completedAt = daysAgo(15);
    const leftAt = daysAgo(10);
    const testColor = "#B8875A";

    const { data: member, error: memberError } = await admin
      .from("members")
      .insert({
        household_id: caller.household_id,
        user_id: authUserId,
        first_name: `${TEST_PREFIX} ${marker}`,
        role: "member",
        rotation_order: 999999,
        avatar_color: testColor,
        language: "fr",
        created_at: joinedAt,
      })
      .select("id")
      .single();

    if (memberError || !member) {
      throw memberError || new Error("Création du membre temporaire impossible");
    }

    const createdMemberId = member.id as string;
    memberId = createdMemberId;

    const { data: task, error: taskError } = await admin
      .from("tasks")
      .insert({
        household_id: caller.household_id,
        name: `Test historique ancien membre ${marker}`,
        weight_points: 20,
        assigned_to: createdMemberId,
        status: "done",
        completed_at: completedAt,
        duration_key: "30min",
        effort_level: "moyen",
        urgent: false,
      })
      .select("id")
      .single();

    if (taskError || !task) {
      throw taskError || new Error("Création de la tâche historique impossible");
    }

    const createdTaskId = task.id as string;
    taskId = createdTaskId;

    const { data: contribution, error: contributionError } = await admin
      .from("task_contributions")
      .insert({
        task_id: createdTaskId,
        household_id: caller.household_id,
        completed_at: completedAt,
        duration_key: "30min",
        effort_level: "moyen",
        weight_points: 20,
        performer_status: "confirmed",
        created_by: caller.id,
        updated_by: caller.id,
      })
      .select("id")
      .single();

    if (contributionError || !contribution) {
      throw contributionError || new Error("Création de la contribution historique impossible");
    }

    const createdContributionId = contribution.id as string;
    contributionId = createdContributionId;

    const { error: participantError } = await admin
      .from("task_contribution_participants")
      .insert({
        contribution_id: createdContributionId,
        member_id: createdMemberId,
        share_weight: 1,
      });

    if (participantError) throw participantError;

    // Utilise la vraie logique d'archivage déjà validée en 6.3C.7.2.
    await transferCreatorAndArchive(admin, createdMemberId);

    // Pour le test visuel, on place le départ 10 jours dans le passé :
    // le membre doit être absent de "Semaine" mais visible sur "3 mois".
    const { error: dateError } = await admin
      .from("members")
      .update({ left_at: leftAt })
      .eq("id", createdMemberId);

    if (dateError) throw dateError;

    // Le membre est déjà détaché de son auth.user après archivage.
    // On peut donc supprimer le compte temporaire immédiatement.
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId);
      authUserId = null;
    }

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      testMemberName: `${TEST_PREFIX} ${marker}`,
      instructions: {
        week: "Le membre de test ne doit PAS apparaître sur Semaine.",
        threeMonths: "Le membre de test doit apparaître sur 3 mois avec la mention Ancien membre.",
      },
    });
  } catch (error) {
    // Nettoyage si la création du jeu de test échoue à mi-chemin.
    if (contributionId) {
      await admin
        .from("task_contribution_participants")
        .delete()
        .eq("contribution_id", contributionId);
      await admin.from("task_contributions").delete().eq("id", contributionId);
    }
    if (taskId) await admin.from("tasks").delete().eq("id", taskId);
    if (memberId) await admin.from("members").delete().eq("id", memberId);
    if (authUserId) await admin.auth.admin.deleteUser(authUserId);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Échec du test historique" },
      { status: 500 }
    );
  }
}
