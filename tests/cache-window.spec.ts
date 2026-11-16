import { expect, test } from "@playwright/test";

test("janela diária muda às 02h em São Paulo, independente do fuso do navegador", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "Asia/Tokyo" });
  const page = await context.newPage();
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.goto(`${base}/login`);
  const days = await page.evaluate(async () => {
    const modulePath = "/src/features/dashboard/cache/operationalDay.ts";
    const { operationalDay } = await import(/* @vite-ignore */ modulePath);
    return [
      operationalDay(new Date("2026-11-10T04:59:59Z")),
      operationalDay(new Date("2026-11-10T05:00:00Z")),
      operationalDay(new Date("2027-01-01T04:00:00Z")),
    ];
  });
  expect(days).toEqual(["2026-11-09", "2026-11-10", "2026-12-31"]);
  await context.close();
});

test("cache reutiliza resposta e invalida a conta ao encerrar sessão", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401 }));
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: { accessToken: "test", user: { id: 77, email: "cache@nss.test" } } }));
  await page.route("**/api/v1/auth/logout", route => route.fulfill({ status: 204 }));
  await page.goto(`${base}/login`);
  const result = await page.evaluate(async () => {
    const authPath = "/src/features/auth/model/realAuth.ts";
    const cachePath = "/src/features/dashboard/cache/dailyCache.ts";
    const { realAuth } = await import(/* @vite-ignore */ authPath);
    const { dailyCache } = await import(/* @vite-ignore */ cachePath);
    let calls = 0;
    const load = async () => ({ count: ++calls });
    const valid = (value: unknown): value is { count: number } => !!value && typeof value === "object" && typeof (value as { count?: unknown }).count === "number";
    await realAuth.login("cache@nss.test", "test");
    const first = await dailyCache("/sample", load, valid);
    const second = await dailyCache("/sample", load, valid);
    await realAuth.logout();
    await realAuth.login("cache@nss.test", "test");
    const third = await dailyCache("/sample", load, valid);
    return [first.count, second.count, third.count, calls];
  });
  expect(result).toEqual([1, 1, 2, 2]);
});

test("logout em outra aba impede gravação iniciada antes da invalidação", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => { Object.defineProperty(window, "BroadcastChannel", { value: undefined }); });
  await context.route("**/api/v1/auth/refresh", route => route.fulfill({ json: { accessToken: "test", user: { id: 88, email: "tabs@nss.test" } } }));
  await context.route("**/api/v1/auth/login", route => route.fulfill({ json: { accessToken: "test", user: { id: 88, email: "tabs@nss.test" } } }));
  await context.route("**/api/v1/auth/logout", route => route.fulfill({ status: 204 }));
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto(`${base}/login`);
  await second.goto(`${base}/login`);
  const login = async (page: typeof first) => page.evaluate(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    await realAuth.login("tabs@nss.test", "test");
  });
  await login(first);
  await login(second);
  const pending = second.evaluate(async () => {
    const path = "/src/features/dashboard/cache/dailyCache.ts";
    const { dailyCache } = await import(/* @vite-ignore */ path);
    const load = () => new Promise<{ count: number }>(resolve => {
      (window as unknown as { releaseCache: () => void }).releaseCache = () => resolve({ count: 1 });
    });
    try {
      await dailyCache("/race", load, (value: unknown) => !!value && typeof value === "object");
      return "returned";
    } catch (error) {
      return error instanceof DOMException ? error.name : "other";
    }
  });
  await second.waitForFunction(() => typeof (window as unknown as { releaseCache?: unknown }).releaseCache === "function");
  await first.evaluate(async () => {
    const authPath = "/src/features/auth/model/realAuth.ts";
    const cachePath = "/src/features/dashboard/cache/dailyCache.ts";
    const { realAuth } = await import(/* @vite-ignore */ authPath);
    const { dailyCache } = await import(/* @vite-ignore */ cachePath);
    await realAuth.logout();
    await realAuth.login("tabs@nss.test", "test");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await dailyCache("/barrier", async () => ({ ok: true }), (value: unknown) => !!value && typeof value === "object");
        break;
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== "AbortError" || attempt === 4) throw error;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  });
  await second.evaluate(() => (window as unknown as { releaseCache: () => void }).releaseCache());
  expect(await pending).toBe("AbortError");
  await context.close();
});

