import Link from "next/link";
import { CoursesSectionNav } from "@/components/CoursesSectionNav";

export function CoursesSectionIntroduction({ title, description, status }: { title: string; description: string; status: string }) {
  return (
    <main className="min-h-[70dvh] pb-28 pt-8">
      <header className="px-5 pb-5">
        <Link href="/app/courses" className="text-sm text-muted underline underline-offset-4">← Mes courses</Link>
        <h1 className="mt-4 font-serif text-3xl text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </header>
      <CoursesSectionNav />
      <section className="mx-5 rounded-2xl border border-line bg-surface p-5" aria-label="État du module">
        <p className="text-sm font-semibold text-ink">Module en préparation</p>
        <p className="mt-2 text-sm leading-6 text-muted">{status}</p>
        <p className="mt-3 text-xs text-muted">Aucune donnée fictive n'est affichée et aucun stock ni repas n'est modifié.</p>
      </section>
    </main>
  );
}
