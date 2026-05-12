import { createFileRoute, Link } from "@tanstack/react-router";
import heroImage from "@/assets/aura-hero.jpg";
import { aiModels } from "@/lib/ai-models";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  BrainCircuit,
  Lock,
  Accessibility,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURA — L'IA au service de la protection des femmes" },
      {
        name: "description",
        content:
          "Détection, prévention et soutien grâce à l'intelligence artificielle. Une plateforme calme, sûre et accessible.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 bg-soft-gradient" />
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <span
            className="blob bg-primary/40 size-[420px] -top-24 -left-24"
            style={{ ["--blob-d" as string]: "20s" }}
          />
          <span
            className="blob bg-secondary size-[360px] top-40 -right-20"
            style={{ ["--blob-d" as string]: "26s" }}
          />
          <span
            className="blob bg-accent size-[300px] bottom-0 left-1/3"
            style={{ ["--blob-d" as string]: "30s" }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-[fade-up_0.7s_ease-out]">
            <span className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              <Sparkles className="size-3.5 text-primary" aria-hidden /> Votre Plateforme IA ·
              Protection &amp; soutien
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-display font-semibold leading-[1.05] text-balance">
              L'intelligence artificielle au service de la{" "}
              <span className="text-primary">protection des femmes</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl text-balance">
              AURA détecte, prévient et vous accompagne face aux violences numériques et sociales —
              avec empathie, confidentialité et totale respect.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/models"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-aura-gradient text-primary-foreground font-semibold shadow-soft hover:shadow-glow transition-shadow motion-button"
              >
                Découvrir les outils <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-card border border-border text-foreground font-semibold hover:bg-muted transition-colors motion-button"
              >
                <HeartHandshake className="size-4 text-primary" aria-hidden /> Obtenir de l'aide
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { k: "5", v: "outils" },
                { k: "24/7", v: "soutien" },
                { k: "100%", v: "anonyme" },
              ].map((s) => (
                <div
                  key={s.v}
                  className="rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur motion-card"
                >
                  <dt className="text-xs text-muted-foreground">{s.v}</dt>
                  <dd className="text-2xl font-display">{s.k}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="relative rounded-[2rem] overflow-hidden border border-border bg-card shadow-glow motion-float">
              <img
                src={heroImage}
                alt="Illustration symbolisant la protection numérique des femmes"
                width={1408}
                height={1216}
                className="w-full h-auto"
              />
            </div>
            <div className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3 shadow-soft motion-in">
              <span className="grid place-items-center size-9 rounded-xl bg-primary/15 text-primary">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Confidentialité</p>
                <p className="text-sm font-semibold">Données chiffrées</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT / MISSION */}
      <section
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20"
        aria-labelledby="mission-title"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Notre mission</p>
          <h2 id="mission-title" className="mt-2 text-3xl sm:text-4xl font-display text-balance">
            Une technologie pensée pour protéger, écouter et agir.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            AURA met l'IA au service des victimes et des allié·e·s. Notre objectif : créer un espace
            numérique plus sûr, plus humain et plus juste.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: BrainCircuit,
              title: "Détecter",
              text: "Identifier les violences numériques et sociales en temps réel grâce à des modèles spécialisés.",
            },
            {
              icon: Lock,
              title: "Protéger",
              text: "Analyser et alerter de manière confidentielle, sans jamais exposer les victimes.",
            },
            {
              icon: Accessibility,
              title: "Soutenir",
              text: "Sensibiliser, orienter et accompagner avec empathie, à tout moment.",
            },
          ].map((f) => (
            <article
              key={f.title}
              className="group rounded-3xl border border-border bg-card p-6 hover:shadow-soft transition-shadow motion-card"
            >
              <span className="grid place-items-center size-11 rounded-2xl bg-primary/10 text-primary group-hover:bg-aura-gradient group-hover:text-primary-foreground transition-colors motion-icon">
                <f.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* MODELS */}
      <section
        id="models"
        className="bg-muted/30 border-y border-border/60"
        aria-labelledby="tools-title"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary">Nos outils</p>
              <h2 id="tools-title" className="mt-2 text-3xl sm:text-4xl font-display text-balance">
                5 outils spécialisés, une seule mission.
              </h2>
            </div>
            <Link to="/models" className="text-sm font-semibold text-primary hover:underline">
              Voir tous les outils →
            </Link>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {aiModels.map((m) => (
              <article
                key={m.slug}
                className="group rounded-3xl border border-border bg-card p-6 hover:shadow-soft hover:-translate-y-0.5 transition-all motion-card"
              >
                <span
                  className={`grid place-items-center size-11 rounded-2xl motion-icon ${m.accent}`}
                >
                  <m.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold leading-snug">{m.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
                <Link
                  to="/dashboard"
                  search={{ model: m.slug }}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2 transition-all motion-link"
                  aria-label={`Utiliser le modèle : ${m.name}`}
                >
                  Utiliser <ArrowRight className="size-4" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-aura-gradient p-10 sm:p-14 text-primary-foreground">
          <div
            aria-hidden
            className="absolute -right-10 -top-10 size-64 rounded-full bg-white/15 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-display text-balance">
              Vous n'êtes pas seule. AURA est là, à chaque étape.
            </h2>
            <p className="mt-3 text-primary-foreground/85 text-lg">
              Découvrez nos ressources et notre assistant de soutien — gratuit, anonyme et
              accessible 24h/24.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/resources"
                className="px-5 py-3 rounded-full bg-card text-foreground font-semibold shadow-soft hover:shadow-glow transition-shadow motion-button"
              >
                Explorer les ressources
              </Link>
              <Link
                to="/contact"
                className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-primary-foreground font-semibold border border-white/30 transition-colors motion-button"
              >
                Contacter une personne
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
