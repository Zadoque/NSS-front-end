import { useEffect, useState } from "react";
import type { AuthClient, Session } from "./realAuth";

export function useSession(auth: AuthClient, initiallyReady: boolean) {
  const [session, setSession] = useState<Session | null>(auth.getSession());
  const [ready, setReady] = useState(initiallyReady);
  useEffect(() => {
    const unsubscribe = auth.subscribe(() => setSession(auth.getSession()));
    void auth.restore().finally(() => setReady(true));
    return unsubscribe;
  }, [auth]);
  return { session, ready, logout: () => auth.logout() };
}
