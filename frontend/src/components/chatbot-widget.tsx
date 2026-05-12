import { useState } from "react";
import { HandHeart, X, SendHorizonal } from "lucide-react";

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="w-[360px] sm:w-[420px] lg:w-[460px] h-[520px] sm:h-[560px] rounded-3xl border border-border bg-card shadow-glow overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3 px-5 py-4 bg-aura-gradient text-primary-foreground">
            <div>
              <p className="text-sm font-semibold">AURA · Assistante</p>
              <p className="text-xs text-primary-foreground/80">Confidentiel et bienveillant</p>
            </div>
            <button
              type="button"
              className="grid place-items-center size-9 rounded-full bg-white text-foreground shadow-soft hover:bg-white/90 transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Fermer le chat"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
            <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm text-foreground">
              Bonjour, je suis AURA. Comment puis-je vous aider aujourd'hui ?
            </div>
            <div className="max-w-[85%] rounded-2xl bg-primary/10 px-3 py-2 text-sm text-foreground">
              Vous pouvez m'expliquer votre situation, je suis là pour vous accompagner.
            </div>
          </div>

          <div className="border-t border-border px-4 py-3">
            <form className="flex items-center gap-2">
              <input
                type="text"
                className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Écrivez votre message..."
                aria-label="Message"
              />
              <button
                type="button"
                className="grid place-items-center size-11 rounded-full bg-aura-gradient text-primary-foreground shadow-soft hover:shadow-glow transition-shadow"
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
          className="grid place-items-center size-14 rounded-full bg-aura-gradient text-primary-foreground shadow-glow hover:shadow-soft transition-shadow"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le chat"
        >
          <HandHeart className="size-6" aria-hidden />
        </button>
      )}
    </div>
  );
}
