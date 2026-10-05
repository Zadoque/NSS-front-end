export type Session = { email: string; displayName: string };

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
    session = { email: DEMO_EMAIL, displayName: "Usuário demonstrador" };
    notify();
    return session;
  },
  logout() {
    session = null;
    notify();
  },
};