test("falha ao limpar IndexedDB mantém o cache desativado após recarregar", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401 }));
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: { accessToken: "test", user: { id: 99, email: "failure@nss.test" } } }));
  await page.route("**/api/v1/auth/logout", route => route.fulfill({ status: 204 }));
  await page.goto(`${base}/login`);
  const first = await page.evaluate(async () => {
    const authPath = "/src/features/auth/model/realAuth.ts";
    const cachePath = "/src/features/dashboard/cache/dailyCache.ts";
    const { realAuth } = await import(/* @vite-ignore */ authPath);
    const { dailyCache } = await import(/* @vite-ignore */ cachePath);
    const valid = (value: unknown): value is { count: number } => !!value && typeof value === "object" && typeof (value as { count?: unknown }).count === "number";
    await realAuth.login("failure@nss.test", "test");
    await dailyCache("/failure", async () => ({ count: 1 }), valid);
    const open = indexedDB.open;
    indexedDB.open = () => { throw new Error("unavailable"); };
    await realAuth.logout();
    await realAuth.login("failure@nss.test", "test");
    const result = await dailyCache("/failure", async () => ({ count: 2 }), valid);
    indexedDB.open = open;
    return result.count;
  });
  expect(first).toBe(2);
  await page.reload();
  const afterReload = await page.evaluate(async () => {
    const authPath = "/src/features/auth/model/realAuth.ts";
    const cachePath = "/src/features/dashboard/cache/dailyCache.ts";
    const { realAuth } = await import(/* @vite-ignore */ authPath);
    const { dailyCache } = await import(/* @vite-ignore */ cachePath);
    await realAuth.login("failure@nss.test", "test");
    return (await dailyCache("/failure", async () => ({ count: 3 }), (value: unknown): value is { count: number } => !!value && typeof value === "object" && typeof (value as { count?: unknown }).count === "number")).count;
  });
  expect(afterReload).toBe(3);
});

test("renovações simultâneas em abas compartilham o bloqueio do cookie", async ({ browser }) => {
  const context = await browser.newContext();
  let active = 0;
  let maximum = 0;
  let count = 0;
  await context.route("**/api/v1/auth/login", route => route.fulfill({ json: { accessToken: "test", user: { id: 123, email: "refresh@nss.test" } } }));
  await context.route("**/api/v1/auth/refresh", async route => {
    active += 1;
    maximum = Math.max(maximum, active);
    count += 1;
    await new Promise(resolve => setTimeout(resolve, 250));
    active -= 1;
    await route.fulfill({ json: { accessToken: "refreshed", user: { id: 123, email: "refresh@nss.test" } } });
  });
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto(`${base}/login`);
  await second.goto(`${base}/login`);
  const login = (page: typeof first) => page.evaluate(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    await realAuth.login("refresh@nss.test", "test");
  });
  await login(first);
  await login(second);
  count = 0;
  maximum = 0;
  const refresh = (page: typeof first) => page.evaluate(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    return (await realAuth.refresh())?.id;
  });
  expect(await Promise.all([refresh(first), refresh(second)])).toEqual([123, 123]);
  expect(count).toBeGreaterThanOrEqual(2);
  expect(maximum).toBe(1);
  await context.close();
});

