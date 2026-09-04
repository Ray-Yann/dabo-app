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
  refresh: () => Promise<void>;
  supabase: ReturnType<typeof createClient>;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return (
    <HouseholdContext.Provider value={{ loading, household, me, members, allMembers, refresh, supabase }}>
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
