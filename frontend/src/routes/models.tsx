import { createFileRoute, Link } from "@tanstack/react-router";
import { aiModels } from "@/lib/ai-models";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Nos outils — AURA" },
      { name: "description", content: "Découvrez les 5 outils d'AURA dédiés à la détection et à la prévention des violences faites aux femmes." },
    ],
  }),
  component: ModelsPage,
});

function ModelsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Nos outils</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-display text-balance">
          Choisissez un outil, conçu pour vous accompagner.
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          Des outils clairs et accessibles pour analyser images, audio et documents.
        </p>
      </header>

      <div className="mt-12 grid sm:grid-cols-2 xl:grid-cols-2 gap-7 max-w-5xl mx-auto">
        {aiModels.map((m) => (
          <article key={m.slug} className="rounded-3xl border border-border bg-card p-8 sm:p-9 hover:shadow-soft hover:-translate-y-0.5 transition-all">
            <span className={`grid place-items-center size-12 rounded-2xl ${m.accent}`}>
              <m.icon className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-xl font-semibold leading-snug">{m.name}</h2>
            <p className="mt-3 text-base text-muted-foreground">{m.description}</p>
            <Link
              to="/dashboard"
              search={{ model: m.slug }}
              className="mt-6 inline-flex items-center gap-1.5 text-base font-semibold text-primary hover:gap-2 transition-all"
            >
              Utiliser <ArrowRight className="size-4" aria-hidden />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
