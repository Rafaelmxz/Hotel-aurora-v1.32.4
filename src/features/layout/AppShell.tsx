import type { ReactNode } from "react";
import { Link, getRouteApi, useRouterState } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HotelBrand } from "@/features/settings/HotelBrand";
import { useProperty } from "@/features/settings/useProperty";
import { TODAY } from "@/mocks/hotelData";
import { APP_VERSION_LABEL } from "@/lib/version";
import { cn } from "@/lib/utils";
import { canAccessPath } from "@/features/users/roles";
import { RequirePath } from "@/features/users/RequirePermission";
import { StaffSwitcher } from "@/features/users/StaffSwitcher";
import { AuthStaffBridge } from "@/features/users/AuthStaffBridge";
import { useStaffSession } from "@/features/users/useStaff";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/calendario", label: "Mapa" },
  { to: "/reservas", label: "Reservas" },
  { to: "/ocupacao", label: "Ocupação" },
  { to: "/hospedes", label: "Hóspedes" },
  { to: "/governanca", label: "Limpeza" },
  { to: "/caixa", label: "Caixa" },
  { to: "/relatorios", label: "Relatórios" },
  { to: "/tarifas", label: "Tarifas" },
  { to: "/reservas-diretas", label: "Site" },
  { to: "/configuracoes", label: "Hotel" },
  { to: "/equipe", label: "Equipe" },
] as const;

const rootRouteApi = getRouteApi("__root__");

function formatToday(date: Date) {
  const raw = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-secondary" />;
  }
  return user ? <UserButton /> : null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const todayLabel = formatToday(TODAY);
  const isLogin = pathname === "/login";
  const isPublic =
    isLogin || pathname === "/reservar" || pathname.startsWith("/reservar/");
  const { data: property } = useProperty();
  const { data: session } = useStaffSession();
  const { sessionUser } = rootRouteApi.useRouteContext();
  const { user, isPending } = useCurrentUserState();
  const authed = Boolean(user ?? sessionUser);
  const visibleNav = NAV.filter((item) => canAccessPath(session.role, item.to));

  if (isLogin) {
    return <div className="min-h-dvh bg-background text-foreground">{children}</div>;
  }

  if (!isPublic && isPending && sessionUser === undefined && !user) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
          <div className="mx-auto flex h-[3.6rem] w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
            <HotelBrand />
            <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
            <div className="ml-auto h-8 w-8 animate-pulse rounded-full bg-secondary" />
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="h-48 animate-pulse rounded-xl bg-secondary/70" />
        </main>
      </div>
    );
  }

  if (!isPublic && !authed) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {!isPublic ? <AuthStaffBridge /> : null}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to={isPublic ? "/reservar" : "/"} className="flex min-w-0 items-center gap-2.5">
            <HotelBrand />
            <span className="min-w-0">
              <span className="font-display block truncate text-lg leading-tight font-medium tracking-tight">
                {property.name}
              </span>
              <span className="hidden text-xs tracking-wide text-muted-foreground uppercase sm:block">
                {isPublic ? "Reserve sua estadia" : "Gestão hoteleira"}
              </span>
            </span>
          </Link>

          {!isPublic ? (
            <nav
              aria-label="Principal"
              className="ml-auto flex items-center gap-1 overflow-x-auto rounded-full bg-secondary p-1 sm:ml-8 sm:mr-auto"
            >
              {visibleNav.map((item) => {
                const active =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-medium transition-colors duration-150 sm:px-4",
                      active
                        ? "bg-card text-foreground shadow-[var(--shadow-border)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <p className="ml-auto text-sm text-muted-foreground">
              Página do hóspede
              <Link to="/login" className="ml-3 underline underline-offset-4">
                Equipe
              </Link>
            </p>
          )}

          {!isPublic ? (
            <div className="flex shrink-0 items-center gap-2">
              <StaffSwitcher />
              <AuthSlot />
            </div>
          ) : null}

          {!isPublic ? (
            <p
              className="hidden text-right text-sm text-muted-foreground 2xl:block"
              suppressHydrationWarning
            >
              {todayLabel}
            </p>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {isPublic ? children : <RequirePath pathname={pathname}>{children}</RequirePath>}
      </main>
      <p
        aria-label={`Versão ${APP_VERSION_LABEL}`}
        className="pointer-events-none fixed right-3 bottom-3 z-50 rounded-full bg-card/90 px-2.5 py-1 text-xs tracking-wide text-muted-foreground shadow-[var(--shadow-border)]"
      >
        {APP_VERSION_LABEL}
      </p>
    </div>
  );
}
