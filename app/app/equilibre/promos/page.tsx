"use client";

import { Header } from "@/components/Header";
import { LoadingState } from "@/components/LoadingState";
import { PromosView } from "@/components/PromosView";
import { useT } from "@/lib/language-context";
import { useHousehold } from "@/lib/use-household";

export default function PromosPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();

  if (loading || !household) return <LoadingState />;

  return (
    <div>
      <div className="px-5 pt-8">
        <Header title={t("promos_title")} />
      </div>
      <PromosView household={household} me={me} members={members} supabase={supabase} />
    </div>
  );
}
