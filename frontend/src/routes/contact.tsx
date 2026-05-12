import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, MapPin, Phone, MessageCircle, Send, LifeBuoy, Bot, User } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & aide — AURA" },
      { name: "description", content: "Contactez l'équipe AURA, accédez à l'assistant IA de soutien ou aux numéros d'urgence." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Votre nom est requis").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  message: z.string().trim().min(5, "Message trop court").max(1000),
});

type Msg = { role: "user" | "assistant"; content: string };

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const [chat, setChat] = useState<Msg[]>([
    { role: "assistant", content: "Bonjour, je suis l'assistant AURA. Je suis là pour vous écouter en toute confidentialité. Comment puis-je vous aider aujourd'hui ?" },
  ]);
  const [draft, setDraft] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setSent(true);
    setForm({ name: "", email: "", message: "" });
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    setChat((c) => [...c, { role: "user", content: t }]);
    setDraft("");
    setTimeout(() => {
      setChat((c) => [...c, {
        role: "assistant",
        content: "Merci de partager cela. Vous n'êtes pas seule. Souhaitez-vous que je vous oriente vers un guide, un numéro d'aide ou une association proche ?",
      }]);
    }, 700);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Contact &amp; aide</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-display text-balance">Nous sommes là pour vous écouter.</h1>
        <p className="mt-4 text-muted-foreground text-lg">
          Une question, une suggestion, un besoin de soutien ? Contactez l'équipe AURA ou parlez à
          notre assistant.
        </p>
      </header>

      {/* Emergency */}
      <div className="mt-10 rounded-3xl border border-border bg-secondary/50 p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center size-11 rounded-2xl bg-primary/15 text-primary"><LifeBuoy className="size-5" aria-hidden /></span>
          <div>
            <p className="font-semibold">Besoin d'aide immédiate ?</p>
            <p className="text-sm text-muted-foreground">Le 3919 est un numéro anonyme et gratuit, disponible 24h/24 en France.</p>
          </div>
        </div>
        <a href="tel:3919" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-aura-gradient text-primary-foreground font-semibold shadow-soft">
          <Phone className="size-4" aria-hidden /> Appeler le 3919
        </a>
      </div>

      <div className="mt-12 grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-6 sm:p-8" noValidate>
          <h2 className="text-xl font-semibold">Écrivez-nous</h2>
          <p className="mt-1 text-sm text-muted-foreground">Réponse sous 48h ouvrées.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium">Nom</label>
              <input
                id="name" type="text" autoComplete="name"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
              />
              {errors.name && <p id="name-err" className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email" type="email" autoComplete="email"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
              />
              {errors.email && <p id="email-err" className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="message" className="text-sm font-medium">Message</label>
              <textarea
                id="message" rows={5}
                value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-err" : undefined}
                className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
              />
              {errors.message && <p id="message-err" className="mt-1 text-xs text-destructive">{errors.message}</p>}
            </div>
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-aura-gradient text-primary-foreground font-semibold shadow-soft">
              <Send className="size-4" aria-hidden /> Envoyer le message
            </button>
            {sent && <p role="status" className="text-sm text-primary">Merci, votre message a bien été envoyé.</p>}
          </div>

          <div className="mt-8 grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><Mail className="size-4 text-primary" aria-hidden /> contact@aura.app</p>
            <p className="flex items-center gap-2"><MapPin className="size-4 text-primary" aria-hidden /> Paris, France</p>
          </div>
        </form>

        {/* Chat */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 flex flex-col">
          <h2 className="text-xl font-semibold flex items-center gap-2"><MessageCircle className="size-5 text-primary" aria-hidden /> Assistant AURA</h2>
          <p className="mt-1 text-sm text-muted-foreground">Confidentiel · Anonyme · 24h/24</p>

          <div className="mt-5 flex-1 min-h-[300px] max-h-[440px] overflow-y-auto space-y-3 pr-1" aria-live="polite">
            {chat.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <span className="grid place-items-center size-8 rounded-full bg-primary/15 text-primary shrink-0"><Bot className="size-4" aria-hidden /></span>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-aura-gradient text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {m.content}
                </div>
                {m.role === "user" && (
                  <span className="grid place-items-center size-8 rounded-full bg-secondary text-secondary-foreground shrink-0"><User className="size-4" aria-hidden /></span>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={sendChat} className="mt-4 flex gap-2">
            <label htmlFor="chat-input" className="sr-only">Votre message</label>
            <input
              id="chat-input" value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder="Écrivez votre message…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button type="submit" className="grid place-items-center size-11 rounded-full bg-aura-gradient text-primary-foreground shadow-soft" aria-label="Envoyer">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
