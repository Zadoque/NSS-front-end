import { realAuth } from "../../auth/model/realAuth";
import { operationalDay } from "./operationalDay";

const databaseName = "nss-dashboard-cache-v1";
const storeName = "responses";
const cacheRevision = "v1";
const maxEntries = 200;
const maxEntryBytes = 2 * 1024 * 1024;
const inFlight = new Map<string, Promise<unknown>>();
let identity = realAuth.getSession()?.id;
let generation = 0;
let pendingInvalidation: Promise<void> = Promise.resolve();
const channel = (() => {
  try { return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("nss-cache-invalidation-v1"); }
  catch { return null; }
})();
const disabledScopes = new Set<string>();
const remoteInvalidations = new Map<string, { scope: string; promise: Promise<boolean>; resolve: (committed: boolean) => void }>();
channel?.addEventListener("message", ({ data }) => {
  if (!data || typeof data.scope !== "string" || typeof data.id !== "string") return;
  if (data.phase === "begin") {
    generation += 1;
    let finish: (committed: boolean) => void = () => {};
    const promise = new Promise<boolean>((resolve) => { finish = resolve; });
    remoteInvalidations.set(data.id, { scope: data.scope, promise, resolve: finish });
    setTimeout(() => {
      remoteInvalidations.get(data.id)?.resolve(false);
    }, 5000);
  } else if (data.phase === "end") {
    remoteInvalidations.get(data.id)?.resolve(data.committed === true);
    if (data.committed !== true) disabledScopes.add(data.scope);
    if (data.committed === true) remoteInvalidations.delete(data.id);
    generation += 1;
  }
});

function scopeFor(userId: number): string {
  const api = import.meta.env.VITE_API_BASE_URL || location.origin;
  return JSON.stringify([cacheRevision, api, userId]);
}

function invalidationKey(scope: string): string {
  return `nss-cache-invalidation:${scope}`;
}

function hasPendingInvalidation(scope: string): boolean {
  try { return localStorage.getItem(invalidationKey(scope)) !== null; }
  catch { return true; }
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Cache indisponível"));
  });
}

async function read(key: string, scope: string): Promise<{ value: unknown; revision: number }> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const value = store.get(key);
      const revision = store.get(`revision:${scope}`);
      transaction.oncomplete = () => resolve({ value: value.result, revision: Number(revision.result) || 0 });
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

async function write(key: string, value: unknown, scope: string, expectedRevision: number, assertCurrent: () => void): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      let cancelled = false;
      const revisionRequest = store.get(`revision:${scope}`);
      revisionRequest.onsuccess = () => {
        try {
          assertCurrent();
          if ((revisionRequest.result ?? 0) !== expectedRevision) {
            cancelled = true;
            transaction.abort();
            return;
          }
          store.put(value, key);
          const keys = store.getAllKeys();
          keys.onsuccess = () => {
            const entries = keys.result.filter((item) => typeof item === "string" && item.startsWith("["));
            const excess = entries.length - maxEntries;
            for (const oldKey of entries.filter((item) => item !== key).slice(0, Math.max(0, excess))) {
              store.delete(oldKey);
            }
          };
        } catch {
          cancelled = true;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(cancelled ? new DOMException("Cache invalidado", "AbortError") : transaction.error);
    });
  } finally {
    db.close();
  }
}

async function clear(scope: string): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const revisionKey = `revision:${scope}`;
      const current = store.get(revisionKey);
      current.onsuccess = () => store.put((Number(current.result) || 0) + 1, revisionKey);
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) return;
        if (typeof entry.key === "string" && entry.key.startsWith(`${scope}:`)) entry.delete();
        entry.continue();
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

