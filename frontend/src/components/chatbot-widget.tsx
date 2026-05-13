import { FormEvent, useMemo, useState } from "react";
import { HandHeart, X, SendHorizonal, Scale, WalletCards, HeartHandshake } from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

type Mode = "legal" | "finance" | "support";
type Message = { role: "assistant" | "user"; text: string };

const modes = {
  legal: {
    label: "Juridique",
    icon: Scale,
    intro: "Je peux vous aider a comprendre vos options juridiques et les demarches possibles.",
  },
  finance: {
    label: "Finance",
    icon: WalletCards,
    intro: "Je peux vous aider a organiser un plan financier simple et discret.",
  },
  support: {
    label: "Soutien psychologique",
    icon: HeartHandshake,
    intro: "Je peux vous aider a poser les choses calmement et identifier une prochaine action sure.",
  },
} satisfies Record<Mode, { label: string; icon: typeof Scale; intro: string }>;

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("legal");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Bonjour, je suis AURA. Choisissez un mode et decrivez votre situation." },
  ]);
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const ModeIcon = modes[mode].icon;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((items) => [...items, { role: "user", text }]);
    setLoading(true);
    try {
      const answer =
        mode === "legal" ? await askLegalModel(text, sessionId) : staticAnswer(mode, text);
      setMessages((items) => [...items, { role: "assistant", text: answer }]);
    } catch {
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: "Je n'arrive pas a joindre le modele pour le moment. En urgence, contactez les services d'urgence ou une personne de confiance.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="flex h-[560px] w-[360px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-glow motion-in sm:w-[430px]">
          <div className="bg-aura-gradient px-5 py-4 text-primary-foreground">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">AURA Assistante</p>
                <p className="text-xs text-primary-foreground/80">Confidentiel et bienveillant</p>
              </div>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full bg-white text-foreground shadow-soft motion-button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le chat"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <label className="mt-4 block">
              <span className="sr-only">Mode d'assistance</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as Mode)}
                className="h-11 w-full rounded-2xl border border-white/30 bg-white/95 px-3 text-sm font-semibold text-foreground shadow-soft"
              >
                {Object.entries(modes).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="border-b border-border bg-muted/35 px-5 py-3">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-background text-primary">
                <ModeIcon className="size-4" aria-hidden />
              </span>
              <p className="text-sm text-muted-foreground">{modes[mode].intro}</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed motion-in ${
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[88%] rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                Analyse en cours...
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-3">
            <form className="flex items-center gap-2" onSubmit={submit}>
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm motion-focus"
                placeholder="Ecrivez votre message..."
                aria-label="Message"
              />
              <button
                type="submit"
                disabled={loading}
                className="grid size-11 place-items-center rounded-full bg-aura-gradient text-primary-foreground shadow-soft disabled:opacity-50 motion-button"
                aria-label="Envoyer"
              >
                <SendHorizonal className="size-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="grid size-14 place-items-center rounded-full bg-aura-gradient text-primary-foreground shadow-glow motion-button motion-pulse"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le chat"
        >
          <HandHeart className="size-6" aria-hidden />
        </button>
      )}
    </div>
  );
}

async function askLegalModel(question: string, sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/document/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, session_id: sessionId }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Legal model unavailable");
  return String(payload?.answer ?? "Je n'ai pas encore assez d'elements pour repondre.");
}

function staticAnswer(mode: Exclude<Mode, "legal">, question: string) {
  if (mode === "finance") {
    return [
      "Voici une reponse pratique pour organiser la situation financiere:",
      "1. Identifiez les depenses urgentes: logement, transport, telephone, sante.",
      "2. Gardez une copie separee des documents importants et moyens de paiement.",
      "3. Preparez un petit budget de securite pour 7 jours si possible.",
      "4. Contactez une association locale ou un service social pour les aides disponibles.",
      question ? "Priorite: securiser les besoins essentiels avant toute decision longue." : "",
    ].filter(Boolean).join("\n");
  }
  return [
    "Je suis desolee que vous traversiez cela. Vous meritez d'etre ecoutee et en securite.",
    "Essayez de vous concentrer sur une action immediate et realiste: appeler une personne de confiance, vous eloigner d'un lieu dangereux, ou noter ce qui s'est passe.",
    "Si vous etes en danger immediat, contactez les services d'urgence. Si possible, gardez votre telephone charge et partagez votre localisation avec quelqu'un de fiable.",
    "Vous pouvez aussi me dire ce qui s'est passe en une phrase, et je vous aide a clarifier la prochaine etape.",
  ].join("\n");
}
