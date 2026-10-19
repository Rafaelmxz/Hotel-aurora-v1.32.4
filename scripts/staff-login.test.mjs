/**
 * Fase 0: login da recepção no servidor de dev.
 * Pula se :8080 não estiver no ar.
 */
import assert from "node:assert/strict";
import test from "node:test";

const ORIGIN = "http://127.0.0.1:8080";
const BRUNO = { email: "bruno.lima@hotelaurora.com", password: "recepcao1" };
const ANA = { email: "ana.souza@hotelaurora.com", password: "1234" };

async function serverUp() {
  try {
    const res = await fetch(`${ORIGIN}/login`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function signInEmail(email, password) {
  const res = await fetch(`${ORIGIN}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      origin: ORIGIN,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  const text = await res.text();
  return { res, text };
}

function assertSignedIn({ res, text }, email) {
  assert.equal(res.status, 200, text.slice(0, 500));
  assert.equal(/reset-password|forcePasswordChange|EMAIL_NOT_VERIFIED/i.test(text), false);
  const setCookie = res.headers.getSetCookie?.() ?? res.headers.get("set-cookie") ?? "";
  assert.match(String(setCookie), /session_token/i);
  const payload = JSON.parse(text);
  const user = payload.user ?? payload.data?.user ?? payload;
  assert.equal(user.email ?? payload.user?.email, email);
  assert.equal(user.emailVerified ?? true, true);
  assert.equal(user.twoFactorEnabled ?? false, false);
}

test("Bruno entra com senha já confirmada, sem reset", async (t) => {
  if (!(await serverUp())) {
    t.skip("dev server :8080 ausente");
    return;
  }
  assertSignedIn(await signInEmail(BRUNO.email, BRUNO.password), BRUNO.email);
});

test("Ana entra com senha 1234 já confirmada, sem reset", async (t) => {
  if (!(await serverUp())) {
    t.skip("dev server :8080 ausente");
    return;
  }
  assertSignedIn(await signInEmail(ANA.email, ANA.password), ANA.email);
});
