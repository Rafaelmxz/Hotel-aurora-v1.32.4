/**
 * Tela /login/2fa — segundo passo do login por e-mail/senha.
 * Pode: TOTP, código de backup, confiar neste dispositivo (30 dias).
 * Proibido: OTP e-mail/SMS; pedir código em Google/X; gravar no cofre.
 * Sessão: cookie Better Auth só depois do verify; até lá vale o cookie two_factor.
 */
import { useState, type FormEvent } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, rememberPreviewBearer } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { LoginShell } from "./LoginView";

function challengeError(message: string | undefined) {
  const text = message ?? "";
  if (/invalid two factor cookie/i.test(text)) {
    return "O código expirou. Entre de novo com e-mail e senha.";
  }
  if (/invalid backup/i.test(text)) return "Código de backup inválido ou já usado.";
  if (/invalid code/i.test(text)) return "Código inválido. Tente de novo.";
  if (/temporarily locked/i.test(text) || /too many attempts/i.test(text)) {
    return "Muitas tentativas. Espere alguns minutos e entre de novo.";
  }
  return "Não foi possível verificar. Tente de novo.";
}

export function TwoFactorChallengeView() {
  const { user, isPending } = useCurrentUserState();
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isPending && user) return <Navigate to="/" />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = { code: code.trim(), trustDevice };
      const { data, error: verifyError } = backup
        ? await authClient.twoFactor.verifyBackupCode(payload)
        : await authClient.twoFactor.verifyTotp(payload);
      if (verifyError) throw new Error(verifyError.message);
      rememberPreviewBearer(data && "token" in data ? data.token : undefined);
      await authClient.getSession();
      window.location.href = "/";
    } catch (err) {
      setError(challengeError(err instanceof Error ? err.message : undefined));
      setBusy(false);
    }
  }

  return (
    <LoginShell>
      <div className="w-full max-w-sm space-y-6">
        <header>
          <h2 className="font-display text-3xl font-medium tracking-tight">
            Código de verificação
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {backup
              ? "Cole um dos códigos de backup que você guardou ao ativar o MFA."
              : "Abra o app autenticador e digite o código de 6 dígitos."}
          </p>
        </header>

        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="mfa-code">{backup ? "Código de backup" : "Código do app"}</Label>
            <Input
              id="mfa-code"
              required
              autoComplete="one-time-code"
              inputMode={backup ? "text" : "numeric"}
              pattern={backup ? undefined : "[0-9]{6}"}
              maxLength={backup ? 24 : 6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(event) => setTrustDevice(event.target.checked)}
            />
            Confiar neste dispositivo por 30 dias
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-11" disabled={busy}>
            {busy ? "Aguarde…" : "Verificar"}
          </Button>
        </form>

        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setBackup((current) => !current);
            setCode("");
            setError("");
          }}
        >
          {backup ? "Usar o código do app" : "Usar código de backup"}
        </button>

        <p className="text-sm text-muted-foreground">
          <Link to="/login" className="underline underline-offset-4">
            Voltar ao login
          </Link>
        </p>
      </div>
    </LoginShell>
  );
}