test("fonte da API reutiliza apenas respostas válidas por filtro e conta", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  let calls = 0;
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401 }));
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: { accessToken: "test", user: { id: 144, email: "source@nss.test" } } }));
  await page.route("**/api/v1/auth/logout", route => route.fulfill({ status: 204 }));
  await page.route("**/api/v1/epidemiology/region?**", route => {
    calls += 1;
    return route.fulfill({ json: { items: [{ code: "1", name: "Norte", notificationsTotal: calls }], totalNotifications: calls } });
  });
  await page.goto(`${base}/login`);
  const result = await page.evaluate(async () => {
    const authPath = "/src/features/auth/model/realAuth.ts";
    const sourcePath = "/src/features/dashboard/api/sources/apiDataSource.ts";
    const { realAuth } = await import(/* @vite-ignore */ authPath);
    const { apiDataSource } = await import(/* @vite-ignore */ sourcePath);
    await realAuth.login("source@nss.test", "test");
    const request = { geography: "REGION", disease: "DENG", year: 2024, month: "ALL" } as const;
    const first = await apiDataSource.getEpidemiology(request);
    const again = await apiDataSource.getEpidemiology(request);
    const otherFilter = await apiDataSource.getEpidemiology({ ...request, year: 2025 });
    await realAuth.logout();
    await realAuth.login("source@nss.test", "test");
    const afterLogout = await apiDataSource.getEpidemiology(request);
    return [first.totalNotifications, again.totalNotifications, otherFilter.totalNotifications, afterLogout.totalNotifications];
  });
  expect(result).toEqual([1, 1, 2, 3]);
  expect(calls).toBe(3);
});

test("logout enfileirado não encerra sessão de outra conta", async ({ browser }) => {
  const context = await browser.newContext();
  let logouts = 0;
  await context.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401 }));
  await context.route("**/api/v1/auth/login", route => {
    const email = route.request().postDataJSON().email as string;
    return route.fulfill({ json: { accessToken: email, user: { id: email.startsWith("alice") ? 1 : 2, email } } });
  });
  await context.route("**/api/v1/auth/logout", route => { logouts += 1; return route.fulfill({ status: 204 }); });
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  const alice = await context.newPage();
  const bob = await context.newPage();
  await alice.goto(`${base}/login`);
  await bob.goto(`${base}/login`);
  await alice.evaluate(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    await realAuth.login("alice@nss.test", "test");
  });
  await bob.evaluate(() => {
    void navigator.locks.request("nss-auth-cookie-v1", () => new Promise<void>(resolve => {
      (window as unknown as { releaseAuth: () => void }).releaseAuth = resolve;
    }));
  });
  await bob.waitForFunction(() => typeof (window as unknown as { releaseAuth?: unknown }).releaseAuth === "function");
  const bobLogin = bob.evaluate(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    return (await realAuth.login("bob@nss.test", "test")).id;
  });
  await bob.waitForTimeout(100);
  const aliceLogout = alice.evaluate(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    try { await realAuth.logout(); return "sent"; } catch { return "cancelled"; }
  });
  await alice.waitForTimeout(100);
  await bob.evaluate(() => (window as unknown as { releaseAuth: () => void }).releaseAuth());
  expect(await bobLogin).toBe(2);
  expect(await aliceLogout).toBe("cancelled");
  expect(logouts).toBe(0);
  await context.close();
});

test("não inicia operações de sessão sem coordenação entre abas", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => { Object.defineProperty(navigator, "locks", { value: undefined }); });
  let requests = 0;
  await context.route("**/api/v1/auth/**", route => { requests += 1; return route.fulfill({ status: 401 }); });
  const page = await context.newPage();
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.goto(`${base}/login`);
  const errors = await page.evaluate(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    const actions = [() => realAuth.login("alice@nss.test", "test"), () => realAuth.refresh(), () => realAuth.logout()];
    return Promise.all(actions.map(async action => {
      try { await action(); return ""; } catch (error) { return (error as Error).message; }
    }));
  });
  expect(errors).toHaveLength(3);
  expect(errors[0]).toContain("recurso necessário para proteger a sessão");
  expect(errors[1]).toContain("recurso necessário para proteger a sessão");
  expect(errors[2]).toContain("Não há uma sessão ativa");
  expect(requests).toBe(0);
  await context.close();
});

