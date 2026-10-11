/**
 * Tela /conta — a pessoa liga TOTP na própria conta Better Auth.
 * Pode: enable (senha + QR + 1º código), disable (senha), novos códigos de backup.
 * Proibido: OTP e-mail/SMS; forçar MFA; exigir 2FA em Google/X; mexer no PIN.
 * Grava: tabelas Better Auth "user"."twoFactorEnabled" e "twoFactor". Não é o cofre.
 */
import { useMemo, useState, type FormEvent } from "react";
import { renderSVG } from "uqr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

function totpSecretFromUri(uri: string) {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

function mfaError(message: string | undefined) {
  const text = message ?? "";
  if (/invalid password/i.test(text)) {
    return "Senha inválida. MFA neste recorte é para contas com e-mail e senha.";
  }
  if (/invalid code/i.test(text)) return "Código inválido. Tente o próximo do app.";
  return "Não foi possível concluir. Tente de novo.";
}

export function AccountMfaView() {
  const { user, isPending } = useCurrentUserState();
  const session = authClient.useSession();
  const enabled = Boolean(
    session.data?.user && "twoFactorEnabled" in session.data.user
      ? session.data.user.twoFactorEnabled
      : false,
  );

  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupFromRegen, setBackupFromRegen] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const qrSvg = useMemo(
    () =>
      totpURI
        ? renderSVG(totpURI, {
            border: 2,
            pixelSize: 4,
            blackColor: "currentColor",
            whiteColor: "transparent",
          })
        : "",
    [totpURI],
  );
  const secret = totpSecretFromUri(totpURI);
  const pendingSetup = totpURI.length > 0 && !enabled;

  async function startEnable(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data, error: enableError } = await authClient.twoFactor.enable({ password });
      if (enableError) throw new Error(enableError.message);
      if (!data) throw new Error("empty");
      setTotpURI(data.totpURI);
      setBackupCodes(data.backupCodes);
      setBackupFromRegen(false);
      setPassword("");
      toast.success("Escaneie o QR e confirme o primeiro código.");
    } catch (err) {
      setError(mfaError(err instanceof Error ? err.message : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { error: verifyError } = await authClient.twoFactor.verifyTotp({
        code: confirmCode.trim(),
      });
      if (verifyError) throw new Error(verifyError.message);
      setConfirmCode("");
      setTotpURI("");
      toast.success("MFA ativo nesta conta.");
      await session.refetch();
    } catch (err) {
      setError(mfaError(err instanceof Error ? err.message : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { error: disableError } = await authClient.twoFactor.disable({ password });
      if (disableError) throw new Error(disableError.message);
      setPassword("");
      setBackupCodes([]);
      setBackupFromRegen(false);
      setTotpURI("");
      toast.success("MFA desligado.");
      await session.refetch();
    } catch (err) {
      setError(mfaError(err instanceof Error ? err.message : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function refreshBackup(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data, error: genError } = await authClient.twoFactor.generateBackupCodes({
        password,
      });
      if (genError) throw new Error(genError.message);
      setBackupCodes(data?.backupCodes ?? []);
      setBackupFromRegen(true);
      setPassword("");
      toast.success("Novos códigos de backup. Os anteriores deixam de valer.");
    } catch (err) {
      setError(mfaError(err instanceof Error ? err.message : undefined));
    } finally {
      setBusy(false);
    }
  }

  async function copyBackup() {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      toast.success("Códigos copiados.");
    } catch {
      toast.error("Não foi possível copiar. Anote na tela.");
    }
  }

  if (isPending) {
    return <div className="h-48 animate-pulse rounded-xl bg-secondary/70" />;
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-medium tracking-tight">Conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.displayName ?? user?.primaryEmail ?? "Equipe"} · MFA opcional com app
          autenticador.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>MFA (app autenticador)</CardTitle>
          <CardDescription>
            Opcional. Liga um código no Google Authenticator, Authy ou similar no login por
            e-mail e senha. Login com Google ou X não pede esse código — limitação do Better
            Auth neste recorte. Contas só OAuth não ativam MFA aqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!authEnabled ? (
            <p className="text-sm text-muted-foreground">O acesso da equipe está desligado.</p>
          ) : null}

          {authEnabled && enabled && !pendingSetup ? (
            <p className="text-sm font-medium">MFA está ativo nesta conta.</p>
          ) : null}

          {authEnabled && pendingSetup ? (
            <div className="grid gap-4">
              <p className="text-sm">
                Escaneie o QR no app. Guarde os códigos de backup agora — eles não voltam a
                aparecer.
              </p>
              {qrSvg ? (
                <div
                  className="size-48 text-foreground"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : null}
              {secret ? (
                <p className="break-all font-mono text-xs text-muted-foreground">
                  Chave manual: {secret}
                </p>
              ) : null}
              {backupCodes.length ? (
                <div className="grid gap-2">
                  <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
                    {backupCodes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Button type="button" variant="outline" onClick={() => void copyBackup()}>
                    Copiar códigos
                  </Button>
                </div>
              ) : null}
              <form onSubmit={confirmEnable} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="conta-totp">Primeiro código do app</Label>
                  <Input
                    id="conta-totp"
                    required
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={confirmCode}
                    onChange={(event) => setConfirmCode(event.target.value)}
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" disabled={busy}>
                  {busy ? "Aguarde…" : "Confirmar e ligar"}
                </Button>
              </form>
            </div>
          ) : null}

          {authEnabled && !enabled && !pendingSetup ? (
            <form onSubmit={startEnable} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="conta-senha-ativar">Senha da conta</Label>
                <Input
                  id="conta-senha-ativar"
                  required
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={busy}>
                {busy ? "Aguarde…" : "Ativar MFA"}
              </Button>
            </form>
          ) : null}

          {authEnabled && enabled && !pendingSetup ? (
            <div className="grid gap-4">
              {backupCodes.length ? (
                <div className="grid gap-2">
                  <p className="text-sm">
                    {backupFromRegen
                      ? "Novos códigos de backup (os anteriores não valem mais):"
                      : "Códigos de backup. Guarde agora — eles não voltam a aparecer."}
                  </p>
                  <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
                    {backupCodes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Button type="button" variant="outline" onClick={() => void copyBackup()}>
                    Copiar códigos
                  </Button>
                </div>
              ) : null}
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  const submitter = (event.nativeEvent as SubmitEvent).submitter;
                  const intent =
                    submitter instanceof HTMLButtonElement ? submitter.value : "disable";
                  if (intent === "backup") void refreshBackup(event);
                  else void disableMfa(event);
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="conta-senha-gerir">Senha da conta</Label>
                  <Input
                    id="conta-senha-gerir"
                    required
                    type="password"
                    autoComplete="current-password"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" name="intent" value="backup" variant="outline" disabled={busy}>
                  {busy ? "Aguarde…" : "Gerar novos códigos de backup"}
                </Button>
                <Button type="submit" name="intent" value="disable" variant="outline" disabled={busy}>
                  {busy ? "Aguarde…" : "Desligar MFA"}
                </Button>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
