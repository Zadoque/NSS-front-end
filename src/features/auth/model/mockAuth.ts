import type { Session } from "./realAuth";
export type { Session } from "./realAuth";

const DEMO_EMAIL = "demo@nss.local";
const DEMO_PASSWORD = "NSS-DEMO-2026";
let session: Session | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const mockAuth = {
  credentials: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  getSession: () => session,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  async login(email: string, password: string) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      throw new Error("Credenciais DEMO inválidas.");
    }
    session = { email: DEMO_EMAIL, displayName: "Usuário demonstrador", permissions: [] };
    notify();
    return session;
  },
  async restore() { return session; },
  logout() {
    session = null;
    notify();
  },
};