test("sinal de outra conta impede logout e mutação mesmo antes do evento entre abas", async ({ page }) => {
  let privateCalls = 0;
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401 }));
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: { accessToken: "alice", user: { id: 1, email: "alice@nss.test" } } }));
  await page.route("**/api/v1/auth/logout", route => { privateCalls += 1; return route.fulfill({ status: 204 }); });
  await page.route("**/api/v1/private", route => { privateCalls += 1; return route.fulfill({ status: 204 }); });
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.goto(`${base}/login`);
  const result = await page.evaluate(async () => {
    const authPath = "/src/features/auth/model/realAuth.ts";
    const httpPath = "/src/shared/api/http.ts";
    const { realAuth } = await import(/* @vite-ignore */ authPath);
    const { requestJson } = await import(/* @vite-ignore */ httpPath);
    await realAuth.login("alice@nss.test", "test");
    localStorage.setItem("nss-auth-changed-v1", JSON.stringify({ type: "login", userId: 2, nonce: "bob", persisted: true }));
    const actions = [() => realAuth.logout(), () => requestJson("/private", { method: "POST" })];
    return Promise.all(actions.map(async action => {
      try { await action(); return "sent"; } catch { return "cancelled"; }
    }));
  });
  expect(result).toEqual(["cancelled", "cancelled"]);
  expect(privateCalls).toBe(0);
});

test("falha no armazenamento impede alterações do cookie de sessão", async ({ page }) => {
  let logins = 0;
  let logouts = 0;
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401 }));
  await page.route("**/api/v1/auth/login", route => { logins += 1; return route.fulfill({ json: { accessToken: "alice", user: { id: 1, email: "alice@nss.test" } } }); });
  await page.route("**/api/v1/auth/logout", route => { logouts += 1; return route.fulfill({ status: 204 }); });
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.goto(`${base}/login`);
  const result = await page.evaluate(async () => {
    const authPath = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ authPath);
    const originalSet = Storage.prototype.setItem;
    const originalGet = Storage.prototype.getItem;
    Storage.prototype.setItem = function () { throw new DOMException("cheio", "QuotaExceededError"); };
    let deniedLogin = false;
    try { await realAuth.login("alice@nss.test", "test"); } catch { deniedLogin = true; }
    Storage.prototype.setItem = originalSet;
    await realAuth.login("alice@nss.test", "test");
    Storage.prototype.getItem = function () { throw new DOMException("bloqueado", "SecurityError"); };
    let deniedLogout = false;
    try { await realAuth.logout(); } catch { deniedLogout = true; }
    const current = realAuth.isCurrentSession();
    Storage.prototype.getItem = originalGet;
    return { deniedLogin, deniedLogout, current };
  });
  expect(result).toEqual({ deniedLogin: true, deniedLogout: true, current: false });
  expect(logins).toBe(1);
  expect(logouts).toBe(0);
});

test("falha ao confirmar alteração mantém marcador pendente e bloqueia restauração", async ({ page }) => {
  let refreshes = 0;
  await page.route("**/api/v1/auth/refresh", route => { refreshes += 1; return route.fulfill({ status: 401 }); });
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: { accessToken: "alice", user: { id: 1, email: "alice@nss.test" } } }));
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.goto(`${base}/login`);
  const result = await page.evaluate(async () => {
    const authPath = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ authPath);
    const originalSet = Storage.prototype.setItem;
    let writes = 0;
    Storage.prototype.setItem = function (key, value) {
      if (key === "nss-auth-changed-v1" && ++writes === 2) throw new DOMException("cheio", "QuotaExceededError");
      return originalSet.call(this, key, value);
    };
    let loginFailed = false;
    try { await realAuth.login("alice@nss.test", "test"); } catch { loginFailed = true; }
    Storage.prototype.setItem = originalSet;
    const pending = JSON.parse(localStorage.getItem("nss-auth-changed-v1") || "{}").type;
    let refreshFailed = false;
    try { await realAuth.refresh(); } catch { refreshFailed = true; }
    return { loginFailed, pending, refreshFailed };
  });
  expect(result).toEqual({ loginFailed: true, pending: "pending", refreshFailed: true });
  expect(refreshes).toBeLessThanOrEqual(1);
});

