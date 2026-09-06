"use client";

import { useEffect, useState } from "react";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { IntroTip } from "@/components/IntroTip";
import { ContributionBalanceData, fetchContributionBalanceData } from "@/lib/task-contributions";

export default function BalancePage() {
  const { loading, household, members, supabase } = useHousehold();
  const [balanceData, setBalanceData] = useState<ContributionBalanceData>({ contributions: [], participants: [] });

  useEffect(() => {
    if (!household) return;
    fetchContributionBalanceData(supabase, household.id)
      .then(setBalanceData)
      .catch((error) => console.error("DABO balance load failed", error));
  }, [household, supabase]);

  if (loading || !household) return <div className="p-8 text-center text-muted">Chargement…</div>;

  return (
    <div>
      <Header eyebrow="Cette semaine" title="Équilibre" />
      <IntroTip id="balance" text="Chaque tâche terminée tient compte du temps et de l'effort réellement enregistrés. Ce bilan est un repère, pas un classement." />
      <div className="mx-5 mb-5 bg-white2 rounded-2xl p-5">
        {household.equity_score_enabled ? (
          <BalanceBar
            members={members}
            contributions={balanceData.contributions}
            participants={balanceData.participants}
            big
          />
        ) : (
          <p className="text-sm text-muted italic text-center py-4">Le score d&apos;équité est désactivé pour ce foyer.</p>
        )}
      </div>
      <p className="text-center text-xs text-muted italic mt-6">La contribution est un repère, pas un classement.</p>
    </div>
  );
}
