"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Household, Member } from "@/lib/types";

type HouseholdContextValue = {
  loading: boolean;
  loadError: boolean;
  household: Household | null;
  me: Member | null;
  members: Member[];
  allMembers: Member[];
  memberships: HouseholdMembership[];
  switchHousehold: (householdId: string) => Promise<void>;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  supabase: ReturnType<typeof createClient>;
};

export type HouseholdMembership = {
  household: Household;
  member: Member;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<HouseholdMembership[]>([]);

  const activeHouseholdKey = "dabo-active-household";

  const refresh = useCallback(async () => {
    setLoadError(false);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        setLoading(false);
        router.replace("/");
        return;
      }

      const { data: myMembers, error: myMembersError } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .is("left_at", null)
        .order("created_at", { ascending: true });
      if (myMembersError) throw myMembersError;

      const activeMemberships = (myMembers as Member[] | null) || [];
      const storedHouseholdId = window.localStorage.getItem(activeHouseholdKey);
      const myMember = activeMemberships.find((member) => member.household_id === storedHouseholdId)
        || activeMemberships[0];

      if (!myMember) {
        setLoading(false);
        router.replace("/");
        return;
      }

      const householdIds = activeMemberships.map((member) => member.household_id);
      const { data: householdRows, error: householdsError } = await supabase
        .from("households")
        .select("*")
        .in("id", householdIds);
      if (householdsError) throw householdsError;

      const availableHouseholds = (householdRows as Household[] | null) || [];
      const nextMemberships = activeMemberships.flatMap((member) => {
        const memberHousehold = availableHouseholds.find((item) => item.id === member.household_id);
        return memberHousehold ? [{ household: memberHousehold, member }] : [];
      });
      const householdData = availableHouseholds.find((item) => item.id === myMember.household_id) || null;
      if (!householdData) throw new Error("ACTIVE_HOUSEHOLD_UNAVAILABLE");

      const { data: householdMembers, error: householdMembersError } = await supabase
        .from("members")
        .select("*")
        .eq("household_id", myMember.household_id)
        .order("rotation_order", { ascending: true });
      if (householdMembersError) throw householdMembersError;

      const historicalMembers = (householdMembers as Member[]) || [];
      window.localStorage.setItem(activeHouseholdKey, myMember.household_id);
      setMemberships(nextMemberships);
      setMe(myMember);
      setHousehold(householdData);
      setAllMembers(historicalMembers);
      setMembers(historicalMembers.filter((member) => !member.left_at && member.user_id));
      setLoading(false);
    } catch (error) {
      console.error("[DABO] household load failed", error instanceof Error ? { name: error.name, message: error.message } : { name: "UnknownError" });
      setLoading(false);
      setLoadError(true);
    }
  }, [router, supabase]);

  const retry = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    await refresh();
  }, [refresh]);

  const switchHousehold = useCallback(async (householdId: string) => {
    window.localStorage.setItem(activeHouseholdKey, householdId);
    setLoading(true);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <HouseholdContext.Provider value={{ loading, loadError, household, me, members, allMembers, memberships, switchHousehold, refresh, retry, supabase }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) {
    throw new Error("useHousehold doit être utilisé à l'intérieur de HouseholdProvider");
  }
  return ctx;
}