test("perda do armazenamento após logout limpa a sessão local", async ({ page }) => {
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401 }));
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: { accessToken: "alice", user: { id: 1, email: "alice@nss.test" } } }));
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.goto(`${base}/login`);
  const result = await page.evaluate(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    await realAuth.login("alice@nss.test", "test");
    const originalFetch = window.fetch;
    const originalGet = Storage.prototype.getItem;
    window.fetch = async (input, init) => {
      if (String(input).endsWith("/logout")) {
        Storage.prototype.getItem = function () { throw new DOMException("bloqueado", "SecurityError"); };
        return new Response(null, { status: 204 });
      }
      return originalFetch(input, init);
    };
    let failed = false;
    try { await realAuth.logout(); } catch { failed = true; }
    const active = realAuth.getSession();
    window.fetch = originalFetch;
    Storage.prototype.getItem = originalGet;
    return { failed, active };
  });
  expect(result).toEqual({ failed: true, active: null });
});

test("login rejeitado em outra aba preserva cache da sessão recuperada", async ({ browser }) => {
  const context = await browser.newContext();
  let release: (() => void) | undefined;
  let started: (() => void) | undefined;
  const requestStarted = new Promise<void>(resolve => { started = resolve; });
  await context.route("**/api/v1/auth/refresh", route => route.fulfill({ json: { accessToken: "alice", user: { id: 1, email: "alice@nss.test" } } }));
  await context.route("**/api/v1/auth/login", async route => {
    const email = route.request().postDataJSON().email as string;
    if (email.startsWith("alice")) return route.fulfill({ json: { accessToken: "alice", user: { id: 1, email } } });
    started?.();
    await new Promise<void>(resolve => { release = resolve; });
    return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } });
  });
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto(`${base}/login`);
  await first.evaluate(async () => {
    const authPath = "/src/features/auth/model/realAuth.ts";
    const cachePath = "/src/features/dashboard/cache/dailyCache.ts";
    const { realAuth } = await import(/* @vite-ignore */ authPath);
    const { dailyCache } = await import(/* @vite-ignore */ cachePath);
    await realAuth.login("alice@nss.test", "test");
    const state = window as unknown as { cacheCalls: number; fetchCached: () => Promise<{ count: number }> };
    state.cacheCalls = 0;
    state.fetchCached = () => dailyCache("/pending-rejected", async () => ({ count: ++state.cacheCalls }), (value: unknown): value is { count: number } => !!value && typeof value === "object" && typeof (value as { count?: unknown }).count === "number");
    await state.fetchCached();
  });
  await second.goto(`${base}/login`);
  const rejected = second.evaluate(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    try { await realAuth.login("bob@nss.test", "invalid"); return false; } catch { return true; }
  });
  await requestStarted;
  await first.waitForFunction(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    return realAuth.getSession() === null;
  });
  release?.();
  expect(await rejected).toBe(true);
  await first.waitForFunction(async () => {
    const path = "/src/features/auth/model/realAuth.ts";
    const { realAuth } = await import(/* @vite-ignore */ path);
    return realAuth.getSession()?.id === 1;
  });
  const result = await first.evaluate(async () => {
    const state = window as unknown as { cacheCalls: number; fetchCached: () => Promise<{ count: number }> };
    return { value: (await state.fetchCached()).count, calls: state.cacheCalls };
  });
  expect(result).toEqual({ value: 1, calls: 1 });
  await context.close();
});

test("painel aberto atualiza dados ao chegar às 02h de São Paulo", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-10T04:59:00Z") });
  let metadataCalls = 0;
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401 }));
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: { accessToken: "test", user: { id: 155, email: "clock@nss.test" } } }));
  await page.route("**/api/v1/diseases", route => route.fulfill({ json: { items: ["DENG"] } }));
  await page.route("**/api/v1/metadata", route => {
    metadataCalls += 1;
    return route.fulfill({ json: { availableYears: [2026], availableMonthsByYear: { "2026": [1] } } });
  });
  await page.route("**/api/v1/epidemiology/**", route => route.fulfill({ json: { items: [], totalNotifications: 0 } }));
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.goto(`${base}/login`);
  await page.getByLabel("E-mail", { exact: true }).fill("clock@nss.test");
  await page.getByLabel("Senha", { exact: true }).fill("test");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/mapa$/);
  await expect.poll(() => metadataCalls).toBe(1);
  await page.clock.fastForward("01:01");
  await expect.poll(() => metadataCalls).toBe(2);
});