realAuth.subscribe(() => {
  if (realAuth.isTemporarilySuspended()) {
    generation += 1;
    return;
  }
  const next = realAuth.getSession()?.id;
  if (identity !== next) {
    const previous = identity;
    identity = next;
    generation += 1;
    if (previous !== undefined) {
      const scope = scopeFor(previous);
      const id = `${Date.now()}-${Math.random()}`;
      try { localStorage.setItem(invalidationKey(scope), id); }
      catch { disabledScopes.add(scope); }
      try { channel?.postMessage({ phase: "begin", scope, id }); } catch { /* storage marker remains authoritative */ }
      pendingInvalidation = pendingInvalidation.then(() => clear(scope)).then(
        () => {
          try {
            if (localStorage.getItem(invalidationKey(scope)) === id) localStorage.removeItem(invalidationKey(scope));
          } catch { disabledScopes.add(scope); }
          try { channel?.postMessage({ phase: "end", scope, id, committed: true }); } catch { /* marker and revision protect readers */ }
        },
        () => {
          disabledScopes.add(scope);
          try { channel?.postMessage({ phase: "end", scope, id, committed: false }); } catch { /* marker protects readers */ }
        },
      );
    }
  }
});

/** Caches only successfully validated dashboard data for the authenticated account. */
export async function dailyCache<T>(
  path: string,
  load: () => Promise<T>,
  validate: (value: unknown) => value is T,
): Promise<T> {
  const userId = realAuth.getSession()?.id;
  if (userId == null) return load();
  const day = operationalDay();
  const epoch = generation;
  const authRevision = realAuth.getRevision();
  const key = `${scopeFor(userId)}:${JSON.stringify([day, path])}`;
  const flightKey = JSON.stringify([key, epoch]);
  const existing = inFlight.get(flightKey);
  if (existing) return existing as Promise<T>;

  const assertCurrent = () => {
    if (generation !== epoch || !realAuth.isCurrentSession() || realAuth.getRevision() !== authRevision || realAuth.getSession()?.id !== userId || operationalDay() !== day) {
      throw new DOMException("A janela ou sessão mudou durante a consulta", "AbortError");
    }
  };
  const fetchOrRead = async (): Promise<T> => {
    assertCurrent();
    await pendingInvalidation;
    const scope = scopeFor(userId);
    const remoteResults = await Promise.all([...remoteInvalidations.values()].filter((item) => item.scope === scope).map((item) => item.promise));
    if (remoteResults.some((committed) => !committed)) disabledScopes.add(scope);
    assertCurrent();
    if (disabledScopes.has(scope) || hasPendingInvalidation(scope)) {
      const result = await load();
      assertCurrent();
      if (!validate(result)) throw new Error("Resposta inválida para cache");
      return result;
    }
    let revision = 0;
    try {
      const cached = await read(key, scopeFor(userId));
      revision = cached.revision;
      assertCurrent();
      if (cached.value !== undefined && validate(cached.value)) {
        if (hasPendingInvalidation(scope)) throw new DOMException("Cache em invalidação", "AbortError");
        return cached.value;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
    assertCurrent();
    const result = await load();
    assertCurrent();
    if (!validate(result)) throw new Error("Resposta inválida para cache");
    const size = new TextEncoder().encode(JSON.stringify(result)).byteLength;
    if (size <= maxEntryBytes && generation === epoch && realAuth.getSession()?.id === userId && operationalDay() === day) {
      try {
        await write(key, result, scopeFor(userId), revision, () => {
          assertCurrent();
          if (hasPendingInvalidation(scope)) throw new DOMException("Cache em invalidação", "AbortError");
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
      }
    }
    assertCurrent();
    return result;
  };
  let callbackStarted = false;
  const guardedLoad = () => {
    callbackStarted = true;
    return fetchOrRead();
  };
  const promise = navigator.locks
    ? navigator.locks.request(`nss-cache:${key}`, guardedLoad).catch((error) => {
        if (callbackStarted) throw error;
        return fetchOrRead();
      })
    : fetchOrRead();
  inFlight.set(flightKey, promise);
  try { return await promise; } finally { inFlight.delete(flightKey); }
}
