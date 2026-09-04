import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient, transferCreatorAndArchive, verifyUserToken } from "@/lib/supabase-admin";

const TEST_PREFIX = "DABO Test ancien";

function daysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const parts = [value.message, value.details, value.hint, value.code]
      .filter((part): part is string => typeof part === "string" && part.length > 0);
    if (parts.length) return parts.join(" | ");
  }
  return error instanceof Error ? error.message : String(error);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié", stage: "auth_token" }, { status: 401 });

  const userData = await verifyUserToken(token);
  if (!userData) return NextResponse.json({ error: "Session invalide", stage: "auth_user" }, { status: 401 });

  const admin = createAdminClient();
  let stage = "caller";
  let authUserId: string | null = null;
  let memberId: string | null = null;
  let taskId: string | null = null;
  let contributionId: string | null = null;

  try {
    const { data: caller, error: callerError } = await admin
      .from("members")
      .select("id, household_id")
      .eq("user_id", userData.id)
      .is("left_at", null)
      .maybeSingle();

    if (callerError || !caller) throw callerError || new Error("Membre actif introuvable");

    stage = "existing_test_check";
    const { data: existingTest, error: existingError } = await admin
      .from("members")
      .select("id, first_name")
      .eq("household_id", caller.household_id)
      .like("first_name", `${TEST_PREFIX}%`)
      .limit(1);

    if (existingError) throw existingError;
    if (existingTest && existingTest.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        testMemberName: existingTest[0].first_name,
      });
    }

    const marker = randomUUID().slice(0, 6);
    const email = `dabo.former.test.${randomUUID()}@example.com`;
    const joinedAt = daysAgo(20);
    const completedAt = daysAgo(15);
    const leftAt = daysAgo(10);
    const testColor = "#B8875A";

    stage = "create_auth_user";
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: `Dabo-Test-${randomUUID()}!aA9`,
      email_confirm: true,
    });
    if (authError || !authData.user) throw authError || new Error("Création du compte temporaire impossible");
    authUserId = authData.user.id;

    stage = "create_member";
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

    if (memberError || !member) throw memberError || new Error("Création du membre temporaire impossible");
    memberId = member.id as string;

    stage = "create_task";
    const { data: task, error: taskError } = await admin
      .from("tasks")
      .insert({
        household_id: caller.household_id,
        name: `Test historique ancien membre ${marker}`,
        weight_points: 20,
        assigned_to: memberId,
        status: "done",
        completed_at: completedAt,
        duration_key: "30min",
        effort_level: "moyen",
        urgent: false,
      })
      .select("id")
      .single();

    if (taskError || !task) throw taskError || new Error("Création de la tâche historique impossible");
    taskId = task.id as string;

    stage = "create_contribution";
    const { data: contribution, error: contributionError } = await admin
      .from("task_contributions")
      .insert({
        task_id: taskId,
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
    contributionId = contribution.id as string;

    stage = "create_participant";
    const { error: participantError } = await admin
      .from("task_contribution_participants")
      .insert({
        contribution_id: contributionId,
        member_id: memberId,
        share_weight: 1,
      });
    if (participantError) throw participantError;

    stage = "archive_member";
    await transferCreatorAndArchive(admin, memberId);

    stage = "backdate_departure";
    const { error: dateError } = await admin
      .from("members")
      .update({ left_at: leftAt })
      .eq("id", memberId);
    if (dateError) throw dateError;

    stage = "delete_temp_auth_user";
    if (authUserId) {
      const { error: deleteAuthError } = await admin.auth.admin.deleteUser(authUserId);
      if (deleteAuthError) throw deleteAuthError;
      authUserId = null;
    }

    return NextResponse.json({
      success: true,
      testMemberName: `${TEST_PREFIX} ${marker}`,
      stage: "complete",
    });
  } catch (error) {
    const diagnostic = errorMessage(error);

    // Best-effort cleanup. Failures here must not hide the original diagnostic.
    try {
      if (contributionId) {
        await admin.from("task_contribution_participants").delete().eq("contribution_id", contributionId);
        await admin.from("task_contributions").delete().eq("id", contributionId);
      }
      if (taskId) await admin.from("tasks").delete().eq("id", taskId);
      if (memberId) await admin.from("members").delete().eq("id", memberId);
      if (authUserId) await admin.auth.admin.deleteUser(authUserId);
    } catch {}

    return NextResponse.json(
      {
        error: "Échec du test historique",
        stage,
        diagnostic,
      },
      { status: 500 }
    );
  }
}
