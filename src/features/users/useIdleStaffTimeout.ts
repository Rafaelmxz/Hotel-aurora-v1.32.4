/**
 * Idle 15 min no shell da equipe: derruba admin/gerente para recepção.
 * Pode: clique, tecla, navegação reiniciam o relógio; toast avisa a queda.
 * Proibido: signOut, mexer no cookie auth, timeout em /reservar ou /login.
 * Store: demoteElevatedSession / maybeDemoteIdleSession em userStore.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { requiresPin } from "./roles";
import {
  maybeDemoteIdleSession,
  msUntilStaffIdle,
  staffKeys,
  touchStaffActivity,
} from "./userStore";
import { useStaffSession } from "./useStaff";

export function useIdleStaffTimeout() {
  const queryClient = useQueryClient();
  const { data: session } = useStaffSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const firstPath = useRef(true);

  useEffect(() => {
    const isPublic =
      pathname === "/login" || pathname === "/reservar" || pathname.startsWith("/reservar/");
    if (isPublic) return;

    let timer: number | undefined;

    function drop() {
      const next = maybeDemoteIdleSession();
      if (next) {
        toast.message(`Sessão elevada expirou por inatividade · ${next.name}`);
        void queryClient.invalidateQueries({ queryKey: staffKeys.session });
        return;
      }
      if (msUntilStaffIdle() <= 0) return;
      arm();
    }

    function arm() {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      if (!requiresPin(session.role)) return;
      const remaining = msUntilStaffIdle();
      if (!Number.isFinite(remaining)) return;
      if (remaining <= 0) {
        drop();
        return;
      }
      timer = window.setTimeout(drop, remaining);
    }

    function onActivity() {
      touchStaffActivity();
      arm();
    }

    if (firstPath.current) {
      firstPath.current = false;
    } else {
      touchStaffActivity();
    }
    arm();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
    };
  }, [pathname, queryClient, session.role]);
}
