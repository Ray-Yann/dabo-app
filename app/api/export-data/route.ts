import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyUserToken } from "@/lib/supabase-admin";
import { buildReadableDaboExport } from "@/lib/readable-data-export";

export async function GET(req: NextRequest) {
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
  const userId = userData.id;

  const { data: authUserData, error: authUserError } =
    await admin.auth.admin.getUserById(userId);

  if (authUserError) {
    console.error("DABO portability auth export failed", authUserError);
    return NextResponse.json({ error: "Impossible de préparer l'export" }, { status: 500 });
  }

  const { data: memberships, error: membershipsError } = await admin
    .from("members")
    .select("id, household_id, first_name, role, avatar_color, avatar_emoji, created_at, left_at")
    .eq("user_id", userId);

  if (membershipsError) {
    return NextResponse.json({ error: "Impossible de préparer l'export" }, { status: 500 });
  }

  const activeMemberships = (memberships || []).filter((membership) => !membership.left_at);
  const memberIds = activeMemberships.map((membership) => membership.id);
  const householdIds = [...new Set(activeMemberships.map((membership) => membership.household_id))];

  const [
    householdsResult,
    navigationResult,
    tutorialResult,
    lifeContextsResult,
    perceptionsResult,
    personalEventsResult,
    pendingTasksResult,
    contributionParticipantsResult,
    subtasksResult,
    shoppingToBuyResult,
    shoppingBoughtResult,
  ] = await Promise.all([
    householdIds.length
      ? admin
          .from("households")
          .select("id, name, household_type, country_code, created_at")
          .in("id", householdIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("user_navigation_preferences")
      .select("pinned_tabs, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("user_tutorial_preferences")
      .select("tutorial_enabled, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    memberIds.length
      ? admin
          .from("member_life_contexts")
          .select("id, household_id, member_id, context_type, impact, starts_on, ends_on, created_at, updated_at")
          .in("member_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    memberIds.length
      ? admin
          .from("member_load_perceptions")
          .select("id, household_id, member_id, perception, declared_at, created_at")
          .in("member_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    memberIds.length
      ? admin
          .from("calendar_events")
          .select("id, household_id, title, event_date, event_time, recurring, recurrence_frequency, recurrence_interval, recurrence_end_date, reminder_days_before, time_zone, created_at")
          .eq("visibility", "personal")
          .in("private_owner_id", memberIds)
      : Promise.resolve({ data: [], error: null }),

    memberIds.length
      ? admin
          .from("tasks")
          .select("id, household_id, routine_id, name, weight_points, assigned_to, status, due_date, urgent, duration_key, effort_level, created_at")
          .eq("status", "pending")
          .in("assigned_to", memberIds)
      : Promise.resolve({ data: [], error: null }),

    memberIds.length
      ? admin
          .from("task_contribution_participants")
          .select("contribution_id, member_id, share_weight")
          .in("member_id", memberIds)
      : Promise.resolve({ data: [], error: null }),

    memberIds.length
      ? admin
          .from("task_subtasks")
          .select("id, household_id, task_id, name, assigned_to, position, completed_at, completed_by, created_at")
          .or(`assigned_to.in.(${memberIds.join(",")}),completed_by.in.(${memberIds.join(",")})`)
      : Promise.resolve({ data: [], error: null }),

    memberIds.length
      ? admin
          .from("shopping_items")
          .select("id, household_id, name, quantity, assigned_to, status, urgent, due_date, store_name, created_at")
          .eq("status", "to_buy")
          .in("assigned_to", memberIds)
      : Promise.resolve({ data: [], error: null }),

    memberIds.length
      ? admin
          .from("shopping_items")
          .select("id, household_id, name, quantity, status, bought_at, bought_by_member_id, store_name, created_at")
          .eq("status", "bought")
          .in("bought_by_member_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const personalEventIds = (personalEventsResult.data || []).map(
    (event) => event.id
  );

  const calendarCompletionsResult = personalEventIds.length
    ? await admin
        .from("calendar_event_completions")
        .select("event_id, occurrence_date, completed_by, completed_at")
        .in("event_id", personalEventIds)
    : { data: [], error: null };

  const queryError =
    householdsResult.error ||
    navigationResult.error ||
    tutorialResult.error ||
    lifeContextsResult.error ||
    perceptionsResult.error ||
    personalEventsResult.error ||
    calendarCompletionsResult.error ||
    pendingTasksResult.error ||
    contributionParticipantsResult.error ||
    subtasksResult.error ||
    shoppingToBuyResult.error ||
    shoppingBoughtResult.error;

  if (queryError) {
    console.error("DABO portability export failed", queryError);
    return NextResponse.json({ error: "Impossible de préparer l'export" }, { status: 500 });
  }

  const exportedAt = new Date().toISOString();

  const personalParticipantRows = contributionParticipantsResult.data || [];
  const personalContributionIds = [
    ...new Set(personalParticipantRows.map((row) => row.contribution_id)),
  ];

  const contributionsResult = personalContributionIds.length
    ? await admin
        .from("task_contributions")
        .select("id, task_id, household_id, completed_at, duration_key, effort_level, weight_points, performer_status, cancelled_at")
        .in("id", personalContributionIds)
        .eq("performer_status", "confirmed")
        .is("cancelled_at", null)
    : { data: [], error: null };

  if (contributionsResult.error) {
    console.error(
      "DABO portability contribution export failed",
      contributionsResult.error
    );
    return NextResponse.json(
      { error: "Impossible de préparer l'export" },
      { status: 500 }
    );
  }

  const personalTaskIds = [
    ...new Set(
      (contributionsResult.data || [])
        .map((row) => row.task_id)
        .filter((taskId): taskId is string => Boolean(taskId))
    ),
  ];

  const contributionTasksResult = personalTaskIds.length
    ? await admin
        .from("tasks")
        .select("id, household_id, name")
        .in("id", personalTaskIds)
    : { data: [], error: null };

  if (contributionTasksResult.error) {
    console.error(
      "DABO portability task-name export failed",
      contributionTasksResult.error
    );
    return NextResponse.json(
      { error: "Impossible de préparer l'export" },
      { status: 500 }
    );
  }

  const personalContributions = (contributionsResult.data || []).map((row) => ({
    ...row,
    task_name:
      (contributionTasksResult.data || []).find(
        (task) => task.id === row.task_id
      )?.name ?? null,
    participation: personalParticipantRows
      .filter((participant) => participant.contribution_id === row.id)
      .map((participant) => ({
        member_id: participant.member_id,
        share_weight: participant.share_weight,
      })),
  }));

  const personalSubtaskRows = (subtasksResult.data || []).filter(
    (row) =>
      (row.completed_by && memberIds.includes(row.completed_by)) ||
      (row.assigned_to && memberIds.includes(row.assigned_to))
  );

  const personalSubtaskTaskIds = [
    ...new Set(
      personalSubtaskRows
        .map((row) => row.task_id)
        .filter((taskId): taskId is string => Boolean(taskId))
    ),
  ];

  const subtaskParentTasksResult = personalSubtaskTaskIds.length
    ? await admin
        .from("tasks")
        .select("id, household_id, name")
        .in("id", personalSubtaskTaskIds)
    : { data: [], error: null };

  if (subtaskParentTasksResult.error) {
    console.error(
      "DABO portability subtask parent export failed",
      subtaskParentTasksResult.error
    );
    return NextResponse.json(
      { error: "Impossible de préparer l'export" },
      { status: 500 }
    );
  }

  const personalSubtasks = personalSubtaskRows.map((row) => ({
    ...row,
    parent_task_name:
      (subtaskParentTasksResult.data || []).find(
        (task) => task.id === row.task_id
      )?.name ?? null,
  }));

  const payload = {
    format: "dabo-portability-v1",
    exportedAt,
    account: {
      id: userId,
      email: authUserData.user?.email ?? null,
    },
    households: activeMemberships.map((membership) => {
      const household = (householdsResult.data || []).find(
        (item) => item.id === membership.household_id
      );

      return {
        membership: {
          id: membership.id,
          firstName: membership.first_name,
          role: membership.role,
          avatarColor: membership.avatar_color,
          avatarEmoji: membership.avatar_emoji,
          joinedAt: membership.created_at,
        },
        household: household
          ? {
              id: household.id,
              name: household.name,
              type: household.household_type,
              countryCode: household.country_code,
              createdAt: household.created_at,
            }
          : null,
      };
    }),
    personalData: {
      navigationPreferences: navigationResult.data ?? null,
      tutorialPreferences: tutorialResult.data ?? null,
      lifeContexts: lifeContextsResult.data || [],
      loadPerceptions: perceptionsResult.data || [],
      personalCalendarEvents: personalEventsResult.data || [],
      calendarCompletions: calendarCompletionsResult.data || [],
      tasks: {
        assignedPending: pendingTasksResult.data || [],
        completedContributions: personalContributions,
        subtasks: personalSubtasks,
      },
      shopping: {
        assignedToBuy: shoppingToBuyResult.data || [],
        boughtByMe: shoppingBoughtResult.data || [],
      },
    },
  };

  const date = exportedAt.slice(0, 10);
  const requestedFormat = req.nextUrl.searchParams.get("format");
  const requestedLang = req.nextUrl.searchParams.get("lang");
  const readableLanguages = ["fr", "nl", "en", "de", "es", "it", "pt"] as const;
  const readableLang = readableLanguages.includes(
    requestedLang as (typeof readableLanguages)[number]
  )
    ? (requestedLang as (typeof readableLanguages)[number])
    : "fr";

  if (requestedFormat === "readable") {
    const html = buildReadableDaboExport(payload, readableLang);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="dabo-data-${date}.html"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dabo-data-${date}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
