import { useEffect, useState, type ReactNode } from "react";
import { Link, getRouteApi, useRouterState } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Globe,
  House,
  Home,
  Sparkles,
  Tags,
  Users,
  Wallet,
  Shield,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";

const NAV_GROUPS = [
  {
    id: "dia",
    label: "Dia",
    items: [
      { to: "/", label: "Início", icon: Home },
      { to: "/calendario", label: "Mapa", icon: CalendarDays },
    ],
  },
  {
    id: "estadia",
    label: "Estadia",
    items: [
      { to: "/reservas", label: "Reservas", icon: BookOpen },
      { to: "/ocupacao", label: "Ocupação", icon: BarChart3 },
      { to: "/hospedes", label: "Hóspedes", icon: Users },
    ],
  },
  {
    id: "casa",
    label: "Casa",
    items: [
      { to: "/casa", label: "Casa", icon: House },
      { to: "/governanca", label: "Limpeza", icon: Sparkles },
    ],
  },
  {
    id: "caixa",
    label: "Contas",
    items: [
      { to: "/caixa", label: "Caixa", icon: Wallet },
      { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
    ],
  },
  {
    id: "config",
    label: "Casa / config",
    items: [
      { to: "/tarifas", label: "Tarifas", icon: Tags },
      { to: "/reservas-diretas", label: "Motor de reservas", icon: Globe },
      { to: "/configuracoes", label: "Hotel", icon: Building2 },
      { to: "/equipe", label: "Equipe", icon: Shield },
    ],
  },
] as const;

const NAV_KEY = "aurora-nav-expanded";

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

function isActivePath(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      setExpanded(localStorage.getItem(NAV_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleNav() {
    setExpanded((current) => {
      const next = !current;
      try {
        localStorage.setItem(NAV_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  if (isLogin) {
    return <div className="min-h-dvh bg-background text-foreground">{children}</div>;
  }

  if (!isPublic && isPending && sessionUser === undefined && !user) {
    return (
      <div className="flex min-h-dvh bg-background text-foreground">
        <div className="w-14 border-r border-border bg-card" />
        <main className="min-w-0 flex-1 px-4 py-6">
          <div className="h-48 animate-pulse rounded-xl bg-secondary/70" />
        </main>
      </div>
    );
  }

  if (!isPublic && !authed) {
    return <RedirectToSignIn />;
  }

  if (isPublic) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <Link to="/reservar" className="flex min-w-0 items-center gap-2.5">
              <HotelBrand />
              <span className="min-w-0">
                <span className="font-display block truncate text-lg leading-tight font-medium tracking-tight">
                  {property.name}
                </span>
                <span className="hidden text-xs tracking-wide text-muted-foreground uppercase sm:block">
                  Reserve sua estadia
                </span>
              </span>
            </Link>
            <p className="ml-auto text-sm text-muted-foreground">
              Página do hóspede
              <Link to="/login" className="ml-3 underline underline-offset-4">
                Equipe
              </Link>
            </p>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
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

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <AuthStaffBridge />
      <aside
        className={cn(
          "sticky top-0 z-40 flex h-dvh shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200",
          expanded ? "w-52" : "w-14",
        )}
      >
        <Link
          to="/"
          className={cn(
            "flex h-14 items-center gap-2 border-b border-border px-3",
            !expanded && "justify-center px-0",
          )}
        >
          <HotelBrand />
          {expanded ? (
            <span className="min-w-0 truncate font-display text-sm font-medium tracking-tight">
              {property.name}
            </span>
          ) : null}
        </Link>
        <nav aria-label="Principal" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => canAccessPath(session.role, item.to));
            if (!items.length) return null;
            return (
              <div key={group.id} className="grid gap-1">
                {expanded ? (
                  <p className="px-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </p>
                ) : null}
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={item.label}
                      className={cn(
                        "inline-flex h-10 items-center rounded-lg text-sm font-medium transition-colors duration-150",
                        expanded ? "gap-2.5 px-2.5" : "justify-center",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {expanded ? <span className="truncate">{item.label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className={cn("grid gap-2 border-t border-border p-2", !expanded && "justify-items-center")}>
          {expanded ? (
            <div className="grid gap-2">
              <StaffSwitcher />
              <div className="flex items-center justify-between gap-2">
                <AuthSlot />
                <p className="truncate text-[11px] text-muted-foreground" suppressHydrationWarning>
                  {todayLabel}
                </p>
              </div>
            </div>
          ) : (
            <AuthSlot />
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-full"
            aria-label={expanded ? "Recolher menu" : "Expandir menu"}
            onClick={toggleNav}
          >
            {expanded ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-7xl">
          <RequirePath pathname={pathname}>{children}</RequirePath>
        </div>
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
