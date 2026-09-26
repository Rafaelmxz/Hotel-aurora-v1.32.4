import { useLayoutEffect } from "react";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { getQueryClient } from "@/lib/query-client";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/features/layout/AppShell";
import {
  bootVaultFromLocal,
  ensureVaultRestored,
  resetVaultRestore,
  restorePublicStay,
  setVaultMode,
} from "@/lib/hotel/hydrate";
import appCss from "../styles.css?url";

const APP_NAME = "Hotel Aurora";

const fetchSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const u = await getSessionUser();
  return u ? { id: u.id, email: u.email } : null;
});

export const Route = createRootRoute({
  beforeLoad: async () => ({ sessionUser: await fetchSessionUser() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#2f5454" },
      {
        name: "description",
        content: "Protótipo de gestão hoteleira do Hotel Aurora — painel e calendário.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect", href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function VaultHydrator() {
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useLayoutEffect(() => {
    const isLogin = pathname === "/login";
    const isPublic =
      isLogin || pathname === "/reservar" || pathname.startsWith("/reservar/");
    resetVaultRestore();
    if (isLogin) return;
    if (isPublic) {
      setVaultMode("public");
      void restorePublicStay().then(() => {
        void queryClient.invalidateQueries();
      });
      return;
    }
    setVaultMode("staff");
    bootVaultFromLocal();
    void queryClient.invalidateQueries();
    void ensureVaultRestored().then(() => {
      void queryClient.invalidateQueries();
    });
  }, [pathname, queryClient]);
  return null;
}

function RootDocument() {
  const queryClient = getQueryClient();

  return (
    <html lang="pt-BR" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <VaultHydrator />
            <TooltipProvider>
              <AppShell>
                <Outlet />
              </AppShell>
              <Toaster
                position="bottom-center"
                toastOptions={{
                  className:
                    "border-border bg-card text-card-foreground shadow-[var(--shadow-border)]",
                }}
              />
            </TooltipProvider>
          </QueryClientProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
