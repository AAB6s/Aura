import { useEffect, useState } from "react";
import { HandHeart, X, SendHorizonal } from "lucide-react";

type ChatRole = "user" | "assistant";
type ChatMode = "psychologique" | "juridique";
type ChatMessage = { role: ChatRole; content: string };

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const PSYCHO_API_URL = `${API_BASE_URL}/chat/psychologique`;

const getInitialMessages = (mode: ChatMode): ChatMessage[] => {
  if (mode === "juridique") {
    return [
      {
        role: "assistant",
        content:
          "Bonjour, je suis AURA Juridique. Decrivez votre situation et je vous guide.",
      },
    ];
  }

  return [
    {
      role: "assistant",
      content: "Bonjour, je suis AURA. Comment puis-je vous aider aujourd'hui ?",
    },
    {
      role: "assistant",
      content: "Vous pouvez m'expliquer votre situation, je suis la pour vous accompagner.",
    },
  ];
};

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("psychologique");
  const [messages, setMessages] = useState<ChatMessage[]>(() => getInitialMessages("psychologique"));
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMessages(getInitialMessages(mode));
    setDraft("");
  }, [mode]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const text = draft.trim();
    if (!text) return;

    setSending(true);
    setDraft("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      if (mode === "psychologique") {
        const response = await fetch(PSYCHO_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, mode: "text", history: [] }),
        });

        if (!response.ok) {
          throw new Error("Service psychologique indisponible.");
        }

        const payload = await response.json().catch(() => ({}));
        const passages = Array.isArray(payload.results) ? payload.results : [];
        const reply =
          passages.length > 0
            ? passages
                .map((item: { passage?: string; score?: number }) => {
                  const line = item.passage ?? "";
                  const score = typeof item.score === "number" ? ` (${item.score.toFixed(2)})` : "";
                  return line ? `• ${line}${score}` : "";
                })
                .filter(Boolean)
                .join("\n")
            : "Je n'ai rien trouve de pertinent pour le moment.";

        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } else {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Merci de partager cela. Je suis la pour vous ecouter. Voulez-vous des conseils ou un soutien immediat ?",
            },
          ]);
        }, 600);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Une erreur est survenue, reessayez dans un instant.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="w-[360px] sm:w-[420px] lg:w-[460px] h-[520px] sm:h-[560px] rounded-3xl border border-border bg-card shadow-glow overflow-hidden flex flex-col motion-in">
          <div className="flex items-center justify-between gap-3 px-5 py-4 bg-aura-gradient text-primary-foreground">
            <div>
              <p className="text-sm font-semibold">AURA · Assistante</p>
              <p className="text-xs text-primary-foreground/80">Confidentiel et bienveillant</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="chat-mode" className="sr-only">
                Choisir le mode du chatbot
              </label>
              <select
                id="chat-mode"
                value={mode}
                onChange={(event) => setMode(event.target.value as ChatMode)}
                className="h-8 rounded-full border border-white/40 bg-white/15 px-3 text-xs text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <option value="psychologique">Psychologique</option>
                <option value="juridique">Juridique</option>
              </select>
              <button
                type="button"
                className="grid place-items-center size-9 rounded-full bg-white text-foreground shadow-soft hover:bg-white/90 transition-colors motion-button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le chat"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm text-foreground motion-in ${
                  message.role === "assistant" ? "bg-muted" : "bg-primary/10 ml-auto"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>

          <div className="border-t border-border px-4 py-3">
            <form className="flex items-center gap-2" onSubmit={sendMessage}>
              <input
                type="text"
                className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-focus"
                placeholder="Écrivez votre message..."
                aria-label="Message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button
                type="submit"
                className="grid place-items-center size-11 rounded-full bg-aura-gradient text-primary-foreground shadow-soft hover:shadow-glow transition-shadow motion-button"
                aria-label="Envoyer"
                disabled={sending}
              >
                <SendHorizonal className="size-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="grid place-items-center size-14 rounded-full bg-aura-gradient text-primary-foreground shadow-glow hover:shadow-soft transition-shadow motion-button motion-pulse"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le chat"
        >
          <HandHeart className="size-6" aria-hidden />
        </button>
      )}
    </div>
  );
}
