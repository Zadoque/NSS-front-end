import type { ReactNode } from "react";
import type { Session } from "../../features/auth/model/realAuth";

export function RequireSession({ session, fallback, children }: { session: Session | null; fallback: ReactNode; children: ReactNode }) {
  return session ? children : fallback;
}

export function RequirePermission({ session, permission, children, fallback = <main><h1>Acesso negado</h1></main> }: { session: Session | null; permission: string; children: ReactNode; fallback?: ReactNode }) {
  return session?.permissions.includes(permission) ? children : fallback;
}
