"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Refrigerator, ShoppingBasket } from "lucide-react";
import { useT } from "@/lib/language-context";

const sections = [
  { href: "/app/courses", key: "courses_title", fallback: "Mes courses", icon: ShoppingBasket },
  { href: "/app/courses/recettes", key: "", fallback: "Recettes", icon: BookOpen },
  { href: "/app/courses/repas", key: "", fallback: "Mes repas", icon: CalendarDays },
  { href: "/app/courses/reserves", key: "", fallback: "Mes réserves", icon: Refrigerator },
] as const;

export function CoursesSectionNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav aria-label="Navigation de Courses" className="mx-5 mb-5 grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-surface p-1.5">
      {sections.map(({ href, key, fallback, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-center text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${active ? "bg-ink text-paper" : "text-ink hover:bg-paper"}`}>
            <Icon size={18} aria-hidden="true" />
            <span>{key ? t(key) : fallback}</span>
          </Link>
        );
      })}
    </nav>
  );
}
