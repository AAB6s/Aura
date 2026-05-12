import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/models", label: "Nos outils" },
  { to: "/resources", label: "Ressources" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/75 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" aria-label="AURA — Accueil">
          <span className="grid place-items-center size-9 rounded-xl bg-aura-gradient shadow-soft">
            <Shield className="size-5 text-primary-foreground" aria-hidden />
          </span>
          <span className="font-display text-xl tracking-tight">AURA</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Navigation principale">
          {links.map((l) => {
            const active = path === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/contact"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold bg-aura-gradient text-primary-foreground shadow-soft hover:shadow-glow transition-shadow"
          >
            Obtenir de l'aide
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <nav className="px-4 py-3 flex flex-col gap-1" aria-label="Navigation mobile">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 text-center px-4 py-2 rounded-full text-sm font-semibold bg-aura-gradient text-primary-foreground"
            >
              Obtenir de l'aide
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
