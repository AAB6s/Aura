import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Phone, Users, HelpCircle, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Ressources & soutien — AURA" },
      {
        name: "description",
        content:
          "Guides, articles, numéros d'aide et organisations de soutien aux femmes victimes de violences.",
      },
    ],
  }),
  component: ResourcesPage,
});

const guides = [
  {
    title: "Reconnaître le cyberharcèlement",
    desc: "Signes, formes et premières actions à mener.",
  },
  {
    title: "Sécuriser ses comptes en ligne",
    desc: "Mots de passe, double authentification, vie privée.",
  },
  { title: "Soutenir une proche", desc: "Comment écouter, croire et orienter sans juger." },
];

const helplines = [
  {
    name: "3919 — Violences Femmes Info",
    desc: "Anonyme, gratuit, 24h/24, France.",
    phone: "3919",
  },
  { name: "Numéro d'urgence", desc: "Police-Secours, en cas de danger immédiat.", phone: "17" },
  { name: "Tchat en ligne", desc: "arretonslesviolences.gouv.fr", phone: "—" },
];

const orgs = [
  { name: "Solidarité Femmes", desc: "Réseau d'associations pour l'écoute et l'hébergement." },
  { name: "En Avant Toute(s)", desc: "Lutte contre les violences sexistes chez les jeunes." },
  { name: "Centre Hubertine Auclert", desc: "Ressources et études contre les cyberviolences." },
];

const faq = [
  {
    q: "Mes données sont-elles confidentielles ?",
    a: "Oui. AURA traite vos contenus de manière anonyme et chiffrée. Aucune donnée n'est revendue.",
  },
  {
    q: "AURA remplace-t-il un professionnel ?",
    a: "Non. AURA est un outil d'aide et d'orientation. Pour un soutien personnalisé, contactez les lignes d'aide.",
  },
  {
    q: "Puis-je utiliser AURA gratuitement ?",
    a: "Oui, l'accès aux modèles principaux et aux ressources est entièrement gratuit.",
  },
];

export function ResourcesPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Ressources</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-display text-balance">
          Comprendre, prévenir, agir.
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          Une sélection de contenus, contacts et organisations pour vous accompagner.
        </p>
      </header>

      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <BookOpen className="size-5 text-primary" aria-hidden /> Guides de prévention
        </h2>
        <div className="mt-6 grid md:grid-cols-3 gap-5">
          {guides.map((g) => (
            <article
              key={g.title}
              className="rounded-3xl border border-border bg-card p-6 hover:shadow-soft transition-shadow motion-card"
            >
              <h3 className="font-semibold">{g.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{g.desc}</p>
              <a
                href="#"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary motion-link"
              >
                Lire le guide <ArrowUpRight className="size-4" aria-hidden />
              </a>
            </article>
          ))}
        </div>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Phone className="size-5 text-primary" aria-hidden /> Numéros d'aide
        </h2>
        <div className="mt-6 grid md:grid-cols-3 gap-5">
          {helplines.map((h) => (
            <div key={h.name} className="rounded-3xl border border-border bg-card p-6 motion-card">
              <p className="text-3xl font-display text-primary">{h.phone}</p>
              <p className="mt-2 font-semibold">{h.name}</p>
              <p className="text-sm text-muted-foreground">{h.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Users className="size-5 text-primary" aria-hidden /> Organisations de soutien
        </h2>
        <div className="mt-6 grid md:grid-cols-3 gap-5">
          {orgs.map((o) => (
            <div key={o.name} className="rounded-3xl border border-border bg-card p-6 motion-card">
              <h3 className="font-semibold">{o.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{o.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <HelpCircle className="size-5 text-primary" aria-hidden /> Questions fréquentes
        </h2>
        <div className="mt-6 divide-y divide-border rounded-3xl border border-border bg-card overflow-hidden">
          {faq.map((f) => (
            <details key={f.q} className="group p-5 motion-in">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium">
                {f.q}
                <span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
