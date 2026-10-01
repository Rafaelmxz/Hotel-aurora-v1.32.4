import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

type Mode = "entrar" | "criar";

function authErrorMessage(message: string | undefined) {
  const text = message ?? "";
  if (/already exists/i.test(text)) return "Já existe uma conta com este e-mail.";
  if (/invalid email or password/i.test(text) || /invalid credentials/i.test(text)) {
    return "E-mail ou senha inválidos.";
  }
  if (/password/i.test(text)) return "A senha deve ter pelo menos 8 caracteres.";
  if (/invalid email/i.test(text)) return "Informe um e-mail válido, no formato nome@dominio.com.";
  return "Não foi possível entrar. Tente de novo.";
}

function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_28rem]" suppressHydrationWarning>
      <section className="relative hidden flex-col justify-between bg-primary px-10 py-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-card">
            <Logo className="size-8" />
          </span>
          <div>
            <p className="font-display text-2xl font-medium tracking-tight">Hotel Aurora</p>
            <p className="text-xs tracking-wide uppercase opacity-80">Gestão hoteleira</p>
          </div>
        </div>
        <div className="max-w-md space-y-3">
          <h1 className="font-display text-4xl font-medium tracking-tight">
            A recepção entra com a própria conta.
          </h1>
          <p className="text-sm leading-relaxed opacity-85">
            O primeiro acesso vira administrador do hotel. Os próximos entram como
            recepção. Cargos e PIN continuam na Equipe.
          </p>
        </div>
      </section>
      <main className="grid place-items-center px-4 py-10 sm:px-8">{children}</main>
    </div>
  );
}

export function LoginView() {
  const { user } = useCurrentUserState();
  const [mode, setMode] = useState<Mode>("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!authEnabled) return;
    setError("");
    setBusy(true);
    try {
      if (mode === "criar") {
        const { error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Equipe",
        });
        if (signUpError) throw new Error(signUpError.message);
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email,
          password,
        });
        if (signInError) throw new Error(signInError.message);
      }
      await authClient.getSession();
      window.location.href = "/";
    } catch (err) {
      setError(authErrorMessage(err instanceof Error ? err.message : undefined));
      setBusy(false);
    }
  }

  return (
    <LoginShell>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3 lg:hidden">
          <Logo />
          <div>
            <p className="font-display text-xl font-medium tracking-tight">Hotel Aurora</p>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Área da equipe
            </p>
          </div>
        </div>

        <header>
          <h2 className="font-display text-3xl font-medium tracking-tight">
            {mode === "entrar" ? "Entrar na recepção" : "Criar conta da equipe"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "entrar"
              ? "Use o e-mail da equipe ou continue com Google ou X."
              : "A conta fica ligada ao cargo. Sem PIN para o próprio e-mail."}
          </p>
        </header>

        {authEnabled ? (
          <>
            <form onSubmit={onSubmit} className="grid gap-3">
              {mode === "criar" ? (
                <div className="grid gap-2">
                  <Label htmlFor="login-name">Nome</Label>
                  <Input
                    id="login-name"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="login-email">E-mail</Label>
                <Input
                  id="login-email"
                  required
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="nome@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  required
                  type="password"
                  autoComplete={mode === "criar" ? "new-password" : "current-password"}
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="h-11" disabled={busy}>
                {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === "entrar" ? "criar" : "entrar");
                setError("");
              }}
            >
              {mode === "entrar" ? "Criar conta da equipe" : "Já tenho conta · Entrar"}
            </button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs tracking-wide text-muted-foreground uppercase">
                ou
              </span>
              <Separator className="flex-1" />
            </div>

            <div className="grid gap-2">
              {GROK_PROVIDERS.map((provider) => (
                <Button
                  key={provider.providerId}
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void signIn(provider.providerId, { callbackURL: "/" }).catch((err) => {
                      setError(authErrorMessage(err instanceof Error ? err.message : undefined));
                      setBusy(false);
                    });
                  }}
                >
                  Continuar com {provider.label}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">O acesso da equipe está desligado.</p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Hóspede?{" "}
          <Link to="/reservar" className="underline underline-offset-4">
            Reserve sua estadia
          </Link>
        </p>
      </div>
    </LoginShell>
  );
}
