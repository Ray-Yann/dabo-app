import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyUserToken } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userData = await verifyUserToken(token);
  if (!userData) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const contributionId = typeof body.contributionId === "string" ? body.contributionId : "";
  const rawMemberIds: unknown[] = Array.isArray(body.memberIds) ? body.memberIds : [];
  const memberIds: string[] = [...new Set(rawMemberIds.filter((id): id is string => typeof id === "string" && id.length > 0))];

  if (!contributionId || memberIds.length === 0) {
    return NextResponse.json({ error: "Contribution ou membre invalide" }, { status: 400 });
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

  const { data: contribution, error: contributionError } = await admin
    .from("task_contributions")
    .select("id, household_id, performer_status, cancelled_at")
    .eq("id", contributionId)
    .maybeSingle();

  if (contributionError || !contribution || contribution.cancelled_at) {
    return NextResponse.json({ error: "Contribution introuvable" }, { status: 404 });
  }
  if (contribution.household_id !== caller.household_id) {
    return NextResponse.json({ error: "Contribution hors foyer" }, { status: 403 });
  }
  if (contribution.performer_status !== "confirmed") {
    return NextResponse.json({ error: "Cette contribution doit d’abord être confirmée" }, { status: 409 });
  }

  const { data: currentParticipants, error: participantError } = await admin
    .from("task_contribution_participants")
    .select("member_id")
    .eq("contribution_id", contributionId);

  if (participantError) {
    return NextResponse.json({ error: "Impossible de lire la contribution" }, { status: 500 });
  }

  const typedParticipants = (currentParticipants || []) as Array<{ member_id: string }>;
  const callerCanEdit = typedParticipants.some((participant) => participant.member_id === caller.id);
  if (!callerCanEdit) {
    return NextResponse.json({ error: "Seul un participant à cette contribution peut la corriger" }, { status: 403 });
  }

  const { data: targetMembers, error: targetError } = await admin
    .from("members")
    .select("id")
    .eq("household_id", caller.household_id)
    .is("left_at", null)
    .in("id", memberIds);

  if (targetError || !targetMembers || targetMembers.length !== memberIds.length) {
    return NextResponse.json({ error: "Un membre sélectionné n’est plus actif dans le foyer" }, { status: 400 });
  }

  const rows = memberIds.map((memberId) => ({
    contribution_id: contributionId,
    member_id: memberId,
    share_weight: 1,
  }));

  const { error: upsertError } = await admin
    .from("task_contribution_participants")
    .upsert(rows, { onConflict: "contribution_id,member_id" });

  if (upsertError) {
    return NextResponse.json({ error: "Impossible de mettre à jour les participants" }, { status: 500 });
  }

  const idsToRemove = typedParticipants
    .map((participant) => participant.member_id)
    .filter((memberId) => !memberIds.includes(memberId));

  if (idsToRemove.length > 0) {
    const { error: deleteError } = await admin
      .from("task_contribution_participants")
      .delete()
      .eq("contribution_id", contributionId)
      .in("member_id", idsToRemove);

    if (deleteError) {
      return NextResponse.json({ error: "Impossible de finaliser la correction" }, { status: 500 });
    }
  }

  const { error: updateError } = await admin
    .from("task_contributions")
    .update({
      updated_by: caller.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contributionId);

  if (updateError) {
    return NextResponse.json({ error: "Impossible de finaliser la contribution" }, { status: 500 });
  }

  return NextResponse.json({ success: true, memberIds });
}
