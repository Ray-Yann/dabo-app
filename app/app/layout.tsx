"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, ShoppingBag, ListChecks, Scale, Settings, Tag } from "lucide-react";

const TABS = [
  { href: "/app", icon: Home, label: "Aujourd'hui" },
  { href: "/app/courses", icon: ShoppingBag, label: "Courses" },
  { href: "/app/taches", icon: ListChecks, label: "Tâches" },
  { href: "/app/equilibre", icon: Scale, label: "Équilibre" },
  { href: "/app/promos", icon: Tag, label: "Promos" },
  { href: "/app/reglages", icon: Settings, label: "Réglages" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="flex-1 max-w-lg mx-auto w-full pb-24">{children}</div>
      <div className="fixed bottom-0 left-0 right-0 bg-paper border-t border-borderLight">
        <div className="max-w-lg mx-auto grid grid-cols-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = pathname === t.href;
            return (
              <button
                key={t.href}
                onClick={() => router.push(t.href)}
                className="flex flex-col items-center justify-center py-3 gap-1"
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 1.8} className={active ? "text-ink" : "text-border"} />
                <span className={`text-[9px] ${active ? "text-ink font-medium" : "text-border"}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
