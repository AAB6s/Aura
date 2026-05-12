import { createRootRouteWithContext, HeadContent, Outlet, Scripts, useRouter, Link } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatbotWidget } from "@/components/chatbot-widget";

function NotFoundComponent() {
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-soft-gradient">
      <div className="text-center max-w-md">
        <p className="text-sm font-medium text-primary">Page introuvable</p>
        <h1 className="mt-2 text-5xl font-display">404</h1>
        <p className="mt-3 text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
        <Link to="/" className="mt-6 inline-flex px-5 py-2.5 rounded-full bg-aura-gradient text-primary-foreground font-semibold shadow-soft">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
        >Réessayer</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AURA — IA au service de la protection des femmes" },
      { name: "description", content: "AURA est une plateforme d'intelligence artificielle dédiée à la prévention des violences faites aux femmes : détection, soutien et ressources." },
      { name: "theme-color", content: "#b9a8ff" },
      { property: "og:title", content: "AURA — IA au service de la protection des femmes" },
      { property: "og:description", content: "Détection, prévention et soutien grâce à l'IA. Une plateforme calme, sûre et accessible." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">
        Aller au contenu principal
      </a>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
      <ChatbotWidget />
    </QueryClientProvider>
  );
}
