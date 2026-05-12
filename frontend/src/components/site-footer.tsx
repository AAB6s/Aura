import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center size-9 rounded-xl bg-aura-gradient shadow-soft motion-icon">
              <Shield className="size-5 text-primary-foreground" aria-hidden />
            </span>
            <span className="font-display text-xl">AURA</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-md">
            L'intelligence artificielle au service de la protection, du soutien et de la dignité des
            femmes. Une plateforme calme, sûre et accessible.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            En cas d'urgence immédiate, composez le{" "}
            <strong className="text-foreground">3919</strong> (France) — appel anonyme et gratuit.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Plateforme</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/models" className="hover:text-foreground motion-link inline-flex">
                Nos outils
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground motion-link inline-flex">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/resources" className="hover:text-foreground motion-link inline-flex">
                Ressources
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground motion-link inline-flex">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Légal</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="#" className="hover:text-foreground">
                Confidentialité
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">
                Accessibilité
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">
                Conditions
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} AURA. Tous droits réservés.</p>
          <p>Conçu avec soin pour celles qui en ont besoin.</p>
        </div>
      </div>
    </footer>
  );
}
