"use client";

import { EmptyState as DaboEmptyState } from "@/components/dabo/EmptyState";

export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel: string; onAction: () => void }) {
  return <DaboEmptyState title={message} actionLabel={actionLabel} onAction={onAction} />;
}
