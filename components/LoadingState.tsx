"use client";

import { CheckSquare } from "lucide-react";

export function LoadingState() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center animate-pulse">
        <CheckSquare size={18} color="#F0EFE6" strokeWidth={2} />
      </div>
    </div>
  );
}
