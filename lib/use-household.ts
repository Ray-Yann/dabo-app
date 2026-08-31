"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Household, Member } from "@/lib/types";

export function useHousehold() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.replace("/");
      return;
    }
    const { data: myMembers } = await supabase
      .from("members")
      .select("*")
      .eq("user_id", sessionData.session.user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    const myMember = myMembers?.[0];

    if (!myMember) {
      router.replace("/");
      return;
    }
    setMe(myMember as Member);

    const { data: householdData } = await supabase
      .from("households")
      .select("*")
      .eq("id", myMember.household_id)
      .maybeSingle();
    setHousehold(householdData as Household);

    const { data: allMembers } = await supabase
      .from("members")
      .select("*")
      .eq("household_id", myMember.household_id)
      .order("rotation_order", { ascending: true });
    setMembers((allMembers as Member[]) || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { loading, household, me, members, refresh, supabase };
}
