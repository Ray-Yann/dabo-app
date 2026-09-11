"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Household, Member } from "@/lib/types";

type HouseholdContextValue = {
  loading: boolean;
  household: Household | null;
  me: Member | null;
  members: Member[];
  allMembers: Member[];
  memberships: HouseholdMembership[];
  switchHousehold: (householdId: string) => Promise<void>;
  refresh: () => Promise<void>;
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
  const [household, setHousehold] = useState<Household | null>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<HouseholdMembership[]>([]);

  const activeHouseholdKey = "dabo-active-household";

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
      .is("left_at", null)
      .order("created_at", { ascending: true });

    const activeMemberships = (myMembers as Member[] | null) || [];
    const storedHouseholdId = window.localStorage.getItem(activeHouseholdKey);
    const myMember = activeMemberships.find((member) => member.household_id === storedHouseholdId)
      || activeMemberships[0];

    if (!myMember) {
      router.replace("/");
      return;
    }
    const householdIds = activeMemberships.map((member) => member.household_id);
    const { data: householdRows } = await supabase
      .from("households")
      .select("*")
      .in("id", householdIds);

    const availableHouseholds = (householdRows as Household[] | null) || [];
    const nextMemberships = activeMemberships.flatMap((member) => {
      const memberHousehold = availableHouseholds.find((item) => item.id === member.household_id);
      return memberHousehold ? [{ household: memberHousehold, member }] : [];
    });
    const householdData = availableHouseholds.find((item) => item.id === myMember.household_id) || null;

    window.localStorage.setItem(activeHouseholdKey, myMember.household_id);
    setMemberships(nextMemberships);
    setMe(myMember);
    setHousehold(householdData);

    const { data: householdMembers } = await supabase
      .from("members")
      .select("*")
      .eq("household_id", myMember.household_id)
      .order("rotation_order", { ascending: true });

    const historicalMembers = (householdMembers as Member[]) || [];
    setAllMembers(historicalMembers);
    setMembers(historicalMembers.filter((member) => !member.left_at && member.user_id));

    setLoading(false);
  }, []);

  const switchHousehold = useCallback(async (householdId: string) => {
    window.localStorage.setItem(activeHouseholdKey, householdId);
    setLoading(true);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return (
    <HouseholdContext.Provider value={{ loading, household, me, members, allMembers, memberships, switchHousehold, refresh, supabase }}>
      {children}
    </HouseholdContext.Provider>
  );
}

// Chaque écran continue d'appeler useHousehold() exactement comme avant —
// mais tous lisent désormais la même donnée partagée, mise à jour une seule
// fois pour toute l'app dès qu'un écran appelle refresh().
export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) {
    throw new Error("useHousehold doit être utilisé à l'intérieur de HouseholdProvider");
  }
  return ctx;
}
